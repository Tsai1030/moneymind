import dayjs, { type Dayjs } from 'dayjs';

export type PeriodKind = 'month' | 'week';

export interface PeriodRange {
  start: string;
  end: string;
  days: number;
}

function startOfWeekMon(d: Dayjs): Dayjs {
  const dow = d.day();
  const offset = dow === 0 ? 6 : dow - 1;
  return d.subtract(offset, 'day').startOf('day');
}

export function periodRange(period: PeriodKind, ref: Dayjs): PeriodRange {
  if (period === 'month') {
    const s = ref.startOf('month');
    const e = ref.endOf('month');
    return { start: s.format('YYYY-MM-DD'), end: e.format('YYYY-MM-DD'), days: e.date() };
  }
  const s = startOfWeekMon(ref);
  const e = s.add(6, 'day');
  return { start: s.format('YYYY-MM-DD'), end: e.format('YYYY-MM-DD'), days: 7 };
}

export function shiftRef(period: PeriodKind, ref: Dayjs, n: number): Dayjs {
  return period === 'month' ? ref.add(n, 'month') : ref.add(n, 'week');
}

/** Cap the period end at today, so we don't compare partial-vs-full. */
export function clipToToday(range: PeriodRange, today: Dayjs): PeriodRange {
  const t = today.format('YYYY-MM-DD');
  if (t < range.start) return { ...range, end: range.start, days: 0 };
  if (t >= range.end) return range;
  const days = today.diff(dayjs(range.start), 'day') + 1;
  return { start: range.start, end: t, days };
}

export function pctChange(now: number, before: number): number | null {
  if (before === 0) return null;
  return (now - before) / before;
}

/**
 * End-of-month forecast with smoothing.
 * 60% linear extrapolation (current daily avg × days in month)
 * 40% projection blending last month's daily avg for remaining days.
 * Returns null when too few days elapsed for a stable estimate.
 */
export function forecastMonthEnd(
  mtdSpent: number,
  daysElapsed: number,
  daysInMonth: number,
  lastMonthTotal: number,
): number | null {
  if (daysElapsed < 5) return null;
  if (daysElapsed >= daysInMonth) return mtdSpent;
  const linear = (mtdSpent / daysElapsed) * daysInMonth;
  if (lastMonthTotal <= 0) return linear;
  const lastDaily = lastMonthTotal / daysInMonth;
  const blended = mtdSpent + lastDaily * (daysInMonth - daysElapsed);
  return linear * 0.6 + blended * 0.4;
}

export interface TrendPoint {
  idx: number;
  label: string;
  current: number | null;
  previous: number | null;
}

/**
 * Aligned daily cumulative for current period vs previous period (same length).
 * Current line stops at "today" so it visually trails the previous-period dashed line.
 */
export function buildTrend(
  currentTxs: { kind: string; amount: number; date: string }[],
  previousTxs: { kind: string; amount: number; date: string }[],
  current: PeriodRange,
  previous: PeriodRange,
  period: PeriodKind,
  today: Dayjs,
): TrendPoint[] {
  const cumMap = (txs: typeof currentTxs, start: string, len: number) => {
    const byDay = new Map<string, number>();
    for (const t of txs) {
      if (t.kind !== 'expense') continue;
      byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
    }
    const out: (number | null)[] = [];
    let cum = 0;
    for (let i = 0; i < len; i++) {
      const k = dayjs(start).add(i, 'day').format('YYYY-MM-DD');
      cum += byDay.get(k) ?? 0;
      out.push(cum);
    }
    return out;
  };

  const len = period === 'month' ? Math.max(current.days, previous.days) : 7;
  const cur = cumMap(currentTxs, current.start, len);
  const prev = cumMap(previousTxs, previous.start, len);
  const todayStr = today.format('YYYY-MM-DD');

  return Array.from({ length: len }, (_, i) => {
    const curDate = dayjs(current.start).add(i, 'day').format('YYYY-MM-DD');
    const future = curDate > todayStr;
    return {
      idx: i + 1,
      label: period === 'month'
        ? String(i + 1)
        : ['一', '二', '三', '四', '五', '六', '日'][i],
      current: future ? null : (cur[i] ?? null),
      previous: prev[i] ?? null,
    };
  });
}

export function sumExpenseByCategory(
  txs: { kind: string; amount: number; categoryId: string }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of txs) {
    if (t.kind !== 'expense') continue;
    m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
  }
  return m;
}

export function sumExpense(
  txs: { kind: string; amount: number }[],
): number {
  return txs.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
}
