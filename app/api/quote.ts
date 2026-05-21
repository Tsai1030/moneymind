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

async function fetchYahoo(yahooSymbol: string): Promise<{
  price: number | null;
  currency: string | null;
  resolvedSymbol: string | null;
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      // Yahoo blocks requests with no UA or default fetch UA
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    return { price: null, currency: null, resolvedSymbol: null };
  }
  const data: any = await res.json();
  const r = data?.chart?.result?.[0];
  if (!r) return { price: null, currency: null, resolvedSymbol: null };
  return {
    price: typeof r.meta?.regularMarketPrice === 'number' ? r.meta.regularMarketPrice : null,
    currency: r.meta?.currency ?? null,
    resolvedSymbol: r.meta?.symbol ?? null,
  };
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol');
  const market = (url.searchParams.get('market') ?? 'US') as Market;

  if (!symbol) {
    return json({ error: 'symbol required' }, 400);
  }

  try {
    // Try primary symbol first
    let result = await fetchYahoo(buildYahooSymbol(symbol, market));

    // For TW, if .TW fails (price null), try .TWO (OTC / 上櫃)
    if (market === 'TW' && result.price === null && !symbol.includes('.')) {
      result = await fetchYahoo(`${symbol.toUpperCase()}.TWO`);
    }

    if (result.price === null) {
      return json({ error: 'not_found', symbol }, 404);
    }

    return new Response(
      JSON.stringify({
        symbol: result.resolvedSymbol,
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
