import dayjs from 'dayjs';
import { db, uid, now } from './index';
import type { Transaction } from './schema';

export type NewTransactionInput = Omit<Transaction, 'id' | 'source' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  source?: Transaction['source'];
};

export async function addTransaction(input: NewTransactionInput): Promise<string> {
  const id = uid();
  const ts = now();
  await db.transactions.add({
    id,
    source: 'manual',
    ...input,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

export async function updateTransaction(id: string, patch: Partial<Transaction>) {
  await db.transactions.update(id, { ...patch, updatedAt: now() });
}

export async function softDeleteTransaction(id: string) {
  await db.transactions.update(id, { deletedAt: now(), updatedAt: now() });
}

export function monthRange(month: string) {
  const start = dayjs(`${month}-01`);
  return {
    start: start.format('YYYY-MM-DD'),
    end: start.endOf('month').format('YYYY-MM-DD'),
  };
}

export async function listTransactionsInMonth(month: string): Promise<Transaction[]> {
  const { start, end } = monthRange(month);
  const all = await db.transactions
    .where('date')
    .between(start, end, true, true)
    .toArray();
  return all.filter((t) => !t.deletedAt).sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
}

export async function listRecentTransactions(limit = 20): Promise<Transaction[]> {
  const all = await db.transactions.orderBy('date').reverse().toArray();
  return all.filter((t) => !t.deletedAt).slice(0, limit);
}

export function monthlySpent(txs: Transaction[]): number {
  return txs.filter((t) => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0);
}

export function monthlyIncome(txs: Transaction[]): number {
  return txs.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0);
}

export function todaySpent(txs: Transaction[]): number {
  const today = dayjs().format('YYYY-MM-DD');
  return txs
    .filter((t) => t.kind === 'expense' && t.date === today)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function groupByCategory(txs: Transaction[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of txs) {
    if (t.kind !== 'expense') continue;
    m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
  }
  return m;
}
