# MoneyMind 貓咪互動 — 詳細 Step Plan

> 來源：`cat.md`（v1.0 概要版）
> 本文件：v1.0 詳細執行版
> 對齊：`.claude/CLAUDE.md`（謹慎、簡化、外科手術式變更、目標驅動）
> 對齊：`PLAN.md`（既有 MVP 已上線）

---

## 〇、總則（從 CLAUDE.md 萃取）

- **每步驟必有「驗收」**：沒辦法驗證就不算完成
- **不做投機性功能**：cat.md 提到的所有功能不全在本計畫做，只做到「使用者願意天天開」的最小集
- **外科手術式新增**：所有貓咪相關檔案集中在 `app/src/cat/`，不動 Dashboard / Holdings / QuickInputSheet 的既有邏輯
- **不確定就問**：列在最後「待決事項」，不要默默選邊

---

## 一、與現有專案的技術差異（必須先理解）

| 項目 | cat.md 寫的 | 現實 | 處理 |
|---|---|---|---|
| 框架 | Next.js 14 | Vite + React 19 | **不轉框架**，R3F 在 Vite 上完全可用 |
| 3D 庫 | R3F + drei | 同（要裝） | OK |
| 模型壓縮 | Draco | 原檔 6.9 MB | **必須做 Draco**，目標壓到 < 1.5 MB |
| 2D 動畫 | Lottie | — | **MVP 不做**，等 R3F 證明做不到再加 |
| Lazy load | 提到 | — | **PWA 必做**，不能 precache GLB |
| 弱機降階 | 提到 | — | Phase 2 後再做，先別過早優化 |

---

## 二、依賴關係總覽

```
Phase 0（探勘）
   ↓
Phase 1（MVP 貓：Dashboard + 情緒）
   ↓
Phase 2（互動：點擊 + 滑鼠追蹤 + 記帳吃錢）
   ↓
Phase 3（小窩成長）
   ↓
Phase 4（報表講評 / 節日）
```

每個 Phase 必須通過驗收才能進下一個。Phase 0 是阻塞所有後續 Phase 的前置調查。

---

## Phase 0 — 探勘與決策（半天，必做）

**目的**：在寫任何貓咪程式碼前，先知道模型「能做什麼」，避免計畫脫離現實。

