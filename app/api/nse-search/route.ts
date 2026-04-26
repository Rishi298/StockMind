import { NextRequest, NextResponse } from 'next/server';
import { STOCK_UNIVERSE } from '@/lib/universe';

interface ScripEntry {
  token: string;
  symbol: string;
  name: string;
  exch_seg: string;
  instrumenttype?: string;
}

const SCRIP_MASTER_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';

let scripCache: { symbol: string; name: string; token: string }[] | null = null;
let fetchedAt = 0;
const TTL = 12 * 60 * 60 * 1000;

async function getScripList() {
  if (scripCache && Date.now() - fetchedAt < TTL) return scripCache;
  const res = await fetch(SCRIP_MASTER_URL, { next: { revalidate: 43200 } });
  const raw = await res.json() as ScripEntry[];
  // Only NSE equity series (-EQ)
  scripCache = raw
    .filter((e) => e.exch_seg === 'NSE' && e.symbol.endsWith('-EQ'))
    .map((e) => ({
      symbol: e.symbol.replace(/-EQ$/, ''),
      name: e.name ?? '',
      token: e.token,
    }));
  fetchedAt = Date.now();
  return scripCache;
}

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const lower = q.toLowerCase();

  // 1. Search curated universe first (has sector info)
  const curated = STOCK_UNIVERSE.filter(
    (s) => s.ticker.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower)
  ).slice(0, 10).map((s) => ({ symbol: s.ticker, name: s.name, sector: s.sector, inUniverse: true }));

  // 2. Search ScripMaster for anything not in curated universe
  try {
    const list = await getScripList();
    const curatedSet = new Set(curated.map((c) => c.symbol));
    const extra = list
      .filter((e) =>
        !curatedSet.has(e.symbol) &&
        (e.symbol.toLowerCase().includes(lower) || e.name.toLowerCase().includes(lower))
      )
      .slice(0, 20 - curated.length)
      .map((e) => ({ symbol: e.symbol, name: e.name, sector: '', inUniverse: false }));

    return NextResponse.json([...curated, ...extra]);
  } catch {
    return NextResponse.json(curated);
  }
}
