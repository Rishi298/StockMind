// eslint-disable-next-line @typescript-eslint/no-require-imports
const { KiteConnect } = require('kiteconnect') as { KiteConnect: new (p: { api_key: string }) => KiteInstance };

interface KiteInstance {
  setAccessToken(token: string): void;
  getLoginURL(): string;
  generateSession(requestToken: string, secret: string): Promise<{ access_token: string }>;
  getHoldings(): Promise<unknown[]>;
}

const API_KEY = process.env.ZERODHA_API_KEY ?? '';
const API_SECRET = process.env.ZERODHA_API_SECRET ?? '';

function getKiteClient(accessToken?: string): KiteInstance {
  const kc = new KiteConnect({ api_key: API_KEY });
  if (accessToken) kc.setAccessToken(accessToken);
  return kc;
}

export function getLoginUrl(): string {
  return getKiteClient().getLoginURL();
}

export async function generateSession(requestToken: string): Promise<string> {
  const session = await getKiteClient().generateSession(requestToken, API_SECRET);
  return session.access_token;
}

export interface ZerodhaHolding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
  isin: string;
}

export async function getHoldings(accessToken: string): Promise<ZerodhaHolding[]> {
  const holdings = await getKiteClient(accessToken).getHoldings();
  return holdings as ZerodhaHolding[];
}

export interface ZerodhaCSVRow {
  symbol: string;
  qty: number;
  avgPrice: number;
  sector: string;
  isin: string;
  prevClose: number;
  unrealisedPnl: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function findColIdx(headers: string[], ...terms: string[]): number {
  return headers.findIndex((h) => terms.some((t) => h === t || h.startsWith(t)));
}

export function parseZerodhaClientId(csvText: string): string {
  const lines = csvText.trim().split(/\r?\n/);
  for (const line of lines) {
    const cols = parseCSVLine(line).map((c) => c.replace(/"/g, '').trim());
    if (cols[0]?.toLowerCase() === 'client id' && cols[1]) return cols[1];
  }
  return 'default';
}

export function parseZerodhaCSV(csvText: string): ZerodhaCSVRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Zerodha Holdings CSV has metadata rows at the top before the actual headers.
  // Scan every line to find the one that contains "symbol" in any column — that is
  // the real header row. The preceding rows are summary/metadata.
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]).map((c) => c.replace(/"/g, '').toLowerCase().trim());
    if (cols.some((c) => c === 'symbol')) {
      headerLineIdx = i;
      break;
    }
  }

  if (headerLineIdx === -1) {
    throw new Error(
      'Could not find the "Symbol" header row in this CSV.\n' +
      'Please upload the Holdings CSV downloaded from Zerodha Console → Holdings → Download (↓).'
    );
  }

  const headers = parseCSVLine(lines[headerLineIdx]).map((h) =>
    h.replace(/"/g, '').toLowerCase().trim()
  );

  // Column mapping — Zerodha Holdings CSV (Console format as of 2025-26):
  //  [empty], Symbol, ISIN, Sector, Quantity Available, Quantity Discrepant,
  //  Quantity Long Term, Quantity Pledged (Margin), Quantity Pledged (Loan),
  //  Average Price, Previous Closing Price, Unrealized P&L, Unrealized P&L Pct.
  const symbolIdx    = findColIdx(headers, 'symbol');
  const isinIdx      = findColIdx(headers, 'isin');
  const sectorIdx    = findColIdx(headers, 'sector');
  const qtyIdx       = findColIdx(headers, 'quantity available', 'quantity');
  const avgIdx       = findColIdx(headers, 'average price', 'avg. cost', 'average cost', 'avg cost');
  const prevCloseIdx = findColIdx(headers, 'previous closing price', 'previous closing', 'ltp');
  const pnlIdx       = findColIdx(headers, 'unrealized p&l', 'unrealised p&l');

  if (symbolIdx === -1 || qtyIdx === -1 || avgIdx === -1) {
    throw new Error(
      `Missing required columns.\n` +
      `Found: ${headers.filter(Boolean).join(', ')}\n` +
      `Need: Symbol, Quantity Available (or Quantity), Average Price.`
    );
  }

  return lines
    .slice(headerLineIdx + 1)
    .filter((l) => l.trim())
    .map((line) => {
      const cols = parseCSVLine(line);
      const symbol      = cols[symbolIdx]?.replace(/"/g, '').trim() ?? '';
      const qty         = parseFloat(cols[qtyIdx] ?? '0') || 0;
      const avgPrice    = parseFloat(cols[avgIdx] ?? '0') || 0;
      const sector      = sectorIdx >= 0 ? (cols[sectorIdx]?.replace(/"/g, '').trim() ?? '') : '';
      const isin        = isinIdx >= 0    ? (cols[isinIdx]?.replace(/"/g, '').trim() ?? '') : '';
      const prevClose   = prevCloseIdx >= 0 ? (parseFloat(cols[prevCloseIdx] ?? '0') || 0) : 0;
      const unrealisedPnl = pnlIdx >= 0  ? (parseFloat(cols[pnlIdx] ?? '0') || 0) : 0;
      return { symbol, qty, avgPrice, sector, isin, prevClose, unrealisedPnl };
    })
    .filter((r) => {
      if (!r.symbol || r.symbol.length < 2) return false;
      if (r.qty <= 0) return false;
      // Skip non-equity rows (MF category labels have braces)
      if (r.symbol.includes('{')) return false;
      return true;
    });
}