### Step 0.1 — 檢查 GLB 內容物
- **上游**：無
- **動作**：
  - 用 `npx gltf-pipeline` 或 [gltf.report](https://gltf.report) 開 `cute_cat_model.glb`
  - 紀錄：(a) 有無內建 animations 清單、(b) 有無 morph targets、(c) 多少 triangles、(d) 多少 materials / textures
- **驗收**：產出一份「模型能力清單」，回填到本文件 §決策結果區
- **下游影響**：決定情緒系統用「動畫切換」還是「emoji 泡泡」

### Step 0.2 — Draco 壓縮 GLB
- **上游**：0.1
- **動作**：
  - `bunx gltf-pipeline -i cute_cat_model.glb -o app/public/cat.glb --draco.compressionLevel 10`
  - 目標：檔案 < 1.5 MB
- **驗收**：壓縮後檔案大小、用 gltf.report 確認動畫和 mesh 仍正常
- **下游影響**：所有 3D 載入都用這個檔

### Step 0.3 — 效能基線測量
- **上游**：0.2
- **動作**：在現有 Dashboard 上**先不加貓**，用 Chrome DevTools 量 First Contentful Paint、Time to Interactive
- **驗收**：記下三個數字（手機 throttling 4G + Mid-tier CPU），作為「加貓之後不能比這慢多少」的標準
- **下游影響**：Phase 1 完成時要對比這個基線

### Step 0.4 — PWA 設定確認
- **上游**：無
- **動作**：在 `app/vite.config.ts` 的 `VitePWA.workbox.globIgnores` 加入 `**/cat.glb`，避免 6 MB 進 PWA precache
- **驗收**：build 後檢查 `dist/sw.js` precache list 不含 cat.glb
- **下游影響**：避免 PWA 安裝體驗變慢

---

## Phase 1 — Dashboard 最小可行貓（1 週）

**範圍極限**：只做 Dashboard 上半部一隻會「呼吸」的貓，外加 4 種情緒切換。**不做**滑鼠追蹤、點擊互動、動畫、小窩。

### Step 1.1 — 安裝 R3F + Lottie 依賴
- **上游**：0.1（確認模型可用）
- **動作**：
  ```
  cd app
  bun add three @react-three/fiber @react-three/drei lottie-react
  bun add -D @types/three
  ```
- **驗收**：`bun run build` 通過，主 bundle 沒明顯變大（這些都 lazy load，未 import 不會進主包）
- **下游影響**：3D 元件 + 2D 動畫元件都可用

### Step 1.2 — 建立 cat 模組資料夾
- **上游**：1.1
- **動作**：新建空檔案結構
  ```
  app/src/cat/
    state/
      useCatMood.ts      ← 心情判定 store
    components/
      CatScene.tsx       ← R3F Canvas 容器
      CatModel.tsx       ← gltfjsx 產出的模型
      MoodBubble.tsx     ← 頭頂 emoji 泡泡
    constants.ts         ← 4 種心情定義
  ```
- **驗收**：檔案存在，import 路徑無錯
- **下游影響**：所有後續貓咪程式碼進這裡，**不汙染** Dashboard

### Step 1.3 — 用 gltfjsx 產出 CatModel 元件
- **上游**：0.2（壓縮後的 cat.glb）+ 1.1
- **動作**：
  ```
  cd app
  bunx gltfjsx public/cat.glb --transform --types -o src/cat/components/CatModel.tsx
  ```
- **驗收**：`CatModel.tsx` 存在，列出所有 nodes 和 materials；用一個臨時 test page 能 render 出貓
- **下游影響**：後續所有貓咪外觀都從這個元件展開

### Step 1.4 — 建立 CatScene（Canvas 容器）
- **上游**：1.3
- **動作**：
  - 用 `<Canvas>` 包 CatModel
  - 設定相機、光照（暖光 + 環境光配合品牌色）
  - **關鍵效能設定**：
    - `frameloop="demand"` 預設不持續算
    - `dpr={[1, 1.5]}` 限制 device pixel ratio
    - 用 `<Suspense fallback={null}>` lazy load 模型
- **驗收**：
  - Dashboard 上半空間能渲染貓
  - 用 React DevTools Profiler 確認 idle 時沒持續 re-render
  - 量 FPS 在手機（不該低於 30）
- **下游影響**：後續所有貓的視覺都這個 Canvas 內

### Step 1.5 — 嵌入 Dashboard（最小侵入）
- **上游**：1.4
- **動作**：
  - 在 `app/src/screens/Dashboard.tsx` 預算卡上方加入 `<CatScene height={220} />`
  - 用 React.lazy() 動態 import，避免進首次 bundle
  - 嚴守 CLAUDE.md #3：**只加這一行，不重排現有元件**
- **驗收**：
  - Dashboard 載入時先顯示既有內容、貓咪延遲出現（不阻塞首屏）
  - 「投資」「統計」「我的」三個 tab 完全不變
- **下游影響**：使用者第一次看到貓

### Step 1.6 — 情緒計算邏輯（純函數，可測）
- **上游**：1.2
- **動作**：在 `app/src/cat/state/useCatMood.ts` 寫純函數：
  ```ts
  type Mood = 'happy' | 'excited' | 'worried' | 'sleeping';
  function computeMood(args: {
    remainingBudget: number;
    daysLeftInMonth: number;
    daysSinceLastEntry: number;
    monthGoalAchieved: boolean;
  }): Mood
  ```
  - 規則：
    - `daysSinceLastEntry >= 3` → `sleeping`
    - `monthGoalAchieved` → `excited`
    - `dailyAvailable < 0` 或 `usedPct > 0.9` → `worried`
    - 其餘 → `happy`
- **驗收**：寫單元測試 4 條（每個 mood 一條）
- **下游影響**：1.7 用這個 hook 驅動視覺

### Step 1.7 — MoodBubble 渲染心情
- **上游**：1.6 + 1.4
- **動作**：
  - 在 `CatScene` 內疊一層 HTML `MoodBubble`（用 drei 的 `<Html>` 或外層絕對定位 div 都可，先用後者較簡單）
  - 4 種 emoji：`😺 😻 😿 😴`
  - mood 變更時淡入淡出（CSS transition）
- **驗收**：
  - 開 React DevTools 改 mood，泡泡跟著變
  - 用 Dashboard 測：刪光交易→ worried 警示應該消失；3 天沒記帳 → sleeping
- **下游影響**：Phase 2 點擊互動的視覺反饋基礎

### Step 1.8 — Phase 1 驗收（停下、檢查）
- **驗收條件**（全部達成才能進 Phase 2）：
  - [ ] Lighthouse PWA 分數 ≥ Phase 0 基線 - 10 分
  - [ ] 手機開啟到貓出現 < 3 秒
  - [ ] 旋轉 / 滾動 / 切 tab 都不卡頓（60fps）
  - [ ] 既有功能完全沒壞（記帳 / 編輯 / 刪除 / 投資 / 預算）
  - [ ] 自己連用 3 天，感覺貓有「在那邊」

---

## Phase 2 — 互動與記帳串接（1 週）

**前置條件**：Phase 1 驗收通過

### Step 2.1 — 點擊貓咪有反應
- **上游**：1.7
- **動作**：
  - 在 CatModel 上加 `onClick`
  - 隨機從 3 種反應挑一種播放：(a) 頭頂 ❤️ 泡泡、(b) 短暫放大 1.1x、(c) 旋轉一圈
  - 用 Web Audio API 加可選喵聲（預設關閉，設定頁開關）
- **驗收**：點 5 次能看到不同反應；不會卡點擊事件
- **下游影響**：使用者願意「逗」貓 → 增加開啟頻率

### Step 2.2 — 滑鼠 / 觸控跟隨
- **上游**：1.7
- **動作**：
  - 在 CatScene 內 useFrame 計算游標位置與貓頭距離
  - 用 `lerp()` 平滑轉動頭部 bone（如果 0.1 確認有 bones）
  - 沒 bones 就退而求其次：整體旋轉 ±15°
- **驗收**：滑游標時頭部會跟，但不會突兀
- **下游影響**：最關鍵的「活著」感

### Step 2.3 — 記帳成功動畫串接
- **上游**：2.1
- **動作**：
  - 在 `QuickInputSheet.tsx` 的 `submit()` 成功後（外科手術式新增一行）：發 custom event `cat:eat-money`
  - `CatScene` 監聽該事件 → 觸發貓咪「吃錢」動畫（簡化版：金額數字飛向貓咪 + 貓嘴張開 + 頭頂 😋）
- **驗收**：每次記帳完都有反應；不影響既有 Sheet 關閉時機
- **下游影響**：核心 dopamine loop

### Step 2.4 — Phase 2 驗收
- [ ] 三種互動都有反應
- [ ] 60fps 維持
- [ ] 記帳流程**不慢於 Phase 1**

---

## Phase 3 — 小窩成長（1 週，可選）

**前置條件**：Phase 2 上線一週後，先看自己有沒有真的會看貓窩。沒人看就**不要做**。

### Step 3.1 — 成就 schema + Dexie migration
- **上游**：Phase 2 完成
- **動作**：
  - Dexie 升 v3，加 `achievements` 表（連續記帳天數、達成月預算次數）
  - 寫純函數計算當前等級
- **驗收**：開新瀏覽器測，能從 Lv.1 → Lv.5

### Step 3.2 — 小窩 3D 場景
- **動作**：
  - 把 cat.glb 之外，準備 5 個 nest_lv1.glb ~ nest_lv5.glb（先找免費 CC0 模型，或極簡幾何）
  - 新 route `/nest`（在 BottomNav 加第 6 個 tab？或塞在「我的」內）
- **驗收**：能切換等級看不同窩

### Step 3.3 — Phase 3 驗收
- [ ] 等級邏輯不會誤判
- [ ] 自己有想看貓窩升級

---

## Phase 4 — 後期擴充（之後）

- 報表頁角落小貓講評（用 Phase 1 的 CatScene 縮小版）
- 節日皮膚（節日當天換貼圖）
- 弱機降階：偵測 GPU → 換成 Lottie 或純 emoji

**Phase 4 不在本計畫詳述**，看 Phase 1–3 跑下來再決定。

---

## 三、效能基線與防呆

| 指標 | 目標 | 測量時機 |
|---|---|---|
| Bundle 主包 | 不增加 > 50 KB | Phase 1.5 |
| Lazy 3D chunk | < 250 KB（不含 GLB） | Phase 1.5 |
| GLB 檔案 | < 1.5 MB | Phase 0.2 |
| 手機首屏 | ≤ Phase 0 基線 +500 ms | Phase 1.8 |
| 3D idle FPS | ≥ 30 | Phase 1.7 |
| 3D 互動 FPS | ≥ 60 | Phase 2.4 |
| PWA 離線可用 | 跟現在一樣 | Phase 1.8 |

---

## 四、回滾策略

每個 Phase 都用獨立 git branch（`feat/cat-phase-1`）。
- 每階段合 main 前在自己手機跑 3 天
- 若 Phase N 驗收失敗 → 直接 revert，回到 Phase N-1 狀態
- Dashboard 加環境變數 `VITE_CAT_ENABLED`，緊急可一鍵關閉貓咪不需重新部署（只重新 build）

---

## 五、已決事項（2026-05-22）

| # | 議題 | 決議 |
|---|---|---|
| 1 | 平台優先 | **手機優先**（沿用既有 PWA 設定） |
| 2 | 貓出現範圍 | **只 Dashboard**（其他 tab 完全不出現，避免分心、省效能） |
| 3 | 喵聲 | **預設關**，設定頁加開關 |
| 4 | Lottie | **使用** — 用於 Phase 2 的記帳吃錢動畫、點擊愛心、達標彩帶等特殊 2D 效果。3D 留給 R3F |
| 5 | Phase 3 預留 | **不預留**，YAGNI 原則，等真的做時再加 schema |

### Lottie 在本計畫的角色

| 用在哪 | 工具 | Phase |
|---|---|---|
| 3D 貓咪本體 + 呼吸 + 旋轉 + 表情泡泡 | R3F + three.js | Phase 1 |
| 滑鼠跟隨 | R3F | Phase 2 |
| 點擊貓的愛心爆出 / 喵聲圖示 | Lottie | Phase 2 |
| 記帳吃錢飛行動畫 + 金幣特效 | Lottie | Phase 2 |
| 達標彩帶慶祝 | Lottie | Phase 2 |
| 小窩升級動畫 | Lottie | Phase 3 |

**Lottie 動畫 JSON 來源**：[lottiefiles.com](https://lottiefiles.com) 有大量 CC0 免費動畫，等 Phase 2 用到時再挑。Phase 1 只裝套件，不下載動畫檔。

---

## 六、決策結果區（Phase 0 進度）

### Step 0.1 完成 — GLB 檢查結果（2026-05-22）

| 項目 | 結果 | 影響 |
|---|---|---|
| 原檔大小 | 6.9 MB | 需 Draco 壓縮 |
| 模型 triangles | ~38,284 | **偏高**，建議 simplify 到 < 15K |
| Meshes | 8 個（Object_0–7） | 可能要 join/flatten 減少 draw call |
| Materials | 8 個（皆 OPAQUE / doubleSided） | 可 dedup |
| Textures | 0（用 vertex color） | ✅ 不用載貼圖 |
| Vertex attrs | POSITION, NORMAL, COLOR_0 | 標準 |
| **內建 animations** | **0** | ❌ 無 idle / walk / sit，需程式化動畫 |
| **Morph targets** | **無** | ❌ 不能變臉，**改用頭頂 emoji 泡泡** |
| **Skin / Bones** | **無** | ❌ 不能單獨轉頭、擺尾，只能整體變換 |
| 生成工具 | Sketchfab-12.67.0 | 標準 |

### Phase 1 做法調整（基於上述）

**能做的「活起來」**：
- 呼吸（整體 scale Y 用 `useFrame` 加 sine 波動）
- 游標跟隨（整體 Y 軸旋轉 ±15°，不是只轉頭）
- 點擊反應（彈跳、短暫放大、旋轉）
- 4 種心情用 `<MoodBubble>` 頭頂 emoji 顯示
- 記帳吃錢：整隻彈一下 + 飛行數字 + 😋 emoji

**做不到**：擺尾、轉頭、坐下、走路、變臉 — 需換 rigged 模型才能做

### Step 0.2 完成 — 壓縮結果

| 指標 | 原檔 | 壓縮後 |
|---|---|---|
| 檔案大小 | 6.91 MB | **68.91 KB**（-99%） |
| 三角形 | ~38,284 | **~4,727**（-88%） |
| Mesh | 8 | 4 |
| Material | 8 | 4 |

壓縮指令：`bunx @gltf-transform/cli optimize cute_cat_model.glb app/public/cat.glb --compress draco --simplify true --simplify-error 0.001`

包含 dedup / instance / palette / flatten / join / weld / simplify / prune / draco 全套優化。

### Step 0.3 完成 — Phase 0 效能基線（加貓前）

| 指標 | 數值 |
|---|---|
| 主 JS bundle | 636.30 KB / gzip 196.24 KB |
| CSS | 18.89 KB / gzip 5.02 KB |
| PWA precache 總計 | 641.43 KB（12 entries） |
| cat.glb 是否進 precache | ❌ 不會（lazy load） |

> 執行階段的 FCP / TTI 留到 Phase 1.8 在瀏覽器 DevTools 量，與此基線比較。

### Step 0.4 完成 — PWA 排除 cat.glb

`app/vite.config.ts` 加入：
- `workbox.globIgnores: ['**/cat.glb', '**/*.glb']` 防止 precache
- `workbox.runtimeCaching` 設定首次載入後快取，離線可用

Build 驗證：`cat.glb` 確認不在 sw.js 的 precache list 中 ✓

---

## 七、與既有 PLAN.md 的關係

- 不取代 PLAN.md，視為**並行模組**
- PLAN.md 的 M9（雲端同步）、Phase 2 功能（定期支出、AI 痛點卡）優先級不變
- 若手上時間不夠，**先做雲端同步**（影響資料安全），**貓咪可以等**
- 貓咪是「留存武器」，雲端是「資料安全武器」，安全 > 留存

---

## 八、第一步要做的事

照順序：

```
Step 0.1  檢查 GLB 內容 → 回填決策結果區
Step 0.2  Draco 壓縮
Step 0.3  記下效能基線
Step 0.4  PWA precache 排除 cat.glb
─────── 暫停，回答上面「待決事項」5 題 ───────
Step 1.1  安裝 R3F
（後續照本文件）
```

每完成一個 Step 來告訴我「驗收結果」+「下一個 Step OK 開始嗎」，我再給下一步的指令。
