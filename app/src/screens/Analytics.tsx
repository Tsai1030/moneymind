import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { db } from '../db';
import { listTransactionsInMonth, groupByCategory, monthlySpent } from '../db/queries';
import { useUI } from '../state/useUI';
import { fmtMoney } from '../lib/format';
import { FilterIcon } from '../components/Icons';
import { CatInBox } from '../cat/CatInBox';

type Period = 'week' | 'month' | 'quarter' | 'year';
const periods: { id: Period; label: string }[] = [
  { id: 'week', label: '本週' },
  { id: 'month', label: '本月' },
  { id: 'quarter', label: '本季' },
  { id: 'year', label: '本年' },
];

const CAT_COLOR_VARS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

export function Analytics() {
  const { month } = useUI();
  const [period, setPeriod] = useState<Period>('month');

  const txs = useLiveQuery(() => listTransactionsInMonth(month), [month]) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const total = monthlySpent(txs);
  const grouped = groupByCategory(txs);
  const sortedCats = useMemo(() => {
    return Array.from(grouped.entries())
      .map(([catId, amount]) => ({ catId, amount, cat: catMap.get(catId) }))
      .sort((a, b) => b.amount - a.amount);
  }, [grouped, catMap]);

  // Top 5 + 其他 aggregated
  const top = sortedCats.slice(0, 5);
  const rest = sortedCats.slice(5);
  const restTotal = rest.reduce((s, r) => s + r.amount, 0);
  const chartData = [
    ...top.map((t, i) => ({ name: t.cat?.name ?? '·', value: t.amount, fill: CAT_COLOR_VARS[i % 5] })),
    ...(restTotal > 0 ? [{ name: '其他', value: restTotal, fill: CAT_COLOR_VARS[4] }] : []),
  ];

  const tipText = makeTip(txs);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="px-6 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight">統計分析</h1>
        <button className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: 'var(--bg-subtle)' }}>
          <FilterIcon width={18} height={18} />
        </button>
      </header>

      <div className="flex gap-1.5 px-5 py-3">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            disabled={p.id !== 'month'}
            className="px-3.5 py-2 rounded-full text-[13px] font-semibold transition disabled:opacity-40"
            style={{
              background: period === p.id ? 'var(--accent)' : 'transparent',
              color: period === p.id ? 'var(--accent-fg)' : 'var(--text-ink-2)',
            }}
          >{p.label}</button>
        ))}
      </div>

      {tipText && (
        <div className="mx-5 mb-4 p-4 rounded-2xl flex gap-3" style={{ background: 'var(--warning-soft)' }}>
          <div className="w-8 h-8 rounded-xl grid place-items-center text-base shrink-0" style={{ background: 'var(--bg-base)' }}>💡</div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--warning-deep)' }}>痛點發現</div>
            <div className="text-[13px] leading-snug font-medium" style={{ color: 'var(--tip-text)' }}>{tipText}</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-clean px-5 pb-4 flex flex-col">
        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ color: 'var(--text-ink-3)' }}>
            <CatInBox size={220} />
            <div className="text-[14px] font-medium mt-2">這個月還沒有支出可分析</div>
          </div>
        ) : (
          <>
            <div className="relative h-[220px] mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={1} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: 'var(--text-ink-2)' }}>本月支出</div>
                  <div className="num text-[24px] font-extrabold mt-1">
                    <span className="text-[11px] font-semibold mr-0.5" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>NT$</span>
                    {fmtMoney(total)}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-2">
              {sortedCats.map((c, i) => {
                const colorIdx = i < 5 ? i : 4;
                return (
                  <div key={c.catId} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: 'var(--hairline)' }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR_VARS[colorIdx] }} />
                    <div className="flex-1 text-[14px] font-semibold">{c.cat?.icon} {c.cat?.name ?? '未分類'}</div>
                    <div className="text-[14px] font-bold num">{fmtMoney(c.amount)}</div>
                    <div className="text-[11px] font-semibold num w-9 text-right" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>
                      {Math.round((c.amount / total) * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function makeTip(txs: { kind: string; amount: number; date: string }[]): string | null {
  if (txs.length === 0) return null;
  const today = dayjs();
  const weekStart = today.startOf('week').format('YYYY-MM-DD');
  const lastWeekStart = today.subtract(1, 'week').startOf('week').format('YYYY-MM-DD');
  const lastWeekEnd = today.subtract(1, 'week').endOf('week').format('YYYY-MM-DD');

  const thisWeek = txs.filter((t) => t.kind === 'expense' && t.date >= weekStart).reduce((s, t) => s + t.amount, 0);
  const lastWeek = txs.filter((t) => t.kind === 'expense' && t.date >= lastWeekStart && t.date <= lastWeekEnd).reduce((s, t) => s + t.amount, 0);

  if (thisWeek === 0) return null;
  if (lastWeek === 0) return `本週你已支出 NT$ ${thisWeek.toLocaleString()}，第一週紀錄繼續加油！`;

  const diff = ((thisWeek - lastWeek) / lastWeek) * 100;
  if (Math.abs(diff) < 10) return `本週支出 NT$ ${thisWeek.toLocaleString()}，與上週持平。`;
  if (diff > 0) return `本週你已支出 NT$ ${thisWeek.toLocaleString()}，比上週多 ${Math.round(diff)}%。`;
  return `本週支出 NT$ ${thisWeek.toLocaleString()}，比上週少 ${Math.abs(Math.round(diff))}%，繼續保持！`;
}
