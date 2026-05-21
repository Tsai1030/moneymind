import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { db } from '../db';
import { softDeleteTransaction } from '../db/queries';
import { useUI } from '../state/useUI';
import { fmtMoney } from '../lib/format';
import { BottomSheet } from './BottomSheet';

export function TransactionDetail() {
  const { detailTxId, closeDetail, openInputForEdit } = useUI();

  const tx = useLiveQuery(
    async () => (detailTxId ? await db.transactions.get(detailTxId) : undefined),
    [detailTxId],
  );
  const cat = useLiveQuery(
    async () => (tx ? await db.categories.get(tx.categoryId) : undefined),
    [tx?.categoryId],
  );
  const acct = useLiveQuery(
    async () => (tx ? await db.accounts.get(tx.accountId) : undefined),
    [tx?.accountId],
  );

  async function handleDelete() {
    if (!tx) return;
    if (!confirm('確定刪除這筆紀錄？')) return;
    await softDeleteTransaction(tx.id);
    closeDetail();
  }

  return (
    <BottomSheet open={!!detailTxId} onClose={closeDetail}>
      {tx ? (
        <>
          <div className="flex flex-col items-center pt-2 pb-5">
            <div className="w-16 h-16 rounded-2xl grid place-items-center text-[32px] mb-3" style={{ background: 'var(--bg-subtle)' }}>
              {cat?.icon ?? '·'}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-ink-2)' }}>{cat?.name ?? '未分類'}</div>
            <div className="mt-2 num text-[40px] font-extrabold leading-none">
              <span className="text-[16px] font-semibold mr-1.5" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>NT$</span>
              <span style={{ color: tx.kind === 'income' ? 'var(--color-brand-deep)' : 'var(--text-ink)' }}>
                {tx.kind === 'income' ? '+' : '−'}{fmtMoney(tx.amount)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border divide-y mb-5" style={{ borderColor: 'var(--hairline)' }}>
            <DetailRow label="日期" value={dayjs(tx.date).format('YYYY/M/D (dd)')} />
            <DetailRow label="帳戶" value={acct?.name ?? '·'} />
            {tx.note && <DetailRow label="備註" value={tx.note} />}
            <DetailRow label="建立時間" value={dayjs(tx.createdAt).format('YYYY/M/D HH:mm')} small />
            {tx.updatedAt !== tx.createdAt && (
              <DetailRow label="最後修改" value={dayjs(tx.updatedAt).format('YYYY/M/D HH:mm')} small />
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 py-3.5 rounded-full text-[14px] font-bold"
              style={{ background: 'var(--bg-subtle)', color: 'var(--color-danger)' }}
            >刪除</button>
            <button
              onClick={() => openInputForEdit(tx.id)}
              className="flex-1 py-3.5 rounded-full text-[14px] font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >編輯</button>
          </div>
        </>
      ) : (
        <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-ink-3)' }}>載入中…</div>
      )}
    </BottomSheet>
  );
}

function DetailRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ borderColor: 'var(--hairline)' }}>
      <div className={small ? 'text-[12px]' : 'text-[13px] font-semibold'} style={{ color: 'var(--text-ink-2)' }}>{label}</div>
      <div className={small ? 'text-[12px] num' : 'text-[14px] font-semibold num'}>{value}</div>
    </div>
  );
}
