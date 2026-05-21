# Figma 入門教學：用 1 週畫出 MoneyMind 三個主畫面

> 目標：不會 Figma 也能在 7 天內產出**可點擊**的 Prototype，直接拿來給開發者（或自己）照著做。
> 假設你完全沒用過 Figma。

---

## Day 0：準備（30 分鐘）

### 1. 註冊 + 安裝
1. 到 https://www.figma.com，用 Google 帳號免費註冊
2. 下載桌面版 App（比瀏覽器穩）：https://www.figma.com/downloads/
3. 手機裝 **Figma Mirror**（iOS / Android）—— 之後可以即時在手機上看設計

### 2. 必看的 3 個 5 分鐘影片（YouTube 搜尋即可）
- "Figma in 5 minutes"
- "Figma Auto Layout basics"
- "Figma Components and Variants"

看不完沒關係，下面每一步我都會講清楚。

### 3. 建立你的第一個檔案
- 進 Figma → 點 `+ Design file`
- 檔名改為 `MoneyMind`
- 左上角 `File → Save to your computer`（保險用）

---

## Day 1：建立設計系統（Design Tokens）

**為什麼要先做這個：** 顏色、字級、間距如果一開始沒統一，後面改一個地方要改 50 次。

### Step 1：建立 Frame（畫布）

1. 按 `F` 鍵 → 在畫布拖一個矩形
2. 右側 `Design` 面板選 `iPhone 14 Pro (393 × 852)`
3. 命名為 `📐 Design System`

### Step 2：定義色票（Color Styles）

在 Frame 內畫 8 個小方塊（按 `R` 鍵畫矩形），分別填上：

| 名稱 | Hex | 用途 |
|---|---|---|
| `bg/base` | `#FFFFFF` | 主背景 |
| `bg/subtle` | `#F9FAFB` | 卡片背景 |
| `text/primary` | `#111827` | 主文字 |
| `text/secondary` | `#6B7280` | 次文字 |
| `brand/primary` | `#10B981` | 品牌綠（收入、CTA） |
| `expense` | `#1F2937` | 支出主色（深灰） |
| `warning` | `#F59E0B` | 預算 70% 警示黃 |
| `danger` | `#EF4444` | 預算 90% 警示紅 |

**儲存為 Style：**
- 點該矩形 → 右側 Fill 旁的 `Style` 圖示（四個小點）→ `+` → 輸入名稱（如 `bg/base`）→ Create

之後其他物件就能直接套用這個顏色，改一次全部跟著變。

### Step 3：定義字級（Text Styles）

按 `T` 鍵 → 打字 → 右側設定：

| 名稱 | Size | Weight | 用途 |
|---|---|---|---|
| `display` | 56 | Bold | 首頁大數字 |
| `h1` | 24 | Semibold | 頁面標題 |
| `body` | 16 | Regular | 一般內文 |
| `caption` | 13 | Regular | 次要資訊 |
| `mono/amount` | 20 | Medium | 金額（用 SF Mono 或 Roboto Mono） |

**字體建議：** 中文用 `Noto Sans TC`，英數字用 `Inter`（兩個都是 Google Fonts 免費字體）。

**儲存為 Style：** 跟色票一樣，點 Style 圖示 → `+` 命名。

### Step 4：8 個分類圖示

最快的做法：**直接打 emoji**（🍱🚇🎬🛒🏠💊📚📦），不用畫 icon。

若想要 line icon 風格，安裝 Figma plugin `Iconify`（內建 10 萬+ 免費 icon）。

---

## Day 2–3：畫第一個畫面 — 首頁 Dashboard

### Step 1：新 Frame

- 按 `F` → 選 `iPhone 14 Pro` → 命名 `01_Dashboard`

### Step 2：認識 Auto Layout（最重要的功能）

Auto Layout = Figma 版的 Flexbox。**所有元件都要包在 Auto Layout 裡**，否則改文字長度時排版會壞。

操作：選兩個以上物件 → 按 `Shift + A` → 變成 Auto Layout。
- 右側可調：方向（橫 / 直）、間距（gap）、內距（padding）

