import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { db } from '../db';
import { addTransaction, updateTransaction } from '../db/queries';
import { useUI } from '../state/useUI';
import { DeleteIcon, PlusIcon, CardIcon } from './Icons';
import { DatePicker } from './DatePicker';

type Kind = 'expense' | 'income';

const today = () => dayjs().format('YYYY-MM-DD');

function formatDateLabel(d: string): string {
  const t = today();
  const y = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  if (d === t) return '今天';
  if (d === y) return '昨天';
  return dayjs(d).format('M/D');
}

export function QuickInputSheet() {
  const { inputOpen, closeInput, editingTxId } = useUI();
  const editingTx = useLiveQuery(
    async () => (editingTxId ? await db.transactions.get(editingTxId) : undefined),
    [editingTxId],
  );
  const isEditing = !!editingTxId;

  const [amount, setAmount] = useState('0');
  const [kind, setKind] = useState<Kind>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const allCategories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];

  const expenseCats = useMemo(() => allCategories.filter((c) => c.name !== '收入').sort((a, b) => a.order - b.order).slice(0, 8), [allCategories]);
  const incomeCats = useMemo(() => allCategories.filter((c) => c.name === '收入'), [allCategories]);
  const visibleCats = kind === 'expense' ? expenseCats : incomeCats;

  // Reset state when opening (new entry path)
  useEffect(() => {
    if (inputOpen && !editingTxId) {
      setAmount('0');
      setKind('expense');
      setNote('');
      setDate(today());
      setShowAccountPicker(false);
      setShowNoteEditor(false);
    }
  }, [inputOpen, editingTxId]);

  // Prefill from existing tx when editing
  useEffect(() => {
    if (inputOpen && editingTx) {
      setAmount(String(editingTx.amount));
      setKind(editingTx.kind === 'income' ? 'income' : 'expense');
      setCategoryId(editingTx.categoryId);
      setAccountId(editingTx.accountId);
      setNote(editingTx.note ?? '');
      setDate(editingTx.date);
      setShowAccountPicker(false);
      setShowNoteEditor(false);
    }
  }, [inputOpen, editingTx]);

  // Sensible defaults once data loads
  useEffect(() => {
    if (inputOpen && !categoryId && visibleCats.length) setCategoryId(visibleCats[0].id);
  }, [inputOpen, categoryId, visibleCats]);
  useEffect(() => {
    if (inputOpen && !accountId && accounts.length) setAccountId(accounts[0].id);
  }, [inputOpen, accountId, accounts]);

  // Reset category when switching kind
  useEffect(() => {
    if (visibleCats.length) setCategoryId(visibleCats[0].id);
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock background scroll when sheet open
  useEffect(() => {
    if (inputOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [inputOpen]);

  if (!inputOpen) return null;

  const numericAmount = parseFloat(amount) || 0;
  const canSubmit = numericAmount > 0 && !!categoryId && !!accountId;

  function pressKey(k: string) {
    if (k === '⌫') {
      setAmount((a) => (a.length <= 1 ? '0' : a.slice(0, -1)));
      return;
    }
    if (k === '.') {
      setAmount((a) => (a.includes('.') ? a : a + '.'));
      return;
    }
    setAmount((a) => {
      if (a === '0') return k;
      // Clamp at 12 chars
      if (a.length >= 12) return a;
      // Limit decimals to 2 places
      if (a.includes('.') && a.split('.')[1].length >= 2) return a;
      return a + k;
    });
  }

  async function submit() {
    if (!canSubmit) return;
    if (isEditing && editingTxId) {
      await updateTransaction(editingTxId, {
        kind,
        amount: numericAmount,
        categoryId: categoryId!,
        accountId: accountId!,
        note: note.trim() || undefined,
        date,
      });
    } else {
      await addTransaction({
        kind,
        amount: numericAmount,
        categoryId: categoryId!,
        accountId: accountId!,
        note: note.trim() || undefined,
        date,
      });
    }
    closeInput();
  }

  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

  return (
    <div className="fixed inset-0 z-50 flex justify-center" onClick={closeInput}>
      <div className="absolute inset-0" style={{ background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)' }} />
      <div className="relative w-full max-w-[480px] flex items-end">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-t-3xl px-5 pt-2.5 pb-6 flex flex-col"
          style={{ background: 'var(--bg-base)', boxShadow: '0 -20px 60px -10px rgba(0,0,0,0.25)', maxHeight: '90dvh' }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: 'var(--hairline-2)' }} />
          {isEditing && (
            <div className="text-center text-[12px] font-bold uppercase tracking-[0.16em] mb-2.5" style={{ color: 'var(--color-brand-deep)' }}>
              編輯紀錄
            </div>
          )}

          {/* Type toggle */}
          <div className="flex p-1 rounded-xl mb-4" style={{ background: 'var(--bg-subtle)' }}>
            {(['expense', 'income'] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition"
                style={{
                  background: kind === k ? 'var(--bg-base)' : 'transparent',
                  color: kind === k ? 'var(--text-ink)' : 'var(--text-ink-2)',
                  boxShadow: kind === k ? '0 1px 3px rgba(10,10,10,0.08)' : 'none',
                }}
              >
                {k === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="text-center mb-3.5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--text-ink-2)' }}>
              NT$
            </div>
            <div className="num text-[52px] font-extrabold leading-none">
              {amount === '0' ? '0' : Number(amount.split('.')[0] || 0).toLocaleString('en-US') + (amount.includes('.') ? '.' + (amount.split('.')[1] ?? '') : '')}
            </div>
          </div>

          {/* Category grid */}
          <div className="grid grid-cols-4 gap-2 mb-3.5">
            {visibleCats.map((c) => {
              const selected = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border-[1.5px] transition"
                  style={{
                    background: selected ? 'var(--color-brand-soft)' : 'var(--bg-subtle)',
                    borderColor: selected ? 'var(--color-brand)' : 'transparent',
                    color: selected ? 'var(--color-brand-deep)' : 'var(--text-ink-2)',
                  }}
                >
                  <span className="text-[22px] leading-none">{c.icon}</span>
                  <span className="text-[11px] font-semibold">{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Meta: date + account + note (pill style) */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDatePickerOpen(true)}
              className="flex-1 py-2.5 rounded-full text-[12px] font-semibold flex items-center justify-center gap-1.5"
              style={{
                background: date === today() ? 'var(--bg-subtle)' : 'var(--color-brand-soft)',
                color: date === today() ? 'var(--text-ink)' : 'var(--color-brand-deep)',
              }}
            >
              📅 {formatDateLabel(date)}
            </button>
            <button
              onClick={() => setShowAccountPicker((s) => !s)}
              className="flex-1 py-2.5 rounded-full text-[12px] font-semibold flex items-center justify-center gap-1.5"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <CardIcon width={14} height={14} />
              {accounts.find((a) => a.id === accountId)?.name ?? '帳戶'}
            </button>
            <button
              onClick={() => setShowNoteEditor(true)}
              className="flex-1 py-2.5 rounded-full text-[12px] font-semibold flex items-center justify-center gap-1.5"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <PlusIcon width={14} height={14} />
              {note.trim() ? '✓' : '備註'}
            </button>
          </div>

          {showAccountPicker && (
            <div className="mb-3 p-2 rounded-2xl flex flex-wrap gap-1.5" style={{ background: 'var(--bg-subtle)' }}>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setAccountId(a.id); setShowAccountPicker(false); }}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    background: accountId === a.id ? 'var(--accent)' : 'var(--bg-base)',
                    color: accountId === a.id ? 'var(--accent-fg)' : 'var(--text-ink)',
                  }}
                >{a.name}</button>
              ))}
            </div>
          )}

          {showNoteEditor && (
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => setShowNoteEditor(false)}
              onKeyDown={(e) => e.key === 'Enter' && setShowNoteEditor(false)}
              placeholder="例如：午餐 · 星巴克"
              className="mb-3 px-3 py-2.5 rounded-xl text-[14px] outline-none"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-ink)' }}
            />
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => pressKey(k)}
                className="h-12 rounded-xl text-[22px] font-semibold num grid place-items-center active:scale-[0.97] transition"
                style={{ background: k === '⌫' ? 'transparent' : 'var(--bg-subtle)' }}
              >
                {k === '⌫' ? <DeleteIcon /> : k}
              </button>
            ))}
          </div>

          {/* Confirm */}
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl text-[15px] font-bold tracking-wide disabled:opacity-40 active:scale-[0.99] transition"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {isEditing ? '儲存變更' : '完成'}
          </button>
        </div>
      </div>

      <DatePicker
        open={datePickerOpen}
        value={date}
        onChange={setDate}
        onClose={() => setDatePickerOpen(false)}
      />
    </div>
  );
}
