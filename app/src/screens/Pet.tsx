import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useUI } from '../state/useUI';
import { usePet, PET_CONSTANTS } from '../state/usePet';
import { derivePetState, PET_STATE_LABEL } from '../cat/petState';
import { RoomCat } from '../cat/RoomCat';

interface FlyingCookie { id: string; startX: number; startY: number; dx: number; dy: number; }
interface HpFloater    { id: string; x: number; y: number; }
interface Heart        { id: string; x: number; y: number; drift: number; rot: number; dur: number; delay: number; }

export function Pet() {
  const closePet = useUI((s) => s.closePet);
  const hp = usePet((s) => s.hp);
  const name = usePet((s) => s.name);
  const bornAt = usePet((s) => s.bornAt);
  const feeds = usePet((s) => s.feeds);
  const cookies = usePet((s) => s.cookies);
  const rename = usePet((s) => s.rename);
  const feed = usePet((s) => s.feed);
  const consumeCookie = usePet((s) => s.consumeCookie);

  const state = derivePetState(hp);
  const isHiding = state === 'hiding';
  const daysAlive = Math.max(1, Math.floor((Date.now() - bornAt) / (24 * 60 * 60 * 1000)) + 1);
  const hpColor = hp >= 60 ? 'var(--color-brand)' : hp >= 30 ? '#F59E0B' : 'var(--color-danger)';

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [flyingCookies, setFlyingCookies] = useState<FlyingCookie[]>([]);
  const [hpFloaters, setHpFloaters] = useState<HpFloater[]>([]);
  const [hearts, setHearts] = useState<Heart[]>([]);

  const catRef = useRef<HTMLDivElement | null>(null);

  function saveName() {
    rename(nameDraft);
    setEditingName(false);
  }

  function nextId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

  function spawnHpFloater(x: number, y: number) {
    const id = nextId();
    setHpFloaters((f) => [...f, { id, x, y }]);
    setTimeout(() => setHpFloaters((f) => f.filter((h) => h.id !== id)), 1300);
  }

  function spawnHearts(centerX: number, centerY: number, count: number) {
    for (let i = 0; i < count; i++) {
      const id = nextId();
      const drift = (Math.random() - 0.5) * 60;
      const rot = (Math.random() - 0.5) * 30;
      const dur = 900 + Math.random() * 600;
      const delay = i * 80;
      const x = centerX + (Math.random() - 0.5) * 40;
      setHearts((h) => [...h, { id, x, y: centerY, drift, rot, dur, delay }]);
      setTimeout(() => setHearts((h) => h.filter((p) => p.id !== id)), dur + delay + 100);
    }
  }

  function handleCookieClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (cookies <= 0) return;
    const cookieEl = e.currentTarget;
    const cookieRect = cookieEl.getBoundingClientRect();
    const catRect = catRef.current?.getBoundingClientRect();
    if (!catRect) return;
    const startX = cookieRect.left;
    const startY = cookieRect.top;
    const targetX = catRect.left + catRect.width / 2 - cookieRect.width / 2;
    const targetY = catRect.top + catRect.height * 0.35 - cookieRect.height / 2;

    const id = nextId();
    setFlyingCookies((f) => [...f, { id, startX, startY, dx: targetX - startX, dy: targetY - startY }]);
    setTimeout(() => setFlyingCookies((f) => f.filter((c) => c.id !== id)), 650);

    // Consume + spawn HP floater right when cookie reaches mouth
    setTimeout(() => {
      const ok = consumeCookie();
      if (ok) spawnHpFloater(catRect.left + catRect.width / 2, catRect.top + catRect.height * 0.25);
    }, 480);
  }

  function handleGreet() {
    const catRect = catRef.current?.getBoundingClientRect();
    const ok = feed('greeting');
    if (!ok || !catRect) return;
    spawnHearts(catRect.left + catRect.width / 2, catRect.top + 30, 5);
  }

  const canGreet = !isHiding && feeds.greeting < PET_CONSTANTS.DAILY_CAP.greeting;
  const ctaLabel = isHiding ? '記一筆讓貓咪回來'
    : feeds.greeting >= PET_CONSTANTS.DAILY_CAP.greeting ? '今天已經打過招呼了'
    : `跟 ${name} 玩 +${PET_CONSTANTS.FEED_AMOUNT.greeting} HP`;

  const dropY = state === 'sick' ? 6 : state === 'hungry' ? 4 : 0;
  const catFilter = `drop-shadow(0 6px 0 var(--room-shadow))${state === 'sick' ? ' grayscale(0.35)' : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="shrink-0 px-5 pt-4 pb-3 flex items-center justify-between">
        <button
          onClick={closePet}
          aria-label="關閉"
          className="w-9 h-9 rounded-xl grid place-items-center"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-ink-3)' }}>
          寵物 · 家
        </div>
        <div className="w-9" />
      </header>

      {/* ── Room ─────────────────────────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, var(--room-wall) 0%, var(--room-wall) 60%, var(--room-floor) 60%, var(--room-floor) 100%)',
          minHeight: 320,
        }}
      >
        {/* Window */}
        <div
          className="absolute"
          style={{
            top: 28, right: 24, width: 110, height: 90,
            borderRadius: 12,
            background: 'var(--room-window)',
            border: '4px solid var(--room-wood)',
            boxShadow: '0 1px 0 0 var(--room-shadow)',
          }}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2" style={{ width: 3, background: 'var(--room-wood)' }} />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: 3, background: 'var(--room-wood)' }} />
        </div>

        {/* Lamp */}
        <div className="absolute" style={{ top: 28, left: 32, width: 6, height: 100, background: 'var(--room-wood)', borderRadius: 2 }}>
          <div
            className="absolute"
            style={{
              top: 0, left: -23, width: 52, height: 32,
              background: 'var(--room-lamp)',
              borderRadius: '26px 26px 4px 4px',
              border: '1.5px solid var(--room-wood)',
              boxShadow: '0 0 24px 4px var(--room-lamp)',
            }}
          />
        </div>

        {/* Frame */}
        <div
          className="absolute grid place-items-center text-[28px]"
          style={{
            top: 36, left: '50%', translate: '-50% 0',
            width: 64, height: 84,
            background: 'var(--bg-elevated)',
            border: '3px solid var(--room-wood)',
            borderRadius: 4,
          }}
        >
          🎀
        </div>

        {/* Cat (or empty box if hiding) */}
        <div
          ref={catRef}
          className="absolute"
          style={{
            bottom: 88, left: '50%', translate: '-50% 0',
            width: 200, height: 240,
            transform: `translateY(${dropY}px)`,
            transition: 'transform 400ms ease, filter 400ms ease',
            filter: isHiding ? undefined : catFilter,
          }}
        >
          {isHiding ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-[110px] leading-none opacity-60">📦</div>
              <div className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-ink-3)' }}>記一筆讓貓咪回來</div>
            </div>
          ) : (
            <RoomCat state={state} />
          )}
        </div>

        {/* Bowl label (shows HP value) */}
        <div
          className="absolute text-center text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ bottom: 86, left: 40, width: 72, color: 'var(--text-ink-2)' }}
        >
          飯碗 · {Math.round(hp)}
        </div>

        {/* Bowl (fills with HP) */}
        <div
          className="absolute overflow-hidden"
          style={{
            bottom: 48, left: 48, width: 64, height: 28,
            background: 'var(--bg-subtle)',
            border: '2px solid var(--room-wood)',
            borderRadius: '0 0 32px 32px / 0 0 28px 28px',
          }}
        >
          <div
            className="absolute inset-x-0 bottom-0 transition-all duration-500"
            style={{ height: `${Math.max(0, hp)}%`, background: hpColor }}
          />
        </div>

        {/* Doorway (back-right) */}
        <div
          className="absolute"
          style={{
            bottom: 0, right: 18, width: 56, height: 110,
            background: 'var(--bg-elevated)',
            borderTop: '3px solid var(--room-wood)',
            borderLeft: '3px solid var(--room-wood)',
            borderRight: '3px solid var(--room-wood)',
            borderRadius: '28px 28px 0 0',
          }}
        >
          <div
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full"
            style={{ width: 5, height: 5, background: 'var(--text-ink-2)' }}
          />
        </div>

        {/* Cookie tray label */}
        <div
          className="absolute text-center text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ bottom: 70, right: 24, width: 110, color: 'var(--text-ink-2)' }}
        >
          餅乾托盤 · {cookies}
        </div>

        {/* Cookie tray (in front of doorway) */}
        <div
          className="absolute flex items-end justify-center gap-1.5"
          style={{
            bottom: 36, right: 24, width: 110, height: 30,
            background: 'var(--room-wood)',
            borderRadius: '4px 4px 14px 14px',
            boxShadow: '0 2px 0 0 var(--room-shadow)',
            paddingBottom: 5,
          }}
        >
          {Array.from({ length: cookies }).map((_, i) => (
            <button
              key={i}
              onClick={handleCookieClick}
              className="pet-cookie"
              aria-label="餵食一塊餅乾 +8 HP"
            />
          ))}
          {cookies === 0 && (
            <div className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)', paddingBottom: 6 }}>
              記一筆會掉一塊餅乾
            </div>
          )}
        </div>
      </div>

      {/* ── Card ─────────────────────────────────────────────── */}
      <div className="shrink-0 p-5" style={{ borderTop: '1px solid var(--hairline)' }}>
        {/* Name + state */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
                maxLength={12}
                className="flex-1 px-3 py-2 rounded-xl text-[18px] font-bold outline-none"
                style={{ background: 'var(--bg-subtle)' }}
              />
              <button
                onClick={saveName}
                className="px-3 py-2 rounded-xl text-[13px] font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >存</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setNameDraft(name); setEditingName(true); }}
                className="flex items-center gap-2 min-w-0 active:opacity-70"
              >
                <span className="text-[22px] font-extrabold tracking-tight truncate">{name}</span>
                <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--text-ink-3)' }}>編輯</span>
              </button>
              <div
                className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-ink-2)' }}
              >
                {PET_STATE_LABEL[state]} · {daysAlive} 天
              </div>
            </>
          )}
        </div>

        {/* Daily stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatChip label="開啟" icon="📂" done={feeds.open} cap={PET_CONSTANTS.DAILY_CAP.open} />
          <StatChip label="餅乾" icon="🍪" done={feeds.transaction} cap={PET_CONSTANTS.DAILY_CAP.transaction} />
          <StatChip label="招呼" icon="👋" done={feeds.greeting} cap={PET_CONSTANTS.DAILY_CAP.greeting} />
        </div>

        {/* CTA */}
        <button
          onClick={handleGreet}
          disabled={!canGreet}
          className="w-full py-4 rounded-2xl text-[15px] font-bold disabled:opacity-40 active:scale-[0.99] transition"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {ctaLabel}
        </button>

        <div className="mt-3 text-[10px] text-center" style={{ color: 'var(--text-ink-3)' }}>
          自 {dayjs(bornAt).format('YYYY/M/D')} 起 · 沒互動每天 −{PET_CONSTANTS.DECAY_PER_DAY} HP · 餅乾 +{PET_CONSTANTS.COOKIE_HP_GAIN} HP
        </div>
      </div>

      {/* ── Particle layer (fixed-positioned, covers whole viewport) ── */}
      {flyingCookies.map((c) => (
        <div
          key={c.id}
          className="pet-cookie pet-cookie-flying"
          style={{
            left: c.startX,
            top: c.startY,
            ['--fly-dx' as string]: `${c.dx}px`,
            ['--fly-dy' as string]: `${c.dy}px`,
          }}
        />
      ))}
      {hpFloaters.map((f) => (
        <div
          key={f.id}
          className="pet-hp-floater num"
          style={{ left: f.x, top: f.y }}
        >+{PET_CONSTANTS.COOKIE_HP_GAIN} HP</div>
      ))}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="pet-heart"
          style={{
            left: h.x,
            top: h.y,
            fontSize: 16 + Math.random() * 8,
            animationDelay: `${h.delay}ms`,
            animationDuration: `${h.dur}ms`,
            ['--drift' as string]: `${h.drift}px`,
            ['--rot' as string]: `${h.rot}deg`,
          }}
        >♥</div>
      ))}
    </div>
  );
}

function StatChip({ label, icon, done, cap }: { label: string; icon: string; done: number; cap: number }) {
  const full = done >= cap;
  return (
    <div
      className="p-2.5 rounded-2xl border text-center"
      style={{
        background: full ? 'var(--color-brand-soft)' : 'var(--bg-elevated)',
        borderColor: full ? 'var(--color-brand)' : 'var(--hairline)',
      }}
    >
      <div className="text-[15px]">{icon}</div>
      <div className="text-[14px] num font-extrabold mt-0.5">{done}/{cap}</div>
      <div
        className="text-[9px] uppercase tracking-[0.1em] mt-0.5"
        style={{ color: full ? 'var(--color-brand-deep)' : 'var(--text-ink-3)' }}
      >{label}</div>
    </div>
  );
}
