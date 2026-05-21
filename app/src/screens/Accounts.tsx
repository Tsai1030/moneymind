import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid, now } from '../db';
import type { AccountType } from '../db/schema';
import { fmtMoney } from '../lib/format';
import { listRecentTransactions } from '../db/queries';

const TYPE_LABEL: Record<AccountType, string> = {
  cash: '現金', bank: '銀行', credit: '信用卡', epay: '電子支付',
};
const TYPE_OPTIONS: AccountType[] = ['cash', 'bank', 'credit', 'epay'];

export function Accounts() {
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const recent = useLiveQuery(() => listRecentTransactions(500)) ?? [];

  const balances = computeBalances(accounts, recent);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="px-6 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight">帳戶</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-[13px] font-semibold px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-subtle)' }}
        >＋ 新增</button>
      </header>

      <div className="flex-1 overflow-y-auto scroll-clean px-5 pb-4">
        {accounts.map((a) => (
          <div key={a.id} className="p-5 mb-3 rounded-3xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-ink-2)' }}>{TYPE_LABEL[a.type]}</div>
                <div className="text-[18px] font-bold mt-0.5">{a.name}</div>
              </div>
              <button
                onClick={() => deleteAccount(a.id)}
                className="text-[12px] font-semibold opacity-50 hover:opacity-100"
              >刪除</button>
            </div>
            <div className="num text-[28px] font-extrabold mt-2">
              <span className="text-[14px] font-semibold mr-1" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>NT$</span>
              {fmtMoney(balances.get(a.id) ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddAccountModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [initialBalance, setInitialBalance] = useState('0');

  async function submit() {
    if (!name.trim()) return;
    await db.accounts.add({
      id: uid(),
      name: name.trim(),
      type,
      currency: 'TWD',
      initialBalance: parseFloat(initialBalance) || 0,
      createdAt: now(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)' }} />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[480px] rounded-t-3xl px-5 pt-4 pb-8" style={{ background: 'var(--bg-base)' }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--hairline-2)' }} />
        <h2 className="text-[18px] font-bold mb-4">新增帳戶</h2>

        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2 block" style={{ color: 'var(--text-ink-2)' }}>名稱</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：國泰存款"
          className="w-full px-3 py-3 mb-4 rounded-xl text-[14px] outline-none"
          style={{ background: 'var(--bg-subtle)' }}
        />

        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2 block" style={{ color: 'var(--text-ink-2)' }}>類型</label>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="py-2.5 rounded-full text-[12px] font-semibold"
              style={{
                background: type === t ? 'var(--accent)' : 'var(--bg-subtle)',
                color: type === t ? 'var(--accent-fg)' : 'var(--text-ink)',
              }}
            >{TYPE_LABEL[t]}</button>
          ))}
        </div>

        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2 block" style={{ color: 'var(--text-ink-2)' }}>起始餘額</label>
        <input
          type="number"
          inputMode="decimal"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          className="w-full px-3 py-3 mb-5 rounded-xl text-[14px] num outline-none"
          style={{ background: 'var(--bg-subtle)' }}
        />

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full py-4 rounded-2xl text-[15px] font-bold disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >新增</button>
      </div>
    </div>
  );
}

async function deleteAccount(id: string) {
  if (!confirm('確定刪除此帳戶？相關紀錄會保留但需重新指定帳戶。')) return;
  await db.accounts.delete(id);
}

function computeBalances(
  accounts: { id: string; initialBalance: number }[],
  txs: { kind: string; amount: number; accountId: string; toAccountId?: string }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of accounts) m.set(a.id, a.initialBalance);
  for (const t of txs) {
    if (t.kind === 'income') m.set(t.accountId, (m.get(t.accountId) ?? 0) + t.amount);
    else if (t.kind === 'expense') m.set(t.accountId, (m.get(t.accountId) ?? 0) - t.amount);
    else if (t.kind === 'transfer' && t.toAccountId) {
      m.set(t.accountId, (m.get(t.accountId) ?? 0) - t.amount);
      m.set(t.toAccountId, (m.get(t.toAccountId) ?? 0) + t.amount);
    }
  }
  return m;
}
