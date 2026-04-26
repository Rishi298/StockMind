/**
 * Angel One SmartAPI Wrapper
 * Replaces yahoo-finance2 with Angel One's REST API
 */

// In-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Retry wrapper for transient network errors
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (retries > 0 && (msg.includes('429') || msg.includes('network') || msg.includes('timeout'))) {
      await new Promise((r) => setTimeout(r, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

function n(val: unknown): number {
  const v = Number(val);
  return isNaN(v) ? 0 : v;
}

function nn(val: unknown): number | null {
  if (val == null) return null;
  const v = Number(val);
  return isNaN(v) ? null : v;
}

function s(val: unknown): string {
  return val == null ? '' : String(val);
}

export function toNSSymbol(ticker: string): string {
  if (ticker.endsWith('.NS') || ticker.endsWith('.BO')) return ticker;
  return `${ticker}.NS`;
}

export interface QuoteData {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  currency: string;
  exchangeName: string;
  quoteType: string;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  averageVolume: number;
  averageVolume10days: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  earningsTimestamp: number | null;
  epsTrailingTwelveMonths: number | null;
  epsForward: number | null;
  bookValue: number | null;
}

export interface SummaryData {
  price: Record<string, unknown>;
  summaryDetail: Record<string, unknown>;
  defaultKeyStatistics: Record<string, unknown>;
  financialData: Record<string, unknown>;
  incomeStatementHistory: Record<string, unknown>;
  balanceSheetHistory: Record<string, unknown>;
  cashflowStatementHistory: Record<string, unknown>;
  earnings: Record<string, unknown>;
  assetProfile: Record<string, unknown>;
  recommendationTrend: Record<string, unknown>;
}

export interface HistoryBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

function angelHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ANGEL_ONE_API_TOKEN || ''}`,
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-PrivateKey': process.env.NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID || '',
    'X-MACaddress': '00:00:00:00:00:00',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '0.0.0.0',
  };
}

/**
 * Get live quote from Angel One SmartAPI
 */
export async function getQuote(ticker: string): Promise<QuoteData> {
  const symbol = toNSSymbol(ticker);
  const cacheKey = `quote:${symbol}`;
  const cached = getCached<QuoteData>(cacheKey);
  if (cached) return cached;

  // Try Angel One (real-time LTP, works with API-key token)
  try {
    const token = await resolveExchangeToken(symbol);
    const result = await withRetry(() =>
      fetch(`${process.env.ANGEL_ONE_API_BASE}/rest/secure/angelbroking/market/v1/quote/`, {
        method: 'POST',
        headers: angelHeaders(),
        body: JSON.stringify({ mode: 'FULL', exchangeTokens: { NSE: [token] } }),
      }).then((res) => {
        if (!res.ok) throw new Error(`Angel One API error: ${res.status}`);
        return res.json();
      })
    );

    if (result.status) {
      const quoteResult = result.data?.fetched?.[0] || {};
      if (n(quoteResult.ltp) > 0) {
        const data = mapQuoteResult(quoteResult as Record<string, unknown>, symbol);
        setCached(cacheKey, data);
        return data;
      }
    }
  } catch { /* fall through to Yahoo Finance */ }

  // Yahoo Finance fallback — provides P/E, market cap, dividends needed by analysis agents
  const { getQuote: yahooGetQuote } = await import('./yahoo');
  const base = symbol.replace('.NS', '').replace('.BO', '');
  const data = await yahooGetQuote(base);
  setCached(cacheKey, data);
  return data;
}

function mapQuoteResult(quoteResult: Record<string, unknown>, symbol: string): QuoteData {
  return {
    symbol,
    shortName: s(quoteResult.tradingSymbol || quoteResult.symbol),
    longName: s(quoteResult.tradingSymbol || quoteResult.symbol),
    regularMarketPrice: n(quoteResult.ltp),
    regularMarketChange: n(quoteResult.netChange),
    regularMarketChangePercent: n(quoteResult.percentChange),
    regularMarketVolume: n(quoteResult.tradeVolume),
    regularMarketOpen: n(quoteResult.open),
    regularMarketDayHigh: n(quoteResult.high),
    regularMarketDayLow: n(quoteResult.low),
    regularMarketPreviousClose: n(quoteResult.close),
    fiftyTwoWeekHigh: n(quoteResult['52WeekHigh']),
    fiftyTwoWeekLow: n(quoteResult['52WeekLow']),
    marketCap: 0,
    currency: 'INR',
    exchangeName: 'NSE',
    quoteType: 'EQUITY',
    trailingPE: null,
    forwardPE: null,
    priceToBook: null,
    dividendYield: null,
    averageVolume: n(quoteResult.tradeVolume),
    averageVolume10days: n(quoteResult.tradeVolume),
    fiftyDayAverage: 0,
    twoHundredDayAverage: 0,
    earningsTimestamp: null,
    epsTrailingTwelveMonths: null,
    epsForward: null,
    bookValue: null,
  };
}

/**
 * Fetch quotes for multiple tickers in a single Angel One API call.
 * Returns a Map<ticker, QuoteData> for all tickers that returned data.
 */
export async function getBulkQuotes(tickers: string[]): Promise<Map<string, QuoteData>> {
  const tokenToTicker = new Map<string, string>();
  const tokens: string[] = [];

  for (const ticker of tickers) {
    const symbol = toNSSymbol(ticker);
    try {
      const token = getExchangeToken(symbol);
      tokenToTicker.set(token, ticker);
      tokens.push(token);
    } catch {
      // no token mapping for this ticker — skip
    }
  }

  if (tokens.length === 0) return new Map();

  const CHUNK = 50;
  const quotes = new Map<string, QuoteData>();

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    try {
      const result = await withRetry(() =>
        fetch(`${process.env.ANGEL_ONE_API_BASE}/rest/secure/angelbroking/market/v1/quote/`, {
          method: 'POST',
          headers: angelHeaders(),
          body: JSON.stringify({ mode: 'FULL', exchangeTokens: { NSE: chunk } }),
        }).then((res) => {
          if (!res.ok) throw new Error(`Angel One bulk quote error: ${res.status}`);
          return res.json();
        })
      );

      if (!result.status) continue;

      for (const quoteResult of (result.data?.fetched || [])) {
        const token = s(quoteResult.symbolToken);
        const ticker = tokenToTicker.get(token);
        if (!ticker) continue;
        const symbol = toNSSymbol(ticker);
        const data = mapQuoteResult(quoteResult as Record<string, unknown>, symbol);
        quotes.set(ticker, data);
        setCached(`quote:${symbol}`, data);
      }
    } catch (err) {
      console.error('Angel One getBulkQuotes chunk failed:', err);
    }
  }

  return quotes;
}

/**
 * Get fundamental summary data via Yahoo Finance.
 * Angel One only provides real-time quotes; fundamentals (PE, ROE, margins etc.)
 * come from Yahoo Finance which is free and requires no authentication.
 */
export async function getSummary(ticker: string): Promise<SummaryData> {
  const { getSummary: yahooSummary } = await import('./yahoo');
  return yahooSummary(ticker);
}

/**
 * Get historical OHLCV data.
 * Tries Angel One first (requires full session JWT from TOTP login),
 * automatically falls back to Yahoo Finance so callers never throw.
 */
export async function getHistory(
  ticker: string,
  period: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' = '1y'
): Promise<HistoryBar[]> {
  const symbol = toNSSymbol(ticker);
  const cacheKey = `history:${symbol}:${period}`;
  const cached = getCached<HistoryBar[]>(cacheKey);
  if (cached) return cached;

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 09:15`;

  // Try Angel One candle data (only works with a full TOTP session token)
  try {
    const token = await resolveExchangeToken(symbol);
    const result = await withRetry(() =>
      fetch(`${process.env.ANGEL_ONE_API_BASE}/rest/secure/angelbroking/historical/v1/getCandleData`, {
        method: 'POST',
        headers: angelHeaders(),
        body: JSON.stringify({
          exchange: 'NSE',
          symboltoken: token,
          interval: 'ONE_DAY',
          fromdate: fmt(getPeriodStart(period)),
          todate: fmt(new Date()),
        }),
      }).then((res) => {
        if (!res.ok) throw new Error(`Angel One history API error: ${res.status}`);
        return res.json();
      })
    );

    if (result.status && Array.isArray(result.data) && result.data.length > 0) {
      const data: HistoryBar[] = result.data
        .filter((bar: any[]) => bar[4] != null)
        .map((bar: any[]) => ({
          date: new Date(bar[0]),
          open: n(bar[1]),
          high: n(bar[2]),
          low: n(bar[3]),
          close: n(bar[4]),
          volume: n(bar[5]),
          adjClose: n(bar[4]),
        }));
      setCached(cacheKey, data);
      return data;
    }
  } catch { /* fall through to Yahoo Finance */ }

  // Yahoo Finance fallback — always available, single-stock requests don't rate-limit
  const { getHistory: yahooGetHistory } = await import('./yahoo');
  const base = symbol.replace('.NS', '').replace('.BO', '');
  const data = await yahooGetHistory(base, period);
  setCached(cacheKey, data);
  return data;
}

export async function getFundamentals(ticker: string) {
  return getSummary(ticker);
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  const map: Record<string, number> = {
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    '2y': 730,
    '5y': 1825,
  };
  const days = map[period] ?? 365;
  now.setDate(now.getDate() - days);
  return now;
}

// NSE exchange tokens for Angel One SmartAPI (instrument-level numeric IDs)
const NSE_TOKEN_MAP: Record<string, string> = {
  // NIFTY 50
  ADANIENT: '25',      ADANIPORTS: '15083', APOLLOHOSP: '157',   ASIANPAINT: '236',
  AXISBANK: '5900',    'BAJAJ-AUTO': '16669', BAJFINANCE: '317', BAJAJFINSV: '16675',
  BPCL: '526',         BHARTIARTL: '10604', BRITANNIA: '547',    CIPLA: '694',
  COALINDIA: '20374',  DIVISLAB: '10940',   DRREDDY: '881',      EICHERMOT: '910',
  GRASIM: '1232',      HCLTECH: '7229',     HDFCBANK: '1333',    HDFCLIFE: '467',
  HEROMOTOCO: '1348',  HINDALCO: '1363',    HINDUNILVR: '1394',  ICICIBANK: '4963',
  ITC: '1660',         INDUSINDBK: '5258',  INFY: '1594',        JSWSTEEL: '11723',
  KOTAKBANK: '1922',   LT: '11483',         'M&M': '2031',       MARUTI: '10999',
  NESTLEIND: '17963',  NTPC: '11630',       ONGC: '2475',        POWERGRID: '14977',
  RELIANCE: '2885',    SBILIFE: '21808',    SBIN: '3045',        SUNPHARMA: '3351',
  TCS: '11536',        TATACONSUM: '3432',  TATAMOTORS: '3456',  TATASTEEL: '3499',
  TECHM: '13538',      TITAN: '3506',       ULTRACEMCO: '11532', UPL: '11287',
  WIPRO: '3787',       ZOMATO: '5097',
  // NIFTY NEXT 50
  ABB: '13',           AMBUJACEM: '1270',   AUROPHARMA: '275',   BANKBARODA: '4668',
  BERGEPAINT: '404',   BOSCHLTD: '2082',    CANBK: '10696',      CHOLAFIN: '685',
  COLPAL: '3160',      DABUR: '772',        DLF: '14366',        GODREJCP: '10099',
  GUJGASLTD: '10599',  HAL: '2303',         HAVELLS: '14418',    ICICIGI: '18652',
  ICICIPRULI: '18069', INDIGO: '11195',     INDUSTOWER: '29135', IOC: '1624',
  IRCTC: '13611',      LUPIN: '10440',      'MCDOWELL-N': '2029', MPHASIS: '4503',
  NAUKRI: '13751',     PAGEIND: '14428',    PERSISTENT: '18365', PIDILITIND: '2664',
  PIIND: '11742',      PNB: '10666',        POLICYBZR: '543323', RECLTD: '20273',
  SAIL: '2963',        SHREECEM: '3103',    SIEMENS: '3150',     TATAPOWER: '3426',
  TORNTPHARM: '3518',  TRENT: '1964',       UNIONBANK: '2752',   VBL: '19243',
  VEDL: '3063',        VOLTAS: '3778',      WHIRLPOOL: '3163',   YESBANK: '11915',
  ZYDUSLIFE: '18143',
};

// Runtime cache for tokens resolved via Angel One searchScrip (survives across requests in same process)
const dynamicTokenCache = new Map<string, string>();

export function cacheToken(ticker: string, token: string) {
  dynamicTokenCache.set(ticker.toUpperCase(), token);
}

function getExchangeToken(symbol: string): string {
  const base = symbol.replace('.NS', '').replace('.BO', '');
  const token = NSE_TOKEN_MAP[base] || dynamicTokenCache.get(base);
  if (!token) throw new Error(`No Angel One exchange token found for symbol: ${base}`);
  return token;
}

// Import scrip-tokens.json at module level — instant local lookup, no network.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SCRIP_TOKENS: Record<string, string> = require('./scrip-tokens.json');

async function resolveExchangeToken(symbol: string): Promise<string> {
  const base = symbol.replace('.NS', '').replace('.BO', '');

  // 1. Hardcoded Nifty 100 map (fastest)
  if (NSE_TOKEN_MAP[base]) return NSE_TOKEN_MAP[base];

  // 2. In-process cache (survives across requests in same process)
  const cached = dynamicTokenCache.get(base);
  if (cached) return cached;

  // 3. Local scrip-tokens.json — covers all ~9500 NSE equities, no network call
  const scraped = SCRIP_TOKENS[base];
  if (scraped) {
    dynamicTokenCache.set(base, scraped);
    return scraped;
  }

  throw new Error(`No Angel One token found for ${base}. Run "Enable Angel One Prices" in Settings to refresh the token map.`);
}
