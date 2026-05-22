import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { db } from '../db';
import { listTransactionsInMonth, monthlySpent } from '../db/queries';
import type { Mood } from './constants';

export interface MoodInput {
  totalBudget: number;
  spent: number;
  daysLeftInMonth: number;
  daysSinceLastEntry: number;
}

/**
 * Pure function — easy to unit test, no React/Dexie deps.
 * Priority order (first match wins):
 *   1. sleeping  — 連續 3+ 天沒記帳
 *   2. excited   — 月底接近且還有 50%+ 預算（達標感）
 *   3. worried   — 用了 90%+ 預算，或每日可用為負
 *   4. happy     — default
 */
export function computeMood(input: MoodInput): Mood {
  const { totalBudget, spent, daysLeftInMonth, daysSinceLastEntry } = input;

  if (daysSinceLastEntry >= 3) return 'sleeping';
  if (totalBudget <= 0) return 'happy';

  const usedPct = spent / totalBudget;
  const remaining = totalBudget - spent;
  const dailyAvailable = daysLeftInMonth > 0 ? remaining / daysLeftInMonth : remaining;

  // Near end of month with budget remaining — likely on track
  if (daysLeftInMonth <= 5 && usedPct < 0.5) return 'excited';

  if (usedPct >= 0.9 || dailyAvailable < 0) return 'worried';

  return 'happy';
}

/**
 * React hook — reads live data from Dexie, returns current mood.
 */
export function useCatMood(month: string): Mood {
  const txs = useLiveQuery(() => listTransactionsInMonth(month), [month]) ?? [];
  const budget = useLiveQuery(() => db.budgets.get(month), [month]);

  return useMemo(() => {
    const today = dayjs();
    const monthStart = dayjs(`${month}-01`);
    const monthEnd = monthStart.endOf('month');
    const isCurrentMonth = today.format('YYYY-MM') === month;
    const daysLeftInMonth = isCurrentMonth ? Math.max(0, monthEnd.diff(today, 'day')) : 0;

    // Find latest transaction date across all months (not just this month)
    let lastEntryDate: string | null = null;
    for (const t of txs) {
      if (!lastEntryDate || t.date > lastEntryDate) lastEntryDate = t.date;
    }
    const daysSinceLastEntry = lastEntryDate
      ? today.diff(dayjs(lastEntryDate), 'day')
      : 999; // never recorded → treat as long-asleep

    return computeMood({
      totalBudget: budget?.totalAmount ?? 0,
      spent: monthlySpent(txs),
      daysLeftInMonth,
      daysSinceLastEntry,
    });
  }, [txs, budget, month]);
}
