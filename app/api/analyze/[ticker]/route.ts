import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getSummary, getHistory } from '@/lib/angelone';
import { fundamentalAgent } from '@/lib/agents/fundamental';
import { technicalAgent } from '@/lib/agents/technical';
import { sentimentAgent } from '@/lib/agents/sentiment';
import { moatAgent } from '@/lib/agents/moat';
import { growthAgent } from '@/lib/agents/growth';
import { riskAgent } from '@/lib/agents/risk';
import { getStockInfo } from '@/lib/universe';

export interface AnalysisResult {
  ticker: string;
  name: string;
  sector: string;
  quote: Awaited<ReturnType<typeof getQuote>>;
  fundamental: ReturnType<typeof fundamentalAgent>;
  technical: ReturnType<typeof technicalAgent>;
  sentiment: ReturnType<typeof sentimentAgent>;
  moat: ReturnType<typeof moatAgent>;
  growth: ReturnType<typeof growthAgent>;
  risk: ReturnType<typeof riskAgent>;
  compositeScore: number;
  verdict: string;
  verdictColor: 'emerald' | 'amber' | 'red' | 'violet';
  entryZone: { from: number; to: number };
  generatedAt: string;
}

function calcComposite(
  f: ReturnType<typeof fundamentalAgent>,
  t: ReturnType<typeof technicalAgent>,
  s: ReturnType<typeof sentimentAgent>,
  m: ReturnType<typeof moatAgent>,
  g: ReturnType<typeof growthAgent>,
  r: ReturnType<typeof riskAgent>
): number {
  // Weighted composite: fundamental 30%, technical 20%, moat 25%, growth 15%, risk 10%
  const sentimentNorm = (s.index + 100) / 20; // -100..100 → 0..10
  const riskNorm = 10 - r.score; // higher risk score = lower composite

  const weighted =
    f.score * 0.30 +
    t.score * 0.20 +
    sentimentNorm * 0.05 +
    m.score * 0.25 +
    (Math.min(10, Math.max(0, (g.cagr.base / 3))) ) * 0.10 +
    riskNorm * 0.10;

  return Math.round(Math.min(10, Math.max(0, weighted)) * 10) / 10;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  let ticker = '';
  try {
    const { ticker: rawTicker } = await params;
    ticker = rawTicker.toUpperCase();
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    // Fetch all data in parallel
    const [quote, summary, history] = await Promise.all([
      getQuote(ticker),
      getSummary(ticker),
      getHistory(ticker, '1y'),
    ]);

    // Run all 6 agents in parallel
    const [fundamental, technical, sentiment, moat, growth, risk] = await Promise.all([
      Promise.resolve(fundamentalAgent(summary)),
      Promise.resolve(technicalAgent(history, quote.regularMarketPrice)),
      Promise.resolve(sentimentAgent(quote, summary)),
      Promise.resolve(moatAgent(summary)),
      Promise.resolve(growthAgent(summary, quote.regularMarketPrice)),
      Promise.resolve(riskAgent(quote, summary)),
    ]);

    const compositeScore = calcComposite(fundamental, technical, sentiment, moat, growth, risk);

    let verdict: string;
    let verdictColor: AnalysisResult['verdictColor'];
    if (compositeScore >= 7.5) {
      verdict = 'Strong Buy — High-conviction long opportunity';
      verdictColor = 'emerald';
    } else if (compositeScore >= 6) {
      verdict = 'Buy — Fundamentals support accumulation at current levels';
      verdictColor = 'emerald';
    } else if (compositeScore >= 4.5) {
      verdict = 'Hold — Monitor for improvement before adding exposure';
      verdictColor = 'amber';
    } else if (compositeScore >= 3) {
      verdict = 'Caution — Risk-reward not favourable at current price';
      verdictColor = 'amber';
    } else {
      verdict = 'Avoid — Multiple red flags; high risk of capital impairment';
      verdictColor = 'red';
    }

    const entryZone = {
      from: +(technical.stopLoss * 1.02).toFixed(2),
      to: +(technical.entry).toFixed(2),
    };

    const stockInfo = getStockInfo(ticker);

    const result: AnalysisResult = {
      ticker,
      name: quote.longName || quote.shortName || stockInfo?.name || ticker,
      sector: stockInfo?.sector ?? (summary.assetProfile as Record<string, unknown>)?.sector as string ?? 'Unknown',
      quote,
      fundamental,
      technical,
      sentiment,
      moat,
      growth,
      risk,
      compositeScore,
      verdict,
      verdictColor,
      entryZone,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    console.error(`[analyze/${ticker}]`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
