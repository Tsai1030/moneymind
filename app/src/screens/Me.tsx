import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { db, now } from '../db';
import { useUI } from '../state/useUI';
import { fmtMoney } from '../lib/format';
import { CuteCat } from '../cat/CuteCat';

export function Me() {
  const { theme, setTheme, month } = useUI();
  const budget = useLiveQuery(() => db.budgets.get(month), [month]);
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const expenseCats = categories.filter((c) => c.name !== '收入').sort((a, b) => a.order - b.order);
  const [budgetInput, setBudgetInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [perCatOpen, setPerCatOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const totalCount = useLiveQuery(async () => {
    const all = await db.transactions.toArray();
    return all.filter((t) => !t.deletedAt).length;
  }) ?? 0;

  async function saveBudget() {
    const amount = parseFloat(budgetInput);
    if (!Number.isFinite(amount) || amount < 0) return;
    await db.budgets.put({
      id: month,
      month,
      totalAmount: amount,
      perCategory: budget?.perCategory ?? {},
      updatedAt: now(),
    });
    setEditing(false);
    setBudgetInput('');
  }

  async function savePerCategory(catId: string, raw: string) {
    const n = parseFloat(raw);
    const next = { ...(budget?.perCategory ?? {}) };
    if (!Number.isFinite(n) || n <= 0) delete next[catId];
    else next[catId] = n;
    await db.budgets.put({
      id: month,
      month,
      totalAmount: budget?.totalAmount ?? 0,
      perCategory: next,
      updatedAt: now(),
    });
  }

  async function exportData() {
    const dump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: await db.accounts.toArray(),
      categories: await db.categories.toArray(),
      transactions: await db.transactions.toArray(),
      budgets: await db.budgets.toArray(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneymind-backup-${dayjs().format('YYYY-MM-DD-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('匯入會「合併」現有資料（同 id 會覆蓋）。要繼續嗎？')) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.transaction('rw', db.accounts, db.categories, db.transactions, db.budgets, async () => {
        if (Array.isArray(data.accounts)) await db.accounts.bulkPut(data.accounts);
        if (Array.isArray(data.categories)) await db.categories.bulkPut(data.categories);
        if (Array.isArray(data.transactions)) await db.transactions.bulkPut(data.transactions);
        if (Array.isArray(data.budgets)) await db.budgets.bulkPut(data.budgets);
      });
      setImportMsg('匯入完成');
      setTimeout(() => setImportMsg(null), 3000);
    } catch (err) {
      setImportMsg(`匯入失敗：${(err as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="px-6 pt-4 pb-3">
        <h1 className="text-[22px] font-extrabold tracking-tight">我的</h1>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden px-5 pb-2">
        {/* Budget */}
        <section className="p-4 mb-2 rounded-3xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-ink-2)' }}>
            {dayjs(`${month}-01`).format('YYYY 年 M 月')} 預算
          </div>
          {editing ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder={String(budget?.totalAmount ?? 0)}
                className="flex-1 px-3 py-3 rounded-xl num text-[16px] outline-none"
                style={{ background: 'var(--bg-subtle)' }}
              />
              <button onClick={saveBudget} className="px-5 rounded-xl font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>儲存</button>
              <button onClick={() => { setEditing(false); setBudgetInput(''); }} className="px-3 rounded-xl font-semibold" style={{ background: 'var(--bg-subtle)' }}>取消</button>
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <div className="num text-[32px] font-extrabold leading-none">
                <span className="text-[14px] font-semibold mr-1" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>NT$</span>
                {budget?.totalAmount ? fmtMoney(budget.totalAmount) : '未設定'}
              </div>
              <button onClick={() => { setEditing(true); setBudgetInput(String(budget?.totalAmount ?? '')); }} className="text-[13px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>編輯</button>
            </div>
          )}

          <button
            onClick={() => setPerCatOpen((s) => !s)}
            className="mt-3 -mb-1 flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: 'var(--text-ink-2)' }}
          >
            <span
              className="inline-block w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] transition-transform"
              style={{
                borderColor: 'var(--text-ink-2)',
                transform: perCatOpen ? 'rotate(45deg) translate(-1px, -1px)' : 'rotate(-45deg) translate(1px, 1px)',
              }}
            />
            子預算（分類）
            <span style={{ color: 'var(--text-ink-3)' }}>
              {' · '}{Object.values(budget?.perCategory ?? {}).filter((v) => v > 0).length} / {expenseCats.length}
            </span>
          </button>
          <div
            className="overflow-hidden"
            style={{
              maxHeight: perCatOpen ? 1000 : 0,
              opacity: perCatOpen ? 1 : 0,
              transition: 'max-height 280ms ease, opacity 200ms ease',
            }}
          >
            <div className="pt-3 mt-2 border-t" style={{ borderColor: 'var(--hairline)' }}>
              {expenseCats.map((c) => (
                <PerCatRow
                  key={c.id}
                  cat={c}
                  value={budget?.perCategory?.[c.id] ?? 0}
                  onSave={(v) => savePerCategory(c.id, v)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Theme */}
        <section className="p-4 mb-2 rounded-3xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-ink-2)' }}>外觀</div>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold"
                style={{
                  background: theme === t ? 'var(--accent)' : 'var(--bg-subtle)',
                  color: theme === t ? 'var(--accent-fg)' : 'var(--text-ink)',
                }}
              >{t === 'light' ? '淺色' : '深色'}</button>
            ))}
          </div>
        </section>

        {/* Backup */}
        <section className="p-4 mb-2 rounded-3xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-ink-2)' }}>備份與還原</div>
          <div className="text-[12px] mb-2" style={{ color: 'var(--text-ink-2)' }}>共 {totalCount} 筆紀錄</div>
          <div className="flex gap-2">
            <button onClick={exportData} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-subtle)' }}>
              匯出 JSON
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-subtle)' }}>
              匯入 JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </div>
          {importMsg && <div className="text-[12px] mt-2" style={{ color: 'var(--color-brand-deep)' }}>{importMsg}</div>}
        </section>

        <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0">
          <CuteCat size={200} />
          <div className="text-[11px]" style={{ color: 'var(--text-ink-3)', marginTop: -18 }}>
            <div>MoneyMind · v0.1.0</div>
            <a
              href="https://github.com/Tsai1030"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              style={{ color: 'var(--text-ink-2)' }}
            >
              github.com/Tsai1030
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerCatRow({
  cat, value, onSave,
}: {
  cat: { id: string; name: string; icon: string };
  value: number;
  onSave: (v: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(value > 0 ? String(value) : '');
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="w-7 h-7 rounded-lg grid place-items-center text-[14px] shrink-0" style={{ background: 'var(--bg-subtle)' }}>
        {cat.icon}
      </div>
      <div className="text-[13px] font-semibold flex-1 truncate">{cat.name}</div>
      <span className="text-[11px]" style={{ color: 'var(--text-ink-3)' }}>NT$</span>
      <input
        type="number"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = parseFloat(draft);
          const current = value;
          if ((!Number.isFinite(next) || next <= 0) && current === 0) return;
          if (next === current) return;
          void onSave(draft);
        }}
        placeholder="未設"
        className="w-20 px-2 py-1.5 rounded-lg num text-[13px] text-right outline-none"
        style={{ background: 'var(--bg-subtle)' }}
      />
    </div>
  );
}
