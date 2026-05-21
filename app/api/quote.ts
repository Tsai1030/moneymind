// Vercel Edge Function: proxy Yahoo Finance quote
// Frontend calls /api/quote?symbol=2330&market=TW
// Avoids CORS by fetching from server-side.

export const config = { runtime: 'edge' };

type Market = 'TW' | 'US' | 'crypto' | 'other';

function buildYahooSymbol(symbol: string, market: Market): string {
  const s = symbol.trim().toUpperCase();
  switch (market) {
    case 'TW':
      // Append .TW for listed, fallback to .TWO (OTC) handled by caller
      return s.endsWith('.TW') || s.endsWith('.TWO') ? s : `${s}.TW`;
    case 'crypto':
      return s.includes('-') ? s : `${s}-USD`;
    case 'US':
    case 'other':
    default:
      return s;
  }
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// ──────────────────────────────────────────────────────────────
// Taiwan stock Chinese names (TWSE 上市 + TPEx 上櫃)
// ──────────────────────────────────────────────────────────────
const TWSE_LIST_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const TPEX_LIST_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes';

// Module-level cache (survives across invocations within the same edge isolate).
let twMapCache: { map: Map<string, string>; expiresAt: number } | null = null;
const ONE_DAY = 24 * 60 * 60 * 1000;

async function getTWStockNameMap(): Promise<Map<string, string>> {
  if (twMapCache && twMapCache.expiresAt > Date.now()) return twMapCache.map;

  const fetchJson = async (url: string): Promise<any[]> => {
    try {
      const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': UA } });
      if (!r.ok) return [];
      const j: unknown = await r.json();
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  };

  const [tse, tpex] = await Promise.all([fetchJson(TWSE_LIST_URL), fetchJson(TPEX_LIST_URL)]);
  const map = new Map<string, string>();

  for (const c of tse) {
    const code = String(c?.Code ?? '').trim();
    const name = String(c?.Name ?? '').trim();
    if (code && name) map.set(code, name);
  }
  for (const c of tpex) {
    const code = String(c?.SecuritiesCompanyCode ?? '').trim();
    const name = String(c?.CompanyName ?? '').trim();
    if (code && name && !map.has(code)) map.set(code, name);
  }

  // Cache even an empty map (avoid hammering on failure) but with shorter TTL.
  const ttl = map.size > 0 ? ONE_DAY : 60_000;
  twMapCache = { map, expiresAt: Date.now() + ttl };
  return map;
}

async function fetchYahooChart(yahooSymbol: string): Promise<{
  price: number | null;
  currency: string | null;
  resolvedSymbol: string | null;
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
  });
  if (!res.ok) return { price: null, currency: null, resolvedSymbol: null };
  const data: any = await res.json();
  const r = data?.chart?.result?.[0];
  if (!r) return { price: null, currency: null, resolvedSymbol: null };
  return {
    price: typeof r.meta?.regularMarketPrice === 'number' ? r.meta.regularMarketPrice : null,
    currency: r.meta?.currency ?? null,
    resolvedSymbol: r.meta?.symbol ?? null,
  };
}

async function fetchYahooName(yahooSymbol: string): Promise<string | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSymbol)}&quotesCount=1&newsCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const q = data?.quotes?.find((x: any) => x?.symbol === yahooSymbol) ?? data?.quotes?.[0];
    return q?.longname || q?.shortname || null;
  } catch {
    return null;
  }
}

async function fetchYahoo(yahooSymbol: string) {
  const [chart, name] = await Promise.all([
    fetchYahooChart(yahooSymbol),
    fetchYahooName(yahooSymbol),
  ]);
  return { ...chart, name };
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol');
  const market = (url.searchParams.get('market') ?? 'US') as Market;

  if (!symbol) {
    return json({ error: 'symbol required' }, 400);
  }

  try {
    let result = await fetchYahoo(buildYahooSymbol(symbol, market));

    // For TW, if .TW fails (price null), try .TWO (OTC / 上櫃)
    if (market === 'TW' && result.price === null && !symbol.includes('.')) {
      result = await fetchYahoo(`${symbol.toUpperCase()}.TWO`);
    }

    if (result.price === null) {
      return json({ error: 'not_found', symbol }, 404);
    }

    // For TW market, prefer Chinese short name from TWSE/TPEx official lists.
    let displayName = result.name;
    if (market === 'TW') {
      const code = symbol.trim().toUpperCase().replace(/\.(TW|TWO)$/, '');
      const twMap = await getTWStockNameMap();
      const chineseName = twMap.get(code);
      if (chineseName) displayName = chineseName;
    }

    return new Response(
      JSON.stringify({
        symbol: result.resolvedSymbol,
        name: displayName,
        price: result.price,
        currency: result.currency,
        fetchedAt: Date.now(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Cache 60s at the edge, allow stale serving for 5min
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (e) {
    return json({ error: 'upstream_failed', message: String(e) }, 502);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
