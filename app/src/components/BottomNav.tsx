import { useUI } from '../state/useUI';
import { HomeIcon, ChartIcon, CardIcon, UserIcon, PlusIcon } from './Icons';

const tabs = [
  { id: 'home' as const, label: '首頁', Icon: HomeIcon },
  { id: 'analytics' as const, label: '統計', Icon: ChartIcon },
  null,
  { id: 'accounts' as const, label: '資產', Icon: CardIcon },
  { id: 'me' as const, label: '我的', Icon: UserIcon },
];

export function BottomNav() {
  const { tab, setTab, openInput } = useUI();
  return (
    <nav
      className="relative shrink-0 flex items-center justify-between px-8 pt-3 pb-7 border-t"
      style={{ borderColor: 'var(--hairline)', background: 'var(--bg-base)' }}
    >
      {tabs.map((t, i) =>
        t === null ? (
          <div key={i} className="w-14" />
        ) : (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex flex-col items-center gap-1 w-12 text-[10px] font-semibold tracking-wide"
            style={{ color: tab === t.id ? 'var(--text-ink)' : 'var(--text-ink-3)' }}
          >
            <t.Icon />
            <span>{t.label}</span>
          </button>
        ),
      )}
      <button
        onClick={openInput}
        aria-label="新增記帳"
        className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full grid place-items-center text-[28px] leading-none font-light"
        style={{
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          boxShadow: `0 12px 24px -6px rgba(0,0,0,0.40), 0 0 0 4px var(--bg-base)`,
        }}
      >
        <PlusIcon width={22} height={22} strokeWidth={2.5} />
      </button>
    </nav>
  );
}
