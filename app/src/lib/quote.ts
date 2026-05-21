import type { Market } from '../db/schema';

export interface QuoteResult {
  symbol: string | null;
  price: number;
  currency: string | null;
  fetchedAt: number;
}

export async function fetchQuote(symbol: string, market: Market): Promise<QuoteResult | null> {
  try {
    const url = `/api/quote?symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(market)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.price !== 'number') return null;
    return {
      symbol: data.symbol ?? null,
      price: data.price,
      currency: data.currency ?? null,
      fetchedAt: data.fetchedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}
