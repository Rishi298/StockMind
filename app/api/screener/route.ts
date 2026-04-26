import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSymbolToToken } from '@/lib/scripmaster';
import { getValidToken } from '@/lib/angelone-session';
import {
  NIFTY_50, NIFTY_NEXT_50, NIFTY_MIDCAP_150, NIFTY_SMALLCAP_250,
  STOCK_UNIVERSE, type StockInfo,
} from '@/lib/universe';

export type Signal = 'Strong Buy' | 'Buy' | 'Accumulate' | 'Hold' | 'Sell';

export interface ScreenerRow {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  dma50: number;
  dma200: number;
  volume: number;
  avgVolume: number;
  signal: Signal;
  error?: string;
}

function computeSignal(price: number, low52: number, high52: number, changePct: number): Signal {
  const range = high52 - low52;
  if (range <= 0 || price <= 0) return 'Hold';
  const pos = ((price - low52) / range) * 100;
  if (pos >= 75 && changePct >= 0) return 'Strong Buy';
  if (pos >= 55) return 'Buy';
  if (pos >= 35) return 'Hold';
  if (pos >= 15) return 'Accumulate';
  return 'Sell';
}

const PRESET_TICKERS: Record<string, string[]> = {
  quality:    ['TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ASIANPAINT', 'TITAN', 'NESTLEIND', 'WIPRO', 'BAJFINANCE', 'KOTAKBANK', 'PIDILITIND', 'PAGEIND', 'COLPAL', 'MARICO', 'DABUR'],
  momentum:   ['BHARTIARTL', 'ADANIENT', 'TRENT', 'ZOMATO', 'PERSISTENT', 'NAUKRI', 'MPHASIS', 'HCLTECH', 'SBIN', 'AXISBANK', 'DIXON', 'CGPOWER', 'SUZLON', 'RVNL', 'IREDA'],
  value:      ['COALINDIA', 'ONGC', 'BPCL', 'IOC', 'SAIL', 'VEDL', 'HINDALCO', 'TATASTEEL', 'BANKBARODA', 'PNB', 'NMDC', 'NATIONALUM', 'HINDPETRO', 'FACT', 'PETRONET'],
  garp:       ['RELIANCE', 'ICICIBANK', 'LT', 'MARUTI', 'M&M', 'SUNPHARMA', 'DIVISLAB', 'DRREDDY', 'EICHERMOT', 'TATAMOTORS', 'BAJAJFINSV', 'CHOLAFIN', 'RECLTD', 'PFC', 'TVSMOTOR'],
  income:     ['COALINDIA', 'ITC', 'ONGC', 'POWERGRID', 'NTPC', 'BPCL', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'HDFCBANK', 'PETRONET', 'GUJGASLTD', 'IOC', 'LICHSGFIN', 'UBL'],
  turnaround: ['YESBANK', 'TATAMOTORS', 'TATASTEEL', 'JSWSTEEL', 'TECHM', 'UPL', 'INDUSINDBK', 'VEDL', 'SAIL', 'BHEL', 'SUZLON', 'SJVN', 'JPPOWER', 'IDFCFIRSTB', 'NATIONALUM'],
};

const INDEX_UNIVERSE: Record<string, StockInfo[]> = {
  large:  NIFTY_50,
  next50: NIFTY_NEXT_50,
  midcap: NIFTY_MIDCAP_150,
  small:  NIFTY_SMALLCAP_250,
};

const API_BASE = process.env.ANGEL_ONE_API_BASE ?? '';

function angelHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-PrivateKey': process.env.NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID ?? '',
    'X-MACaddress': '00:00:00:00:00:00',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '0.0.0.0',
  };
}

interface AngelQuote {
  symbolToken: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  tradeVolume: number;
  netChange: number;
  percentChange: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
}

async function bulkAngelQuote(
  tokenToSymbol: Map<string, string>,
  jwtToken: string
): Promise<Map<string, AngelQuote>> {
  const result = new Map<string, AngelQuote>();
  const tokens = Array.from(tokenToSymbol.keys());
  if (!tokens.length || !jwtToken) return result;

  const CHUNK = 50;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    try {
      const res = await fetch(`${API_BASE}/rest/secure/angelbroking/market/v1/quote/`, {
        method: 'POST',
        headers: angelHeaders(jwtToken),
        body: JSON.stringify({ mode: 'FULL', exchangeTokens: { NSE: chunk } }),
      });
      const data = await res.json() as { status: boolean; data?: { fetched: AngelQuote[] } };
      if (!data.status || !data.data) continue;
      for (const q of data.data.fetched) {
        const sym = tokenToSymbol.get(q.symbolToken);
        if (sym) result.set(sym, q);
      }
    } catch { /* skip failed chunk */ }
  }
  return result;
}

