import { NextRequest, NextResponse } from 'next/server';
import { getQuote as angelQuote } from '@/lib/angelone';
import { getQuote as yahooQuote } from '@/lib/yahoo';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker?.toUpperCase();
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  // Try Angel One (real-time NSE, covers all stocks via scrip-tokens.json)
  try {
    const data = await angelQuote(ticker);
    if (data.regularMarketPrice > 0) {
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
      });
    }
  } catch { /* fall through */ }

  // Yahoo Finance fallback (has P/E, market cap, fundamentals — Angel One doesn't)
  try {
    const data = await yahooQuote(ticker);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch quote';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
