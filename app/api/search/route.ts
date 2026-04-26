import { NextRequest, NextResponse } from 'next/server';
import { cacheToken } from '@/lib/angelone';
import { STOCK_UNIVERSE } from '@/lib/universe';

export interface SearchResult {
  ticker: string;
  name: string;
  token: string;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') || '';
  const q = raw.toUpperCase().trim();
  if (q.length < 2) return NextResponse.json([]);

  // Static universe search — always works, never fails
  const universeMatches: SearchResult[] = STOCK_UNIVERSE
    .filter((s) => s.ticker.startsWith(q) || s.name.toUpperCase().includes(q))
    .slice(0, 6)
    .map((s) => ({ ticker: s.ticker, name: s.name, token: '' }));

  const universeTickers = new Set(universeMatches.map((s) => s.ticker));

  // Angel One searchScrip — for mid/small caps not in static universe
  let apiMatches: SearchResult[] = [];
  try {
    const result = await fetch(
      `${process.env.ANGEL_ONE_API_BASE}/rest/secure/angelbroking/order/v1/searchScrip`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ANGEL_ONE_API_TOKEN || ''}`,
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-PrivateKey': process.env.NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID || '',
          'X-MACaddress': '00:00:00:00:00:00',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '0.0.0.0',
        },
        body: JSON.stringify({ exchange: 'NSE', searchscrip: q }),
      }
    ).then((r) => r.json());

    if (result.status) {
      apiMatches = (result.data || [])
        .filter((s: Record<string, string>) => s.tradingsymbol?.endsWith('-EQ'))
        .map((s: Record<string, string>) => {
          const ticker = s.tradingsymbol.replace('-EQ', '');
          cacheToken(ticker, s.symboltoken);
          return { ticker, name: ticker, token: s.symboltoken };
        })
        .filter((s: SearchResult) => !universeTickers.has(s.ticker))
        .slice(0, 6);
    }
  } catch {
    // API failure is non-fatal — universe results still returned
  }

  const stocks = [...universeMatches, ...apiMatches].slice(0, 12);
  return NextResponse.json(stocks, {
    headers: { 'Cache-Control': 'public, s-maxage=30' },
  });
}