function toRow(stock: StockInfo, q: AngelQuote): ScreenerRow {
  // When market is closed, ltp = 0 — fall back to previous session close
  const price  = q.ltp > 0 ? q.ltp : q.close;
  const high52 = q['52WeekHigh'] ?? 0;
  const low52  = q['52WeekLow'] ?? 0;
  const changePct = q.ltp > 0 ? q.percentChange : 0;
  return {
    ticker: stock.ticker, name: stock.name, sector: stock.sector,
    price, change: q.ltp > 0 ? q.netChange : 0, changePct,
    marketCap: 0, pe: null, pb: null, dividendYield: null,
    fiftyTwoWeekHigh: high52, fiftyTwoWeekLow: low52,
    dma50: 0, dma200: 0,
    volume: q.tradeVolume, avgVolume: q.tradeVolume,
    signal: computeSignal(price, low52, high52, changePct),
  };
}

function noDataRow(stock: StockInfo): ScreenerRow {
  return {
    ticker: stock.ticker, name: stock.name, sector: stock.sector,
    price: 0, change: 0, changePct: 0, marketCap: 0,
    pe: null, pb: null, dividendYield: null,
    fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0, dma50: 0, dma200: 0,
    volume: 0, avgVolume: 0, signal: 'Hold',
    error: 'No price data',
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preset = searchParams.get('preset');
  const index  = searchParams.get('index');
  const query  = searchParams.get('q');
  const sector = searchParams.get('sector');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '25'), 50);

  let stocks: StockInfo[] = [];
  if (preset && PRESET_TICKERS[preset]) {
    stocks = PRESET_TICKERS[preset]
      .map((t) => STOCK_UNIVERSE.find((s) => s.ticker === t))
      .filter((s): s is StockInfo => s != null);
  } else if (index && INDEX_UNIVERSE[index]) {
    stocks = INDEX_UNIVERSE[index].slice(0, limit);
  } else if (query) {
    const q = query.toLowerCase();
    stocks = STOCK_UNIVERSE.filter(
      (s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, limit);
  } else if (sector) {
    stocks = STOCK_UNIVERSE.filter(
      (s) => s.sector.toLowerCase() === sector.toLowerCase()
    ).slice(0, limit);
  } else {
    stocks = NIFTY_50.slice(0, limit);
  }

  // Load DB-cached tokens
  const dbTokens = await prisma.settings.findMany({
    where: { key: { startsWith: 'angel_token_' } },
  });
  const symbolToToken = new Map<string, string>(
    dbTokens.map((r) => [r.key.replace('angel_token_', ''), r.value])
  );

  // For any symbol not in DB cache, resolve from ScripMaster and persist
  const missing = stocks.filter((s) => !symbolToToken.has(s.ticker));
  if (missing.length > 0) {
    try {
      const scripMap = await getSymbolToToken();
      const newEntries: { key: string; value: string }[] = [];
      for (const s of missing) {
        const token = scripMap.get(s.ticker);
        if (token) {
          symbolToToken.set(s.ticker, token);
          newEntries.push({ key: `angel_token_${s.ticker}`, value: token });
        }
      }
      // Persist new tokens to DB so future requests are instant
      if (newEntries.length > 0) {
        await Promise.all(
          newEntries.map((e) =>
            prisma.settings.upsert({
              where: { key: e.key },
              update: { value: e.value },
              create: e,
            })
          )
        );
      }
    } catch { /* ScripMaster fetch failed — will show no-data for missing stocks */ }
  }

  // Build token→symbol map for this request's stocks
  const tokenToSymbol = new Map<string, string>();
  for (const s of stocks) {
    const token = symbolToToken.get(s.ticker);
    if (token) tokenToSymbol.set(token, s.ticker);
  }

  const jwtToken = await getValidToken();

  // Single Angel One bulk-quote call for all stocks
  const quotes = await bulkAngelQuote(tokenToSymbol, jwtToken);

  // Load cached fundamentals (P/E, market cap etc.) from DB
  const fundamentalsRecords = await prisma.fundamentalsCache.findMany({
    where: { symbol: { in: stocks.map((s) => s.ticker) } },
  });
  const fundamentalsMap = new Map(fundamentalsRecords.map((f) => [f.symbol, f]));

  const rows: ScreenerRow[] = stocks.map((s) => {
    const q = quotes.get(s.ticker);
    const fund = fundamentalsMap.get(s.ticker);
    const base = q && (q.ltp > 0 || q.close > 0) ? toRow(s, q) : noDataRow(s);
    if (fund) {
      base.pe           = fund.pe ?? base.pe;
      base.pb           = fund.pb ?? base.pb;
      base.marketCap    = fund.marketCap ?? base.marketCap;
      base.dividendYield = fund.dividendYield ?? base.dividendYield;
    }
    return base;
  });

  return NextResponse.json(
    { rows, count: rows.length, preset: preset ?? index ?? null },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } }
  );
}
