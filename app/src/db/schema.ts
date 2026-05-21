export type AccountType = 'cash' | 'bank' | 'credit' | 'epay';
export type TxKind = 'expense' | 'income' | 'transfer';
export type TxSource = 'manual' | 'voice' | 'ocr' | 'recurring' | 'csv';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: 'TWD';
  initialBalance: number;
  billingDay?: number;
  paymentDay?: number;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  colorVar: 1 | 2 | 3 | 4 | 5;
  order: number;
  archived?: boolean;
}

export interface Transaction {
  id: string;
  kind: TxKind;
  amount: number; // always positive; sign derived from kind
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  note?: string;
  date: string; // ISO date (YYYY-MM-DD)
  source: TxSource;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Budget {
  id: string; // "YYYY-MM"
  month: string;
  totalAmount: number;
  perCategory: Record<string, number>;
  updatedAt: number;
}
