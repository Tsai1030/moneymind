import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts';
import { db } from '../db';
import { listTransactionsInRange } from '../db/queries';
import { useUI } from '../state/useUI';
import { fmtMoney } from '../lib/format';
import { CatInBox } from '../cat/CatInBox';
import { MonthPicker } from '../components/MonthPicker';
import {
  type PeriodKind,
  periodRange, shiftRef, clipToToday,
  pctChange, forecastMonthEnd,
  buildTrend, sumExpense, sumExpenseByCategory,
} from '../lib/analytics';

const periods: { id: PeriodKind; label: string }[] = [
  { id: 'month', label: '本月' },
  { id: 'week', label: '本週' },
];

const CAT_COLOR_VARS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

type ChartView = 'pie' | 'trend';

export function Analytics() {
  const { month, setMonth } = useUI();
  const [period, setPeriod] = useState<PeriodKind>('month');
  const [chartView, setChartView] = useState<ChartView>('pie');
  const [chartCollapsed, setChartCollapsed] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const today = dayjs();
  const refDate = period === 'month' ? dayjs(`${month}-01`) : today;
  const isCurrentPeriod = period === 'month'
    ? refDate.format('YYYY-MM') === today.format('YYYY-MM')
    : true;
  const isThisMonth = month === today.format('YYYY-MM');

  // Context-aware labels: "本月" / "5 月" / "本週"
  const periodLabel = period === 'week'
    ? '本週'
    : isThisMonth ? '本月' : `${refDate.format('M')} 月`;
  const prevPeriodLabel = period === 'week'
    ? '上週'
    : `${refDate.subtract(1, 'month').format('M')} 月`;

  const cur = periodRange(period, refDate);
  const prev = periodRange(period, shiftRef(period, refDate, -1));
  const curMTD = isCurrentPeriod ? clipToToday(cur, today) : cur;
  const prevMTD = isCurrentPeriod
    ? { start: prev.start, end: dayjs(prev.start).add(Math.max(curMTD.days - 1, 0), 'day').format('YYYY-MM-DD'), days: curMTD.days }
    : prev;

  const curTxs = useLiveQuery(() => listTransactionsInRange(cur.start, cur.end), [cur.start, cur.end]) ?? [];
  const prevTxs = useLiveQuery(() => listTransactionsInRange(prev.start, prev.end), [prev.start, prev.end]) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const budget = useLiveQuery(() => db.budgets.get(refDate.format('YYYY-MM')), [refDate.format('YYYY-MM')]);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const curMTDTxs = useMemo(
    () => curTxs.filter((t) => t.date >= curMTD.start && t.date <= curMTD.end),
    [curTxs, curMTD.start, curMTD.end],
  );
  const prevMTDTxs = useMemo(
    () => prevTxs.filter((t) => t.date >= prevMTD.start && t.date <= prevMTD.end),
    [prevTxs, prevMTD.start, prevMTD.end],
  );

  const total = sumExpense(curMTDTxs);
  const prevTotal = sumExpense(prevMTDTxs);
  const delta = pctChange(total, prevTotal);

  const forecast = period === 'month' && isCurrentPeriod
    ? forecastMonthEnd(sumExpense(curTxs), curMTD.days, cur.days, sumExpense(prevTxs))
    : null;

  const curByCat = useMemo(() => sumExpenseByCategory(curMTDTxs), [curMTDTxs]);
  const prevByCat = useMemo(() => sumExpenseByCategory(prevMTDTxs), [prevMTDTxs]);

  const sortedCats = useMemo(() => {
    return Array.from(curByCat.entries())
      .map(([catId, amount]) => ({
        catId,
        amount,
        prev: prevByCat.get(catId) ?? 0,
        delta: pctChange(amount, prevByCat.get(catId) ?? 0),
        cat: catMap.get(catId),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [curByCat, prevByCat, catMap]);

  const top = sortedCats.slice(0, 5);
  const rest = sortedCats.slice(5);
  const restTotal = rest.reduce((s, r) => s + r.amount, 0);
  const chartData = [
    ...top.map((t, i) => ({ name: t.cat?.name ?? '·', value: t.amount, fill: CAT_COLOR_VARS[i % 5] })),
    ...(restTotal > 0 ? [{ name: '其他', value: restTotal, fill: CAT_COLOR_VARS[4] }] : []),
  ];

  const trend = useMemo(
    () => buildTrend(curTxs, prevTxs, cur, prev, period, today),
    [curTxs, prevTxs, cur.start, cur.end, prev.start, prev.end, period],
  );

  const perCategoryBudgets = useMemo(() => {
    if (period !== 'month') return [];
    const pc = budget?.perCategory ?? {};
    return Object.entries(pc)
      .filter(([, amt]) => amt > 0)
      .map(([catId, amt]) => ({
        catId,
        cat: catMap.get(catId),
        budget: amt,
        spent: curByCat.get(catId) ?? 0,
      }))
      .sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget));
  }, [budget, curByCat, catMap, period]);

  const tipText = makeTip(periodLabel, prevPeriodLabel, total, delta);
  const showForecastWarn = forecast !== null && budget?.totalAmount && forecast > budget.totalAmount;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="px-6 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight">統計分析</h1>
        <div className="flex items-center gap-1.5">
          {!isThisMonth && period === 'month' && (
            <button
              onClick={() => setMonth(today.format('YYYY-MM'))}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-ink-2)' }}
            >返回本月</button>
          )}
          <button
            onClick={() => setMonthPickerOpen(true)}
            className="flex items-center gap-1.5 pl-3 pr-2.5 h-9 rounded-xl font-semibold text-[13px]"
            style={{
              background: isThisMonth ? 'var(--bg-subtle)' : 'var(--color-brand-soft)',
              color: isThisMonth ? 'var(--text-ink)' : 'var(--color-brand-deep)',
            }}
          >
            {isThisMonth ? '本月' : dayjs(`${month}-01`).format('YYYY/M')}
            <span className="inline-block w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] -translate-y-[1px] rotate-45" style={{ borderColor: 'currentColor' }} />
          </button>
        </div>
      </header>

      <div className="flex gap-1.5 px-5 py-3">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className="px-3.5 py-2 rounded-full text-[13px] font-semibold transition"
            style={{
              background: period === p.id ? 'var(--accent)' : 'transparent',
              color: period === p.id ? 'var(--accent-fg)' : 'var(--text-ink-2)',
            }}
          >{p.label}</button>
        ))}
        {period === 'week' && (
          <div className="ml-auto text-[11px] self-center" style={{ color: 'var(--text-ink-3)' }}>
            {dayjs(cur.start).format('M/D')} – {dayjs(cur.end).format('M/D')}
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ color: 'var(--text-ink-3)' }}>
          <CatInBox size={220} />
          <div className="text-[14px] font-medium mt-2">
            {periodLabel}還沒有支出可分析
          </div>
        </div>
      ) : (
        <>
          {/* FIXED TOP: Hero + Chart card */}
          <div className="shrink-0 px-5">
            {/* Hero stat card — total + delta + forecast */}
            <section className="mb-3 px-5 py-4 rounded-3xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
              <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: 'var(--text-ink-2)' }}>
                {periodLabel}支出
              </div>
              <div className="num text-[36px] font-extrabold leading-none mt-1.5">
                <span className="text-[14px] font-semibold mr-1" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>NT$</span>
                {fmtMoney(total)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
                <InlineDelta delta={delta} prevLabel={prevPeriodLabel} />
                {forecast !== null && (
                  <span className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--text-ink-3)' }}>·</span>
                    <span style={{ color: 'var(--text-ink-2)' }}>預估月底</span>
                    <span className="num font-bold">NT$ {fmtMoney(forecast)}</span>
                    {showForecastWarn && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--warning-soft)', color: 'var(--warning-deep)' }}>將超支</span>
                    )}
                  </span>
                )}
              </div>
            </section>

            {/* Chart card with view toggle + collapse */}
            <section className="mb-3 rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
              <div className="flex items-center gap-1 p-2 pb-1">
                <ViewTab active={chartView === 'pie'} onClick={() => setChartView('pie')}>圓餅</ViewTab>
                <ViewTab active={chartView === 'trend'} onClick={() => setChartView('trend')}>趨勢</ViewTab>
                <div className="ml-auto pr-1 text-[10px]" style={{ color: 'var(--text-ink-3)' }}>
                  {chartView === 'trend' && `vs ${prevPeriodLabel}`}
                </div>
                <button
                  onClick={() => setChartCollapsed((s) => !s)}
                  aria-label={chartCollapsed ? '展開圖表' : '收起圖表'}
                  className="w-6 h-6 rounded-full grid place-items-center ml-1"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] transition-transform"
                    style={{
                      borderColor: 'var(--text-ink-2)',
                      transform: chartCollapsed ? 'rotate(-135deg) translate(1px, 1px)' : 'rotate(45deg) translate(-1px, -1px)',
                    }}
                  />
                </button>
              </div>
              <div
                className="overflow-hidden"
                style={{
                  maxHeight: chartCollapsed ? 0 : 232,
                  opacity: chartCollapsed ? 0 : 1,
                  transition: 'max-height 280ms ease, opacity 200ms ease',
                }}
              >
                <div className="h-[220px] px-3 pb-2">
                  {chartView === 'pie' ? (
                    <div className="relative h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={66} outerRadius={92} paddingAngle={1} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      {top[0] && (
                        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: 'var(--text-ink-3)' }}>最大支出</div>
                            <div className="text-[22px] mt-1">{top[0].cat?.icon}</div>
                            <div className="text-[12px] font-bold mt-0.5">{top[0].cat?.name ?? '未分類'}</div>
                            <div className="text-[11px] num font-semibold" style={{ color: 'var(--text-ink-2)' }}>
                              {Math.round((top[0].amount / total) * 100)}%
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--text-ink-3)', fontSize: 10 }}
                            interval={period === 'month' ? Math.max(0, Math.floor(trend.length / 5) - 1) : 0}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--text-ink-3)', fontSize: 10 }}
                            tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                            width={36}
                          />
                          <Tooltip
                            cursor={{ stroke: 'var(--text-ink-3)', strokeDasharray: '3 3' }}
                            content={<TrendTooltip period={period} prevLabel={prevPeriodLabel} />}
                          />
                          <Line
                            type="monotone"
                            dataKey="previous"
                            stroke="var(--text-ink-3)"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="current"
                            stroke="var(--accent)"
                            strokeWidth={2.5}
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* SCROLLABLE: budgets + category list + tip */}
          <div className="flex-1 overflow-y-auto scroll-clean px-5 pb-4">
            {period === 'month' && perCategoryBudgets.length > 0 && (
              <section className="mb-4">
                <SectionTitle>子預算進度</SectionTitle>
                <div className="rounded-2xl border px-4 py-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
                  {perCategoryBudgets.map((b, i) => (
                    <BudgetRow key={b.catId} item={b} last={i === perCategoryBudgets.length - 1} />
                  ))}
                </div>
              </section>
            )}

            <section className="mb-4">
              <SectionTitle>
                分類排行
                {sortedCats.length > 5 && (
                  <button
                    onClick={() => setShowAllCats((s) => !s)}
                    className="ml-auto text-[11px] font-semibold normal-case tracking-normal"
                    style={{ color: 'var(--text-ink-2)' }}
                  >{showAllCats ? '收合' : `顯示全部 ${sortedCats.length}`}</button>
                )}
              </SectionTitle>
              <div className="px-2">
                {(showAllCats ? sortedCats : top).map((c, i) => {
                  const colorIdx = i < 5 ? i : 4;
                  return (
                    <div key={c.catId} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: 'var(--hairline)' }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR_VARS[colorIdx] }} />
                      <div className="flex-1 text-[14px] font-semibold">{c.cat?.icon} {c.cat?.name ?? '未分類'}</div>
                      <DeltaArrow delta={c.delta} amount={c.amount} />
                      <div className="text-[14px] font-bold num">{fmtMoney(c.amount)}</div>
                      <div className="text-[11px] font-semibold num w-9 text-right" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>
                        {Math.round((c.amount / total) * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {tipText && (
              <div className="mb-2 p-4 rounded-2xl flex gap-3" style={{ background: 'var(--warning-soft)' }}>
                <div className="w-8 h-8 rounded-xl grid place-items-center text-base shrink-0" style={{ background: 'var(--bg-base)' }}>💡</div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--warning-deep)' }}>智能洞察</div>
                  <div className="text-[13px] leading-snug font-medium" style={{ color: 'var(--tip-text)' }}>{tipText}</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <MonthPicker
        open={monthPickerOpen}
        value={month}
        onChange={setMonth}
        onClose={() => setMonthPickerOpen(false)}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1 pb-2 flex items-center text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-ink-3)' }}>
      {children}
    </div>
  );
}

function InlineDelta({ delta, prevLabel }: { delta: number | null; prevLabel: string }) {
  const fullLabel = `${prevLabel}同期`;
  if (delta === null) {
    return <span style={{ color: 'var(--text-ink-3)' }}>無{fullLabel}資料</span>;
  }
  const pct = Math.round(delta * 100);
  if (Math.abs(pct) < 1) {
    return <span style={{ color: 'var(--text-ink-2)' }}>與{fullLabel}持平</span>;
  }
  const up = pct > 0;
  return (
    <span className="flex items-center gap-1 font-semibold"
      style={{ color: up ? 'var(--color-danger)' : 'var(--color-brand-deep)' }}>
      <span>{up ? '↑' : '↓'}</span>
      <span className="num">{Math.abs(pct)}%</span>
      <span style={{ color: 'var(--text-ink-2)', fontWeight: 500 }}>vs {fullLabel}</span>
    </span>
  );
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition"
      style={{
        background: active ? 'var(--bg-subtle)' : 'transparent',
        color: active ? 'var(--text-ink)' : 'var(--text-ink-3)',
      }}
    >{children}</button>
  );
}

