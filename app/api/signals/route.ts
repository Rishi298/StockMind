import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getSummary, getHistory } from '@/lib/angelone';
import { fundamentalAgent } from '@/lib/agents/fundamental';
import { technicalAgent } from '@/lib/agents/technical';
import { sentimentAgent } from '@/lib/agents/sentiment';
import { moatAgent } from '@/lib/agents/moat';
import { growthAgent } from '@/lib/agents/growth';
import { riskAgent } from '@/lib/agents/risk';
import type { Signal } from '@/app/api/screener/route';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CachedSignal {
  score: number;
  signal: Signal;
  verdict: string;
  expiresAt: number;
}

const signalCache = new Map<string, CachedSignal>();

function scoreToSignal(score: number): Signal {
  if (score >= 7.5) return 'Strong Buy';
  if (score >= 6.0) return 'Buy';
  if (score >= 4.5) return 'Hold';
  if (score >= 3.0) return 'Accumulate';
  return 'Sell';
}

async function computeSignal(ticker: string): Promise<{ ticker: string; score: number; signal: Signal; verdict: string }> {
  const cached = signalCache.get(ticker);
  if (cached && Date.now() < cached.expiresAt) {
    return { ticker, score: cached.score, signal: cached.signal, verdict: cached.verdict };
  }

  const [quote, summary, history] = await Promise.all([
    getQuote(ticker),
    getSummary(ticker),
    getHistory(ticker, '1y'),
  ]);

  const fundamental = fundamentalAgent(summary);
  const technical = technicalAgent(history, quote.regularMarketPrice);
  const sentiment = sentimentAgent(quote, summary);
  const moat = moatAgent(summary);
  const growth = growthAgent(summary, quote.regularMarketPrice);
  const risk = riskAgent(quote, summary);

  const sentimentNorm = (sentiment.index + 100) / 20;
  const riskNorm = 10 - risk.score;

  const score = Math.round(Math.min(10, Math.max(0,
    fundamental.score * 0.30 +
    technical.score * 0.20 +
    sentimentNorm * 0.05 +
    moat.score * 0.25 +
    (Math.min(10, Math.max(0, growth.cagr.base / 3))) * 0.10 +
    riskNorm * 0.10
  )) * 10) / 10;

  const signal = scoreToSignal(score);

  const verdict =
    score >= 7.5 ? 'Strong Buy' :
    score >= 6.0 ? 'Buy' :
    score >= 4.5 ? 'Hold' :
    score >= 3.0 ? 'Accumulate' : 'Sell';

  signalCache.set(ticker, { score, signal, verdict, expiresAt: Date.now() + CACHE_TTL });
  return { ticker, score, signal, verdict };
}

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get('tickers') || '';
  const tickers = tickersParam.split(',').filter(Boolean).slice(0, 60);

  if (tickers.length === 0) return NextResponse.json([]);

  const BATCH = 5;
  const results: Awaited<ReturnType<typeof computeSignal>>[] = [];

  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(computeSignal));
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
    // Small delay between batches to avoid Yahoo Finance rate limits
    if (i + BATCH < tickers.length) await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=300' },
  });
}
