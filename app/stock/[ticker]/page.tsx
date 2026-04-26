'use client';

import { use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import type { AnalysisResult } from '@/app/api/analyze/[ticker]/route';
import type { HistoryBar } from '@/lib/angelone';
import Hero from '@/components/DeepDive/Hero';
import VerdictBanner from '@/components/DeepDive/VerdictBanner';
import AgentScorecards from '@/components/DeepDive/AgentScorecards';
import PriceChart from '@/components/DeepDive/PriceChart';
import Sections from '@/components/DeepDive/Sections';
import { NewsCard } from '@/components/DeepDive/NewsCard';
import { HeroSkeleton, CardSkeleton, ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import clsx from 'clsx';

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export default function StockPage({ params }: PageProps) {
  const { ticker } = use(params);
  const upperTicker = ticker.toUpperCase();

  const { data: analysis, error: analysisError, isLoading: analysisLoading, mutate } = useSWR<AnalysisResult>(
    `/api/analyze/${upperTicker}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { data: history, isLoading: historyLoading } = useSWR<HistoryBar[]>(
    `/api/history/${upperTicker}?period=1y`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const isLoading = analysisLoading;

  return (
    <div className="animate-fade-in">
      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Screener
          </Link>
          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className={clsx(
              'flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-400 transition-colors px-3 py-1.5 rounded-lg border border-stone-800',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={clsx('h-3 w-3', isLoading && 'animate-spin')} />
            Refresh Analysis
          </button>
        </div>
      </div>

      {/* Error state */}
      {analysisError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
            <h2 className="font-serif text-xl text-stone-200">Unable to load {upperTicker}</h2>
            <p className="text-sm text-stone-400 max-w-md mx-auto">
              Yahoo Finance may not have data for this ticker, or the request was rate-limited.
              Make sure to use valid NSE ticker symbols (e.g., RELIANCE, TCS, HDFCBANK).
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => mutate()}
                className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700 transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="px-4 py-2 text-sm rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
              >
                Back to Screener
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !analysisError && (
        <>
          <HeroSkeleton />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <CardSkeleton lines={2} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} lines={4} />)}
            </div>
            <ChartSkeleton />
          </div>
        </>
      )}

      {/* Loaded state */}
      {analysis && !isLoading && (
        <>
          {/* Hero — live price */}
          <Hero data={analysis} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            {/* Verdict banner */}
            <VerdictBanner data={analysis} />

            {/* Agent scorecards */}
            <div>
              <h2 className="font-serif text-xl font-semibold text-stone-200 mb-4">6-Agent Analysis</h2>
              <AgentScorecards data={analysis} />
            </div>

            {/* Price chart */}
            {!historyLoading && history && history.length > 0 ? (
              <PriceChart
                bars={history}
                ticker={upperTicker}
                currentPrice={analysis.quote.regularMarketPrice}
                stopLoss={analysis.technical.stopLoss}
                target1={analysis.technical.target1}
              />
            ) : (
              <ChartSkeleton />
            )}

            {/* News feed + detailed sections side by side on wide screens */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <h2 className="font-serif text-xl font-semibold text-stone-200 mb-4">Full Analysis Report</h2>
                <Sections data={analysis} />
              </div>
              <div>
                <NewsCard ticker={upperTicker} />
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-stone-400 leading-relaxed">
                  <span className="text-amber-400 font-semibold">Educational research only. Not investment advice.</span>{' '}
                  Analysis generated using publicly available data from Yahoo Finance.
                  All scores, targets, and verdicts are algorithmic estimates and should not be construed as financial advice.
                  Past performance does not guarantee future results. Verify all data and consult a SEBI-registered investment advisor
                  before making investment decisions. SEBI registration (RA) is required to charge fees for investment advice in India.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
