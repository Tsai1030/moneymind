import Dexie, { type EntityTable } from 'dexie';
import type { Account, Category, Transaction, Budget, Holding } from './schema';

class MoneyDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  holdings!: EntityTable<Holding, 'id'>;

  constructor() {
    super('moneymind');
    this.version(1).stores({
      accounts: 'id, name, type, createdAt',
      categories: 'id, name, order',
      transactions: 'id, date, accountId, categoryId, kind, deletedAt, [date+deletedAt]',
      budgets: 'id, month',
    });
    this.version(2).stores({
      holdings: 'id, symbol, market, createdAt, deletedAt',
    });
  }
}

export const db = new MoneyDB();

const uid = () => crypto.randomUUID();
const now = () => Date.now();

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '餐飲', icon: '🍱', colorVar: 1, order: 1 },
  { name: '交通', icon: '🚇', colorVar: 2, order: 2 },
  { name: '娛樂', icon: '🎬', colorVar: 3, order: 3 },
  { name: '生活', icon: '🛒', colorVar: 4, order: 4 },
  { name: '居家', icon: '🏠', colorVar: 5, order: 5 },
  { name: '健康', icon: '💊', colorVar: 1, order: 6 },
  { name: '學習', icon: '📚', colorVar: 2, order: 7 },
  { name: '其他', icon: '📦', colorVar: 5, order: 8 },
];

export const INCOME_CATEGORY: Omit<Category, 'id'> = {
  name: '收入', icon: '💸', colorVar: 1, order: 99,
};

const DEFAULT_ACCOUNTS: Omit<Account, 'id' | 'createdAt'>[] = [
  { name: '現金', type: 'cash', currency: 'TWD', initialBalance: 0 },
  { name: '玉山卡', type: 'credit', currency: 'TWD', initialBalance: 0, billingDay: 15, paymentDay: 5 },
  { name: '悠遊卡', type: 'epay', currency: 'TWD', initialBalance: 0 },
];

export async function seedIfEmpty() {
  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd([
      ...DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() })),
      { ...INCOME_CATEGORY, id: uid() },
    ]);
  }
  const acctCount = await db.accounts.count();
  if (acctCount === 0) {
    await db.accounts.bulkAdd(
      DEFAULT_ACCOUNTS.map((a) => ({ ...a, id: uid(), createdAt: now() })),
    );
  }
}

export { uid, now };
