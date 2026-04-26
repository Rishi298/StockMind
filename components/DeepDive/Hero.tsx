'use client';

import { ArrowUp, ArrowDown, Building2, Globe, Clock } from 'lucide-react';
import type { AnalysisResult } from '@/app/api/analyze/[ticker]/route';
import clsx from 'clsx';

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCr(n: number): string {
  const cr = n / 1e7;
  if (cr >= 100000) return `₹${(cr / 100000).toFixed(2)}L Cr`;
  if (cr >= 1000) return `₹${(cr / 1000).toFixed(2)}K Cr`;
  return `₹${cr.toFixed(0)} Cr`;
}

interface HeroProps {
  data: AnalysisResult;
}

export default function Hero({ data }: HeroProps) {
  const { quote, ticker, name, sector } = data;
  const positive = quote.regularMarketChange >= 0;
  const fromHigh = ((quote.regularMarketPrice - quote.fiftyTwoWeekHigh) / quote.fiftyTwoWeekHigh * 100);
  const fromLow = ((quote.regularMarketPrice - quote.fiftyTwoWeekLow) / quote.fiftyTwoWeekLow * 100);

  const range52W = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const rangePct = range52W > 0
    ? ((quote.regularMarketPrice - quote.fiftyTwoWeekLow) / range52W * 100)
    : 50;

  return (
    <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-b border-stone-800 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

          {/* Left: Name + Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-stone-800 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-mono text-sm text-stone-400">{ticker}.NS</p>
                <p className="text-xs text-stone-600">{sector}</p>
              </div>
            </div>

            <h1 className="font-serif text-3xl font-bold text-stone-50 leading-tight">{name}</h1>

            <div className="flex items-baseline gap-3 mt-2">
              <span className="font-mono text-5xl font-bold text-stone-50">
                ₹{fmt(quote.regularMarketPrice)}
              </span>
              <div className={clsx('flex items-center gap-1', positive ? 'text-emerald-400' : 'text-red-400')}>
                {positive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                <span className="font-mono text-xl font-semibold">
                  {positive ? '+' : ''}{fmt(quote.regularMarketChange)} ({positive ? '+' : ''}{fmt(quote.regularMarketChangePercent, 2)}%)
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 font-mono flex items-center gap-1">
              <Clock className="h-3 w-3" />
              NSE · Live · INR
            </p>
          </div>

          {/* Right: Key stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:text-right">
            <StatBlock label="Open" value={`₹${fmt(quote.regularMarketOpen)}`} />
            <StatBlock label="Prev Close" value={`₹${fmt(quote.regularMarketPreviousClose)}`} />
            <StatBlock label="Day High" value={`₹${fmt(quote.regularMarketDayHigh)}`} highlight="emerald" />
            <StatBlock label="Day Low" value={`₹${fmt(quote.regularMarketDayLow)}`} highlight="red" />
            <StatBlock label="Market Cap" value={fmtCr(quote.marketCap)} />
            <StatBlock label="P/E (TTM)" value={quote.trailingPE ? `${fmt(quote.trailingPE, 1)}x` : '—'} />
            <StatBlock label="52W High" value={`₹${fmt(quote.fiftyTwoWeekHigh)}`} sub={`${fromHigh.toFixed(1)}% from here`} />
            <StatBlock label="52W Low" value={`₹${fmt(quote.fiftyTwoWeekLow)}`} sub={`${fromLow > 0 ? '+' : ''}${fromLow.toFixed(1)}% from here`} />
          </div>
        </div>

        {/* 52W Range bar */}
        <div className="mt-6 max-w-lg">
          <div className="flex justify-between text-xs text-stone-500 font-mono mb-1">
            <span>52W Low ₹{fmt(quote.fiftyTwoWeekLow)}</span>
            <span>52W High ₹{fmt(quote.fiftyTwoWeekHigh)}</span>
          </div>
          <div className="relative h-2 bg-stone-800 rounded-full overflow-visible">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/40 via-amber-400/40 to-emerald-400/40 rounded-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md shadow-black/50 border border-stone-300"
              style={{ left: `calc(${Math.min(98, Math.max(2, rangePct))}% - 6px)` }}
            />
          </div>
          <p className="text-xs text-stone-500 font-mono mt-1 text-center">
            {rangePct.toFixed(0)}th percentile of 52-week range
          </p>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'emerald' | 'red';
}) {
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <p className={clsx(
        'font-mono text-sm font-semibold mt-0.5',
        highlight === 'emerald' ? 'text-emerald-400' :
        highlight === 'red' ? 'text-red-400' : 'text-stone-200'
      )}>
        {value}
      </p>
      {sub && <p className="text-xs text-stone-600 mt-0.5">{sub}</p>}
    </div>
  );
}
