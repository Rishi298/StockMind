'use client';

import { useState } from 'react';
import {
  AlertTriangle, Scissors, PlusCircle, TrendingDown, RotateCcw,
  Loader2, Shield, Target, BarChart2, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { RebalanceReport as Report, ReviewItem, TrimItem, AddItem, DiversificationScore } from '@/lib/rebalancer';

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

function scoreColor(v: number) {
  return v >= 70 ? 'text-emerald-400' : v >= 45 ? 'text-amber-400' : 'text-red-400';
}
function scoreBarColor(v: number) {
  return v >= 70 ? 'bg-emerald-500' : v >= 45 ? 'bg-amber-500' : 'bg-red-500';
}

function ScoreBreakdown({ score }: { score: DiversificationScore }) {
  const label = score.total >= 70 ? 'Well diversified' : score.total >= 45 ? 'Moderate' : 'Concentrated';
  const factors = [
    { label: 'Position spread', value: score.positionConcentration, tip: 'How evenly weighted across all stocks' },
    { label: 'Sector spread', value: score.sectorSpread, tip: 'Breadth + evenness across sectors' },
    { label: 'Max position risk', value: score.maxPositionRisk, tip: 'Penalty for any single runaway position' },
    { label: 'Benchmark fit', value: score.benchmarkAlignment, tip: 'How close to Nifty 50 sector weights' },
  ];
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-stone-500 uppercase tracking-wider">Diversification Score</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-3xl font-bold ${scoreColor(score.total)}`}>{score.total}</span>
            <span className="text-xs text-stone-500">/ 100 · {label}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2.5">
        {factors.map((f) => (
          <div key={f.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-stone-500" title={f.tip}>{f.label}</span>
              <span className={`font-mono font-semibold ${scoreColor(f.value)}`}>{f.value}</span>
            </div>
            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${scoreBarColor(f.value)}`} style={{ width: `${f.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectorBar({ sector, portfolioPct, benchmarkPct }: { sector: string; portfolioPct: number; benchmarkPct: number }) {
  const overweight = portfolioPct > benchmarkPct * 1.5;
  const underweight = portfolioPct < benchmarkPct * 0.4;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`truncate max-w-[120px] ${overweight ? 'text-amber-400' : underweight ? 'text-blue-400' : 'text-stone-400'}`}>
          {sector}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-stone-500 text-[10px]">bench {benchmarkPct.toFixed(1)}%</span>
          <span className={`font-mono font-semibold ${overweight ? 'text-amber-400' : underweight ? 'text-stone-500' : 'text-stone-300'}`}>
            {portfolioPct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="relative h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{
          width: `${Math.min(portfolioPct * 3, 100)}%`,
          background: overweight ? '#f59e0b' : underweight ? '#60a5fa' : '#6b7280',
        }} />
        {benchmarkPct > 0 && (
          <div className="absolute top-0 h-full w-0.5 bg-stone-600" style={{ left: `${Math.min(benchmarkPct * 3, 100)}%` }} />
        )}
      </div>
    </div>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl p-4 ${item.urgency === 'high' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono font-bold text-sm text-stone-200">{item.symbol}</span>
            <span className="text-[10px] text-stone-500 bg-stone-800 rounded px-1.5 py-0.5">{item.type.toUpperCase()}</span>
            {item.accountId && item.accountId !== 'default' && (
              <span className="text-[10px] text-stone-600 border border-stone-800 rounded px-1.5 py-0.5">{item.accountId}</span>
            )}
            {item.urgency === 'high'
              ? <span className="text-[10px] font-bold text-red-400 bg-red-500/10 rounded px-1.5 py-0.5">URGENT</span>
              : <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5">REVIEW</span>
            }
          </div>
          <p className="text-xs text-stone-400">{item.reason}</p>
          {open && (
            <p className="text-xs text-amber-300 mt-1.5 flex items-center gap-1">
              <Target className="h-3 w-3 shrink-0" /> {item.action}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-stone-200">₹{fmt(item.currentValue)}</p>
          <p className={`text-xs font-semibold ${item.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%
          </p>
          {item.pnlAbs !== 0 && (
            <p className={`text-[10px] ${item.pnlAbs >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {item.pnlAbs >= 0 ? '+' : ''}₹{fmt(Math.abs(item.pnlAbs))}
            </p>
          )}
        </div>
      </div>
      <button onClick={() => setOpen((v) => !v)} className="mt-2 flex items-center gap-1 text-[10px] text-stone-600 hover:text-stone-400">
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {open ? 'Hide action' : 'Show recommended action'}
      </button>
    </div>
  );
}

function TrimCard({ item }: { item: TrimItem }) {
  return (
    <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-stone-200">{item.symbol}</span>
            {item.accountId && item.accountId !== 'default' && (
              <span className="text-[10px] text-stone-600 border border-stone-800 rounded px-1.5 py-0.5">{item.accountId}</span>
            )}
            <span className="text-[10px] text-stone-500 bg-stone-800 rounded px-1.5 py-0.5">{item.type.toUpperCase()}</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5 truncate">{item.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-stone-500">{item.currentWeight.toFixed(1)}% → {item.targetWeight.toFixed(1)}%</p>
          <p className="text-sm font-semibold text-amber-400">Sell ₹{fmt(item.excessValue)}</p>
        </div>
      </div>
      <div className="mt-2.5 relative h-2 bg-stone-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${Math.min(item.currentWeight * 5, 100)}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-emerald-500/60" style={{ left: `${Math.min(item.targetWeight * 5, 100)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-stone-600 mt-0.5">
        <span>Current</span><span>Target</span>
      </div>
    </div>
  );
}

function AddCard({ item }: { item: AddItem }) {
  return (
    <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-stone-200">{item.symbol}</span>
            <span className="text-[10px] text-stone-500 bg-stone-800 rounded px-1.5 py-0.5">{item.sector}</span>
          </div>
          <p className="text-xs text-stone-400 truncate mt-0.5">{item.name}</p>
          <p className="text-xs text-stone-500 mt-1">{item.reason}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-emerald-400 font-semibold">{item.suggestedAllocationPct.toFixed(1)}%</p>
          {item.suggestedAmount > 0 && (
            <p className="text-xs text-stone-500 mt-0.5">~₹{fmt(item.suggestedAmount)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RebalanceReport({ initial }: { initial?: Report }) {
  const [report, setReport] = useState<Report | undefined>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'review' | 'trim' | 'add' | 'sectors'>('review');

  async function runAnalysis() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rebalance');
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json() as Report;
      setReport(data);
      setActiveTab(data.review.length > 0 ? 'review' : data.trim.length > 0 ? 'trim' : 'sectors');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: 'review' as const, label: 'Review', count: report?.review.length ?? 0, icon: AlertTriangle, color: 'text-red-400', activeClass: 'border-red-500 text-red-400 bg-red-500/10' },
    { id: 'trim' as const, label: 'Trim', count: report?.trim.length ?? 0, icon: Scissors, color: 'text-amber-400', activeClass: 'border-amber-500 text-amber-400 bg-amber-500/10' },
    { id: 'add' as const, label: 'Add', count: report?.add.length ?? 0, icon: PlusCircle, color: 'text-emerald-400', activeClass: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
    { id: 'sectors' as const, label: 'Sectors', count: report?.sectorBreakdown.length ?? 0, icon: BarChart2, color: 'text-blue-400', activeClass: 'border-blue-500 text-blue-400 bg-blue-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Portfolio Rebalancer</h2>
          {report && (
            <p className="text-xs text-stone-500 mt-0.5">
              Last run: {new Date(report.generatedAt).toLocaleString('en-IN')}
              {' '}·{' '}
              <span className={report.priceSource === 'angel' ? 'text-orange-400' : 'text-stone-500'}>
                {report.priceSource === 'angel' ? 'Angel One prices' : 'Yahoo Finance prices'}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-semibold text-sm rounded-lg hover:bg-amber-400 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {loading ? 'Analysing…' : 'Run Analysis'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}

      {!report && !loading && (
        <div className="text-center py-16 text-stone-500">
          <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click "Run Analysis" to get rebalancing recommendations.</p>
          <p className="text-xs mt-1 text-stone-600">Uses live Angel One prices for accurate position sizing.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-stone-500">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin opacity-40" />
          <p className="text-sm">Fetching live prices for all holdings…</p>
          <p className="text-xs mt-1 text-stone-600">This may take 10–20 seconds for large portfolios.</p>
        </div>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ScoreBreakdown score={report.summary.diversificationScore} />
            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              {[
                { label: 'Total Value', value: `₹${fmt(report.summary.totalValue)}`, sub: `Invested ₹${fmt(report.summary.totalInvested)}`, color: 'text-stone-100' },
                { label: 'Total P&L', value: `${report.summary.totalPnL >= 0 ? '+' : ''}₹${fmt(report.summary.totalPnL)}`, sub: `${report.summary.totalPnLPct >= 0 ? '+' : ''}${report.summary.totalPnLPct.toFixed(2)}%`, color: report.summary.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Largest Position', value: report.summary.largestPosition.symbol, sub: `${report.summary.largestPosition.weight.toFixed(1)}% of portfolio`, color: report.summary.largestPosition.weight > 10 ? 'text-amber-400' : 'text-stone-100' },
                { label: 'Top Sector', value: report.summary.topSector.name, sub: `${report.summary.topSector.weight.toFixed(1)}% of portfolio`, color: report.summary.topSector.weight > 35 ? 'text-amber-400' : 'text-stone-100' },
                { label: 'Holdings', value: `${report.summary.stockCount}S + ${report.summary.mfCount}MF`, sub: `Avg ₹${fmt(report.summary.avgPositionSize)} / stock`, color: 'text-stone-100' },
                { label: 'Price Source', value: report.priceSource === 'angel' ? 'Angel One' : 'Yahoo Finance', sub: report.priceSource === 'angel' ? 'Live NSE prices' : 'Delayed prices', color: report.priceSource === 'angel' ? 'text-orange-400' : 'text-stone-400' },
              ].map((c) => (
                <div key={c.label} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                  <p className="text-[10px] text-stone-500 mb-1">{c.label}</p>
                  <p className={`text-sm font-bold truncate ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-stone-600 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap border-b border-stone-800 pb-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  activeTab === t.id ? t.activeClass : 'border-stone-700 text-stone-500 hover:border-stone-600'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                <span className={`ml-0.5 ${activeTab === t.id ? '' : 'text-stone-600'}`}>({t.count})</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'review' && (
            <section className="space-y-2">
              {report.review.length === 0 ? (
                <div className="text-center py-10 text-stone-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No urgent reviews needed — portfolio looks healthy.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-stone-500 mb-3">
                    {report.review.filter((r) => r.urgency === 'high').length} urgent · {report.review.filter((r) => r.urgency === 'medium').length} review
                    {' '}— Click any card to see the recommended action.
                  </p>
                  {report.review.map((item, i) => <ReviewCard key={i} item={item} />)}
                </>
              )}
            </section>
          )}

          {activeTab === 'trim' && (
            <section className="space-y-2">
              {report.trim.length === 0 ? (
                <div className="text-center py-10 text-stone-500">
                  <Scissors className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No overweight positions detected.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-stone-500 mb-3">
                    Trimming these would free ₹{fmt(report.trim.reduce((a, t) => a + t.excessValue, 0))} for redeployment.
                    {' '}Green line shows target weight.
                  </p>
                  {report.trim.map((item, i) => <TrimCard key={i} item={item} />)}
                </>
              )}
            </section>
          )}

          {activeTab === 'add' && (
            <section className="space-y-2">
              {report.add.length === 0 ? (
                <div className="text-center py-10 text-stone-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Portfolio covers all major Nifty 50 sectors.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-stone-500 mb-3">
                    Sectors underweight vs Nifty 50 benchmark. Suggested amounts based on freed capital from Trim.
                  </p>
                  {report.add.map((item, i) => <AddCard key={i} item={item} />)}
                </>
              )}
            </section>
          )}

          {activeTab === 'sectors' && (
            <section>
              <p className="text-xs text-stone-500 mb-4">
                <span className="text-amber-400">■</span> Overweight vs benchmark &nbsp;
                <span className="text-blue-400">■</span> Underweight &nbsp;
                <span className="text-stone-500">│</span> Nifty 50 benchmark
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {report.sectorBreakdown.map((s) => (
                  <SectorBar key={s.sector} sector={s.sector} portfolioPct={s.portfolioPct} benchmarkPct={s.benchmarkPct} />
                ))}
              </div>
              {report.review.length === 0 && report.trim.length === 0 && (
                <div className="mt-6 text-center py-8 text-stone-500">
                  <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-30 rotate-180" />
                  <p className="text-sm font-medium text-stone-400">Portfolio looks balanced!</p>
                  <p className="text-xs mt-1">No urgent rebalancing actions required.</p>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