### Step 3：堆出 Dashboard 的結構

由上往下，每一塊都用 Auto Layout 包起來：

```
┌─ Frame: 01_Dashboard (393 × 852) ──────────┐
│  ┌─ Status Bar (假的，畫個 47px 高的空白) ─┐│
│  └──────────────────────────────────────┘│
│  ┌─ Header (Auto Layout, padding 20) ──┐│
│  │  五月 ▼              ⚙️             ││
│  └──────────────────────────────────────┘│
│  ┌─ 預算卡 (Auto Layout, padding 24) ───┐│
│  │  本月剩餘可用                          ││
│  │  NT$ 12,450  ← display 字級           ││
│  │  ▓▓▓▓▓▓░░░ 62% / NT$ 32,800           ││
│  └──────────────────────────────────────┘│
│  ┌─ 雙欄資訊 (Auto Layout 水平) ────────┐│
│  │  淨資產 184,200  │  今日支出 380      ││
│  └──────────────────────────────────────┘│
│  ┌─ 帳目列表 (Auto Layout 垂直) ────────┐│
│  │  今日                                  ││
│  │  🍱 午餐 · 星巴克              -120    ││
│  │  🚇 交通 · 捷運                -50     ││
│  │  昨日                                  ││
│  │  🛒 生活 · 全聯                -640    ││
│  └──────────────────────────────────────┘│
│                                ╭───╮      │
│                                │ + │ ←FAB │
│                                ╰───╯      │
└──────────────────────────────────────────┘
```

### Step 4：把單筆帳目做成 Component

帳目列會出現很多次，做成 Component 後改一個全部跟著改。

1. 畫好一筆帳目（圖示 + 文字 + 金額），全部用 Auto Layout 包起來
2. 選整組 → 右鍵 → `Create Component`（快捷鍵 `Ctrl + Alt + K`）
3. 之後要新增一筆：按 `Alt` 拖原本那筆，就會複製一份 Instance
4. 改圖示和文字 → 其他元素自動保持一致

### 進階：用 Variants 做不同狀態

選 Component → 右側 `+` 旁的 Variants → 加變數如 `type = expense / income`，可一鍵切換顏色。

---

## Day 4：畫第二個畫面 — 統計頁

### Step 1：複製 Dashboard Frame

- 選 `01_Dashboard` Frame → `Alt + 拖曳` 複製 → 改名 `02_Analytics`
- 把不要的內容刪掉，保留 Header

### Step 2：圓餅圖怎麼畫（不用真的寫程式）

**最快的做法：用 Plugin**
- 安裝 plugin `Chart`（Figma Community 免費）
- Menu → `Plugins → Chart → Pie Chart`
- 輸入假資料，調整顏色，匯入畫布

**手動做法（如果想練技巧）：**
1. 畫一個圓（`O` 鍵 + Shift）
2. 右側 `Design` → 在圓的設定裡找 `Arc`，可調整起始角度與內徑
3. 複製多份組成完整圓餅

### Step 3：「痛點發現」AI 小卡

在頁面最上方放一個卡片：
```
┌──────────────────────────────────────────┐
│ 💡 本週你在「外送平台」花了 NT$ 1,200      │
│    比上週多 25%                            │
└──────────────────────────────────────────┘
```
背景用淡黃 `#FEF3C7`，左邊加 4px 黃色邊條。

### Step 4：每日趨勢長條圖

最簡單做法：畫 30 個寬 8px 的矩形排成一排，高度手動隨機。
看起來像就行了，正式版會由程式產生。

---

## Day 5：畫第三個畫面 — 快速記帳輸入

### Step 1：彈窗（Modal）設計

新 Frame `03_Input` → 設計成從底部彈起的 Sheet：
- 上半部：金額大字（`display` 字級）、分類按鈕九宮格
- 下半部：數字鍵盤（4 列 × 3 欄）

### Step 2：數字鍵盤怎麼做

