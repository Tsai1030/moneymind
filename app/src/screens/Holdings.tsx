import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { db, uid, now } from '../db';
import type { Holding, Market } from '../db/schema';
import { fmtMoney } from '../lib/format';
import { fetchQuote } from '../lib/quote';
import { BottomSheet } from '../components/BottomSheet';

const MARKET_LABEL: Record<Market, string> = {
  TW: '台股', US: '美股', crypto: '加密', other: '其他',
};
const MARKET_OPTIONS: Market[] = ['TW', 'US', 'crypto', 'other'];

export function HoldingsPanel() {
  const holdings = useLiveQuery(async () => {
    const all = await db.holdings.toArray();
    return all.filter((h) => !h.deletedAt).sort((a, b) => b.createdAt - a.createdAt);
  }) ?? [];
  const [editing, setEditing] = useState<Holding | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const autoFetchedRef = useRef(false);

  const totalCost = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);
  const totalValue = holdings.reduce((s, h) => s + h.shares * (h.currentPrice ?? h.avgCost), 0);
  const pl = totalValue - totalCost;
  const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;

  const oldestUpdate = holdings.length > 0
    ? Math.min(...holdings.map((h) => h.priceUpdatedAt ?? 0).filter((t) => t > 0))
    : 0;

  async function refreshPrices(force: boolean) {
    if (refreshing) return;
    if (holdings.length === 0) return;
    setRefreshing(true);
    const STALE_MS = 5 * 60 * 1000;
    const tasks = holdings.map(async (h) => {
      const stale = !h.priceUpdatedAt || Date.now() - h.priceUpdatedAt > STALE_MS;
      if (!force && !stale) return;
      const q = await fetchQuote(h.symbol, h.market);
      if (q && q.price > 0) {
        await db.holdings.update(h.id, {
          currentPrice: q.price,
          priceUpdatedAt: q.fetchedAt,
          updatedAt: now(),
        });
      }
    });
    await Promise.all(tasks);
    setRefreshing(false);
  }

  // Auto-fetch once when panel mounts and holdings have loaded
  useEffect(() => {
    if (holdings.length === 0 || autoFetchedRef.current) return;
    autoFetchedRef.current = true;
    void refreshPrices(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length]);

  return (
    <>
      {/* Summary card */}
      <div className="mx-5 mb-4 p-5 rounded-3xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-ink-2)' }}>持倉總市值</div>
          <button
            onClick={() => refreshPrices(true)}
            disabled={refreshing || holdings.length === 0}
            className="text-[11px] font-semibold px-3 py-1 rounded-full disabled:opacity-40 flex items-center gap-1"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-ink-2)' }}
          >
            <span className={refreshing ? 'inline-block animate-spin' : ''}>⟳</span>
            {refreshing ? '更新中' : '更新報價'}
          </button>
        </div>
        <div className="num text-[32px] font-extrabold leading-none">
          <span className="text-[14px] font-semibold mr-1" style={{ color: 'var(--text-ink-2)', letterSpacing: 0 }}>NT$</span>
          {fmtMoney(totalValue)}
        </div>
        <div className="flex justify-between mt-3 text-[12px]">
          <span style={{ color: 'var(--text-ink-2)' }}>成本 <b className="num" style={{ color: 'var(--text-ink)' }}>{fmtMoney(totalCost)}</b></span>
          {totalCost > 0 && (
            <span className="num font-semibold" style={{ color: pl >= 0 ? 'var(--color-brand-deep)' : 'var(--color-danger)' }}>
              {pl >= 0 ? '+' : '−'}{fmtMoney(pl)} ({pl >= 0 ? '+' : '−'}{Math.abs(plPct).toFixed(1)}%)
            </span>
          )}
        </div>
        {oldestUpdate > 0 && (
          <div className="text-[10px] mt-2 text-right" style={{ color: 'var(--text-ink-3)' }}>
            報價更新於 {dayjs(oldestUpdate).format('M/D HH:mm')}
          </div>
        )}
      </div>

      <div className="px-7 mb-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-ink-3)' }}>
        <span>持倉</span>
        <button onClick={() => setShowAdd(true)} className="text-[11px] tracking-normal px-3 py-1 rounded-full"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-ink-2)' }}>＋ 新增</button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-clean px-5 pb-4">
        {holdings.length === 0 ? (
          <div className="px-6 pt-10 pb-10 text-center" style={{ color: 'var(--text-ink-3)' }}>
            <div className="text-[40px] mb-2">📈</div>
            <div className="text-[14px] font-medium">還沒記錄任何持倉</div>
            <div className="text-[12px] mt-1.5">點上方「＋ 新增」加入第一筆</div>
          </div>
        ) : (
          holdings.map((h) => {
            const cost = h.shares * h.avgCost;
            const value = h.shares * (h.currentPrice ?? h.avgCost);
            const pl = value - cost;
            const hasMarket = h.currentPrice != null;
            return (
              <button
                key={h.id}
                onClick={() => setEditing(h)}
                className="w-full text-left p-4 mb-2.5 rounded-2xl border active:scale-[0.99] transition"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--hairline)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-ink-2)' }}>
                      {MARKET_LABEL[h.market]}
                    </span>
                    <span className="text-[15px] font-bold">{h.symbol}</span>
                    {h.name && <span className="text-[12px]" style={{ color: 'var(--text-ink-2)' }}>{h.name}</span>}
                  </div>
                  <span className="num text-[15px] font-bold">{fmtMoney(value)}</span>
                </div>
                <div className="flex justify-between text-[12px] num" style={{ color: 'var(--text-ink-2)' }}>
                  <span>{h.shares} 股 × {h.avgCost.toLocaleString()} {h.currency}</span>
                  {hasMarket && (
                    <span style={{ color: pl >= 0 ? 'var(--color-brand-deep)' : 'var(--color-danger)' }}>
                      {pl >= 0 ? '+' : '−'}{fmtMoney(pl)}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <HoldingModal
        open={showAdd || !!editing}
        holding={editing}
        onClose={() => { setShowAdd(false); setEditing(null); }}
      />
    </>
  );
}

function HoldingModal({ open, holding, onClose }: { open: boolean; holding: Holding | null; onClose: () => void }) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [market, setMarket] = useState<Market>('TW');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState<'TWD' | 'USD'>('TWD');

  useEffect(() => {
    if (!open) return;
    if (holding) {
      setSymbol(holding.symbol);
      setName(holding.name);
      setMarket(holding.market);
      setShares(String(holding.shares));
      setAvgCost(String(holding.avgCost));
      setCurrentPrice(holding.currentPrice ? String(holding.currentPrice) : '');
      setCurrency(holding.currency);
    } else {
      setSymbol(''); setName(''); setMarket('TW');
      setShares(''); setAvgCost(''); setCurrentPrice(''); setCurrency('TWD');
    }
  }, [open, holding]);

  function handleClose() {
    onClose();
  }

  async function submit() {
    if (!symbol.trim() || !shares || !avgCost) return;
    const data = {
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim().toUpperCase(),
      market,
      shares: parseFloat(shares) || 0,
      avgCost: parseFloat(avgCost) || 0,
      currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
      currency,
      updatedAt: now(),
    };
    if (holding) {
      await db.holdings.update(holding.id, data);
    } else {
      await db.holdings.add({ ...data, id: uid(), createdAt: now() });
    }
    handleClose();
  }

  async function handleDelete() {
    if (!holding) return;
    if (!confirm(`刪除 ${holding.symbol} ?`)) return;
    await db.holdings.update(holding.id, { deletedAt: now(), updatedAt: now() });
    handleClose();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={holding ? '編輯持倉' : '新增持倉'}>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {MARKET_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => { setMarket(m); setCurrency(m === 'US' ? 'USD' : 'TWD'); }}
              className="py-2.5 rounded-full text-[12px] font-semibold"
              style={{
                background: market === m ? 'var(--accent)' : 'var(--bg-subtle)',
                color: market === m ? 'var(--accent-fg)' : 'var(--text-ink)',
              }}
            >{MARKET_LABEL[m]}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="代號" value={symbol} onChange={setSymbol} placeholder="2330" />
          <Field label="名稱" value={name} onChange={setName} placeholder="台積電" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="股數" value={shares} onChange={setShares} placeholder="100" type="number" />
          <Field label={`成交均價 (${currency})`} value={avgCost} onChange={setAvgCost} placeholder="850" type="number" />
        </div>

        <Field label={`市價 ${currency} (留空自動抓取)`} value={currentPrice} onChange={setCurrentPrice} placeholder="開啟頁面會自動更新" type="number" />

        <div className="flex gap-2 pt-2">
          {holding && (
            <button
              onClick={handleDelete}
              className="flex-1 py-3.5 rounded-full text-[14px] font-bold"
              style={{ background: 'var(--bg-subtle)', color: 'var(--color-danger)' }}
            >刪除</button>
          )}
          <button
            onClick={submit}
            disabled={!symbol.trim() || !shares || !avgCost}
            className="flex-1 py-3.5 rounded-full text-[14px] font-bold disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >{holding ? '儲存' : '新增'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 block" style={{ color: 'var(--text-ink-2)' }}>{label}</label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[14px] num"
      />
    </div>
  );
}
