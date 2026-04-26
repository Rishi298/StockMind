import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSummary } from '@/lib/yahoo';
import { STOCK_UNIVERSE } from '@/lib/universe';

function n(v: unknown): number | null {
  const x = Number(v);
  return isNaN(x) || x === 0 ? null : x;
}

// POST /api/cache/fundamentals?symbols=RELIANCE,TCS,...
// Fetches Yahoo Finance fundamentals for the given symbols (or all universe stocks)
// and stores them in FundamentalsCache. Run once, refreshes weekly.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols');
  const symbols = symbolsParam
    ? symbolsParam.split(',').map((s) => s.trim().toUpperCase())
    : STOCK_UNIVERSE.map((s) => s.ticker);

  const BATCH = 5; // Yahoo Finance: max 5 concurrent requests safely
  let cached = 0;
  let failed = 0;

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (symbol) => {
        const summary = await getSummary(symbol);
        const sd = summary.summaryDetail as Record<string, unknown>;
        const ks = summary.defaultKeyStatistics as Record<string, unknown>;
        const fd = summary.financialData as Record<string, unknown>;
        const pr = summary.price as Record<string, unknown>;

        await prisma.fundamentalsCache.upsert({
          where: { symbol },
          update: {
            pe:            n((sd.trailingPE as Record<string,unknown>)?.raw ?? sd.trailingPE),
            pb:            n((sd.priceToBook as Record<string,unknown>)?.raw ?? sd.priceToBook),
            marketCap:     n((pr.marketCap as Record<string,unknown>)?.raw ?? pr.marketCap),
            roe:           n((fd.returnOnEquity as Record<string,unknown>)?.raw ?? fd.returnOnEquity),
            debtToEquity:  n((fd.debtToEquity as Record<string,unknown>)?.raw ?? fd.debtToEquity),
            revenueGrowth: n((fd.revenueGrowth as Record<string,unknown>)?.raw ?? fd.revenueGrowth),
            eps:           n((ks.trailingEps as Record<string,unknown>)?.raw ?? ks.trailingEps),
            dividendYield: n((sd.dividendYield as Record<string,unknown>)?.raw ?? sd.dividendYield),
            cachedAt:      new Date(),
          },
          create: {
            symbol,
            pe:            n((sd.trailingPE as Record<string,unknown>)?.raw ?? sd.trailingPE),
            pb:            n((sd.priceToBook as Record<string,unknown>)?.raw ?? sd.priceToBook),
            marketCap:     n((pr.marketCap as Record<string,unknown>)?.raw ?? pr.marketCap),
            roe:           n((fd.returnOnEquity as Record<string,unknown>)?.raw ?? fd.returnOnEquity),
            debtToEquity:  n((fd.debtToEquity as Record<string,unknown>)?.raw ?? fd.debtToEquity),
            revenueGrowth: n((fd.revenueGrowth as Record<string,unknown>)?.raw ?? fd.revenueGrowth),
            eps:           n((ks.trailingEps as Record<string,unknown>)?.raw ?? ks.trailingEps),
            dividendYield: n((sd.dividendYield as Record<string,unknown>)?.raw ?? sd.dividendYield),
          },
        });
        return symbol;
      })
    );

    results.forEach((r) => {
      if (r.status === 'fulfilled') cached++;
      else failed++;
    });

    // 500ms between batches to respect Yahoo Finance rate limits
    if (i + BATCH < symbols.length) await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({
    cached,
    failed,
    total: symbols.length,
    message: `Cached fundamentals for ${cached}/${symbols.length} stocks. Run again for ${failed} failed.`,
  });
}

// GET /api/cache/fundamentals?symbol=RELIANCE — fetch single cached record
export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const record = await prisma.fundamentalsCache.findUnique({ where: { symbol } });
  return NextResponse.json(record ?? { symbol, pe: null, pb: null, marketCap: null });
}