1. 畫一個按鍵 Component（圓角矩形 + 數字）
2. 用 Auto Layout 排成 3 欄
3. 整排再用 Auto Layout 包成 4 列
4. 按 0–9、`.`、`⌫`

### Step 3：分類九宮格

複製 Day 1 做的 emoji 圖示，排成 4 × 2 網格（用 Auto Layout `Wrap`）。

選中狀態：背景加品牌綠 `brand/primary` 的 10% 透明色。

---

## Day 6：串成可點擊 Prototype

### Step 1：切到 Prototype 模式

右上角切換 `Design / Prototype`。

### Step 2：拉互動線

- 點 Dashboard 的 `+` FAB 按鈕 → 出現藍色圓圈 → 拖到 `03_Input` Frame
- 右側選 `On tap` → `Open overlay` → 動畫選 `Move in from bottom`
- 點 Dashboard 底部「統計」tab → 拖到 `02_Analytics`
- 點 `02_Analytics` 的「首頁」tab → 拖回 `01_Dashboard`

### Step 3：預覽

- 按右上角 `▶ Present` 鈕
- 用手機開 Figma Mirror App → 自動同步桌面當前畫面，可實體手機操作

---

## Day 7：交付與檢查

### Checklist

- [ ] 三個 Frame 完成，命名乾淨（`01_Dashboard` / `02_Analytics` / `03_Input`）
- [ ] 所有顏色都用 Color Style（沒有 hardcode hex）
- [ ] 所有文字都用 Text Style
- [ ] 帳目列、按鈕都是 Component
- [ ] Prototype 點得通：Dashboard ↔ Analytics ↔ Input
- [ ] 在手機 Figma Mirror 上看過一輪，確認大小、字級舒服
- [ ] 給朋友（或自己隔天）看，能不能猜出每個按鈕的功能？

### 分享給開發者（或未來的自己）

- 右上角 `Share` → 改成 `Anyone with the link can view`
- 複製連結貼到 [PLAN.md](PLAN.md) 開頭
- 開發時：點任一元件 → 右側 `Inspect` 頁籤可看到 CSS / Tailwind 對應的數值

---

## 常用快捷鍵速查

| 鍵 | 作用 |
|---|---|
| `F` | 畫 Frame |
| `R` | 畫矩形 |
| `O` | 畫橢圓 |
| `T` | 文字 |
| `V` | 選取工具 |
| `Shift + A` | 加 Auto Layout |
| `Ctrl + Alt + K` | 建立 Component |
| `Ctrl + D` | 複製 |
| `Alt + 拖曳` | 複製拖曳 |
| `Ctrl + G` | 群組 |
| `Ctrl + /` | 搜尋指令（什麼都能找） |

---

## 推薦的免費資源

| 資源 | 用途 |
|---|---|
| **Figma Community** | 搜「expense tracker」「fintech」可找到大量現成設計參考 |
| **Mobbin** (mobbin.com) | 真實 App 截圖庫，看別人的記帳 App 怎麼設計 |
| **Tailwind CSS Color Palette** | 抄它的色階比自己調漂亮 |
| **Iconify** Plugin | 10 萬+ 免費 icon |
| **Unsplash** Plugin | 免費照片 |

---

## 卡關時怎麼辦

| 症狀 | 解法 |
|---|---|
| 排版一動就壞 | 你忘了用 Auto Layout，全選 → `Shift + A` |
| 改顏色要改 N 次 | 沒設 Color Style，補做一遍 |
| 不知道怎麼做某個效果 | YouTube 搜「Figma [效果名稱]」，幾乎都有 1 分鐘短片 |
| 想要靈感 | Mobbin 搜「Spending」「Budget」 |

---

## 下一步

第 1 週畫完 Figma 後：
1. 把 Figma 連結貼回 [PLAN.md](PLAN.md)
2. 進入第 2 週：建立 Vite + React 專案，開始實作 Dashboard
3. 開發時開兩個視窗：左邊 Figma、右邊 VSCode，照著 Inspect 面板的數值刻

有任何畫面卡住，截圖丟給我看，可以即時微調建議。
