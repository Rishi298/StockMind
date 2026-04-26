import { NextRequest, NextResponse } from 'next/server';
import { getHistory as angelHistory } from '@/lib/angelone';
import { getHistory as yahooHistory } from '@/lib/yahoo';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    const symbol = ticker.toUpperCase();
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') as '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y') ?? '1y';

    // Try Angel One first only if a full session token (from TOTP login) is stored in DB.
    // The env ANGEL_ONE_API_TOKEN is an API-key JWT that only covers market data, not candle history.
    const sessionRecord = await prisma.settings.findUnique({ where: { key: 'angel_one_jwt' } });
    if (sessionRecord?.value) {
      try {
        const data = await angelHistory(symbol, period);
        if (data.length > 0) {
          return NextResponse.json(data, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
          });
        }
      } catch { /* fall through to Yahoo Finance */ }
    }

    // Yahoo Finance fallback — works for all listed stocks, single request = no rate limit issue
    const data = await yahooHistory(symbol, period);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
