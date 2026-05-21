import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { db } from '../db';
import { listTransactionsInMonth, monthlySpent, todaySpent } from '../db/queries';
import { useUI } from '../state/useUI';
import { fmtMoney } from '../lib/format';
import { SettingsIcon } from '../components/Icons';
import { MonthPicker } from '../components/MonthPicker';

export function Dashboard() {
  const { month, setMonth, setTab, openDetail } = useUI();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const isThisMonth = month === dayjs().format('YYYY-MM');

  const txs = useLiveQuery(() => listTransactionsInMonth(month), [month]) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const budget = useLiveQuery(() => db.budgets.get(month), [month]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const acctMap = new Map(accounts.map((a) => [a.id, a]));

  const totalBudget = budget?.totalAmount ?? 0;
  const spent = monthlySpent(txs);
  const remaining = totalBudget - spent;
  const usagePct = totalBudget > 0 ? Math.min(spent / totalBudget, 1) : 0;
  const usageColor = usagePct >= 0.9 ? 'var(--color-danger)' : usagePct >= 0.7 ? '#F59E0B' : 'var(--accent)';

  const today = todaySpent(txs);
  const todayCount = txs.filter((t) => t.kind === 'expense' && t.date === dayjs().format('YYYY-MM-DD')).length;

  const grouped = groupByDate(txs.slice(0, 30));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="px-6 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMonthPickerOpen(true)}
            className="flex items-center gap-2 pr-3 pl-3.5 py-1.5 rounded-full font-bold text-[18px]"
            style={{
              background: isThisMonth ? 'var(--bg-subtle)' : 'var(--color-brand-soft)',
              color: isThisMonth ? 'var(--text-ink)' : 'var(--color-brand-deep)',
            }}
          >
            {dayjs(`${month}-01`).format(isThisMonth ? 'M月' : 'YYYY/M')}
            <span className="inline-block w-2 h-2 border-r-[1.5px] border-b-[1.5px] -translate-y-[2px] rotate-45" style={{ borderColor: 'currentColor' }} />
          </button>
          {!isThisMonth && (
            <button
              onClick={() => setMonth(dayjs().format('YYYY-MM'))}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-ink-2)' }}
            >返回本月</button>
          )}
        </div>
        <button onClick={() => setTab('me')} className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: 'var(--bg-subtle)' }}>
          <SettingsIcon width={18} height={18} />
        </button>
      </header>

      {/* Budget hero */}
      <section className="mx-5 mt-2 mb-4 p-6 rounded-3xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
        <div className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--text-ink-2)' }}>
          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
          本月剩餘可用
        </div>
        <div className="flex items-baseline gap-2 num">
          <span className="text-[18px] font-semibold" style={{ color: 'var(--text-ink-2)' }}>NT$</span>
          <span className="text-[52px] font-extrabold leading-none">
            {totalBudget > 0 ? fmtMoney(remaining) : '—'}
          </span>
        </div>
        {totalBudget > 0 ? (
          <>
            <div className="mt-5 h-1 rounded relative" style={{ background: 'rgba(127,127,127,0.15)' }}>
              <div className="absolute inset-y-0 left-0 rounded transition-[width] duration-500" style={{ width: `${usagePct * 100}%`, background: usageColor }} />
            </div>
            <div className="flex justify-between text-[12px] mt-3" style={{ color: 'var(--text-ink-2)' }}>
              <span>已使用 <b className="num" style={{ color: 'var(--text-ink)' }}>{fmtMoney(spent)}</b></span>
              <span>預算 <b className="num" style={{ color: 'var(--text-ink)' }}>{fmtMoney(totalBudget)}</b></span>
            </div>
          </>
        ) : (
          <button onClick={() => setTab('me')} className="mt-4 text-[13px] font-semibold underline decoration-dotted underline-offset-4" style={{ color: 'var(--text-ink-2)' }}>
            設定本月預算 →
          </button>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2.5 mx-5 mb-4">
        <StatCard label="淨資產" value={netAssets(accounts, txs)} />
        <StatCard label="今日支出" value={today} suffix={todayCount > 0 ? `${todayCount} 筆` : '尚無'} />
      </div>

      <div className="px-7 pt-3 pb-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-ink-3)' }}>
        <span>近期</span>
        <span>{txs.length} 筆 · {dayjs(`${month}-01`).format('M月')}</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-clean px-3 pb-2">
        {txs.length === 0 ? (
          <div className="px-6 pt-10 pb-10 text-center" style={{ color: 'var(--text-ink-3)' }}>
            <div className="text-[40px] mb-2">📒</div>
            <div className="text-[14px] font-medium">這個月還沒有任何紀錄</div>
            <div className="text-[12px] mt-1.5" style={{ color: 'var(--text-ink-3)' }}>點右下角「＋」開始記第一筆</div>
          </div>
        ) : (
          grouped.map(({ date, items }) => (
            <div key={date}>
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-ink-3)' }}>
                {formatDateLabel(date)}
              </div>
              {items.map((t) => {
                const cat = catMap.get(t.categoryId);
                const acct = acctMap.get(t.accountId);
                return (
                  <button
                    key={t.id}
                    onClick={() => openDetail(t.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left active:scale-[0.99] transition"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="w-10 h-10 rounded-xl grid place-items-center text-[19px] shrink-0" style={{ background: 'var(--bg-subtle)' }}>
                      {cat?.icon ?? '·'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold truncate" style={{ letterSpacing: '-0.01em' }}>
                        {t.note?.trim() || cat?.name || '未分類'}
                      </div>
                      <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-ink-2)' }}>
                        {cat?.name ?? '·'} · {acct?.name ?? '·'}
                      </div>
                    </div>
                    <div className="text-[15px] font-bold num"
                      style={{ color: t.kind === 'income' ? 'var(--color-brand-deep)' : 'var(--text-ink)' }}>
                      {t.kind === 'income' ? '+' : '−'}{fmtMoney(t.amount)}
                    </div>
                    <span className="text-[14px] opacity-30">›</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <MonthPicker
        open={monthPickerOpen}
        value={month}
        onChange={setMonth}
        onClose={() => setMonthPickerOpen(false)}
      />
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
      <div className="text-[11px] font-semibold mb-1.5 uppercase tracking-[0.08em]" style={{ color: 'var(--text-ink-2)' }}>{label}</div>
      <div className="text-[20px] font-bold num flex items-baseline gap-0.5">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>NT$</span>
        {fmtMoney(value)}
      </div>
      {suffix && <div className="text-[11px] mt-1" style={{ color: 'var(--text-ink-2)' }}>{suffix}</div>}
    </div>
  );
}

function netAssets(accounts: { id: string; initialBalance: number }[], txs: { kind: string; amount: number; accountId: string }[]): number {
  let total = accounts.reduce((s, a) => s + a.initialBalance, 0);
  for (const t of txs) {
    if (t.kind === 'income') total += t.amount;
    else if (t.kind === 'expense') total -= t.amount;
  }
  return total;
}

function groupByDate<T extends { date: string }>(txs: T[]): { date: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const t of txs) {
    const arr = map.get(t.date) ?? [];
    arr.push(t);
    map.set(t.date, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

function formatDateLabel(d: string): string {
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  if (d === today) return `今日 · ${dayjs(d).format('M/D')}`;
  if (d === yesterday) return `昨日 · ${dayjs(d).format('M/D')}`;
  return dayjs(d).format('M/D dddd');
}