function DeltaArrow({ delta, amount }: { delta: number | null; amount: number }) {
  if (delta === null || amount < 200 || Math.abs(delta) < 0.15) return null;
  const up = delta > 0;
  return (
    <span className="text-[11px] font-bold num"
      style={{ color: up ? 'var(--color-danger)' : 'var(--color-brand-deep)' }}>
      {up ? '↑' : '↓'}{Math.abs(Math.round(delta * 100))}%
    </span>
  );
}

function BudgetRow({ item, last }: {
  item: { cat: { name: string; icon: string } | undefined; budget: number; spent: number };
  last: boolean;
}) {
  const pct = item.budget > 0 ? Math.min(item.spent / item.budget, 1.5) : 0;
  const over = item.spent > item.budget;
  const color = pct >= 0.9 ? 'var(--color-danger)' : pct >= 0.7 ? '#F59E0B' : 'var(--accent)';
  return (
    <div className={last ? '' : 'mb-3'}>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[13px] font-semibold">
          {item.cat?.icon} {item.cat?.name ?? '未分類'}
        </div>
        <div className="text-[12px] num" style={{ color: over ? 'var(--color-danger)' : 'var(--text-ink-2)' }}>
          <span className="font-bold" style={{ color: over ? 'var(--color-danger)' : 'var(--text-ink)' }}>{fmtMoney(item.spent)}</span>
          <span> / {fmtMoney(item.budget)}</span>
        </div>
      </div>
      <div className="h-1 rounded relative" style={{ background: 'rgba(127,127,127,0.15)' }}>
        <div className="absolute inset-y-0 left-0 rounded transition-[width] duration-500"
          style={{ width: `${Math.min(pct, 1) * 100}%`, background: color }} />
        {pct > 1 && (
          <div className="absolute inset-y-0 right-0 rounded"
            style={{ width: `${Math.min((pct - 1), 0.5) * 100}%`, background: 'var(--color-danger)', opacity: 0.5 }} />
        )}
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, label, period, prevLabel }: any) {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p: any) => p.dataKey === 'current')?.value;
  const prev = payload.find((p: any) => p.dataKey === 'previous')?.value;
  return (
    <div className="px-2.5 py-2 rounded-lg shadow-sm text-[11px]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--hairline)' }}>
      <div className="font-semibold mb-1">{period === 'month' ? `${label} 日` : `週${label}`}</div>
      {cur != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-0.5 rounded" style={{ background: 'var(--accent)' }} />
          <span style={{ color: 'var(--text-ink-2)' }}>本期</span>
          <span className="num font-bold ml-auto">NT$ {fmtMoney(cur)}</span>
        </div>
      )}
      {prev != null && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="w-2 h-0.5 rounded" style={{ background: 'var(--text-ink-3)' }} />
          <span style={{ color: 'var(--text-ink-2)' }}>{prevLabel}</span>
          <span className="num ml-auto" style={{ color: 'var(--text-ink-2)' }}>NT$ {fmtMoney(prev)}</span>
        </div>
      )}
    </div>
  );
}

function makeTip(periodLabel: string, prevLabel: string, total: number, delta: number | null): string | null {
  if (total === 0) return null;
  const amt = `NT$ ${total.toLocaleString()}`;
  if (delta === null) return `${periodLabel}你已支出 ${amt}，這是新的開始。`;
  const pct = Math.round(delta * 100);
  if (Math.abs(pct) < 10) return `${periodLabel}支出 ${amt}，與${prevLabel}同期持平。`;
  if (pct > 0) return `${periodLabel}你已支出 ${amt}，比${prevLabel}同期多 ${pct}%。`;
  return `${periodLabel}支出 ${amt}，比${prevLabel}同期少 ${Math.abs(pct)}%，繼續保持！`;
}
