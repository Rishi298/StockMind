'use client';

import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';

interface SummaryData {
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  totalPnLPct: number;
  totalStockValue: number;
  totalMFValue: number;
  todayChange: number;
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function Card({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-stone-100">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 font-medium ${positive === undefined ? 'text-stone-500' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function PortfolioSummary({ summary }: { summary: SummaryData }) {
  const pnlPos = summary.totalPnL >= 0;
  const todayPos = summary.todayChange >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Total Value"
        value={`₹${fmt(summary.totalValue)}`}
        sub={`Invested: ₹${fmt(summary.totalInvested)}`}
      />
      <Card
        label="Total P&L"
        value={`${pnlPos ? '+' : ''}₹${fmt(summary.totalPnL)}`}
        sub={`${pnlPos ? '+' : ''}${fmt(summary.totalPnLPct)}% overall`}
        positive={pnlPos}
      />
      <Card
        label="Today's Change"
        value={`${todayPos ? '+' : ''}₹${fmt(summary.todayChange)}`}
        sub={`Stocks only (live)`}
        positive={todayPos}
      />
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
        <p className="text-xs text-stone-500 uppercase tracking-wider mb-3">Allocation</p>
        <div className="flex items-center gap-2 mb-1.5">
          <BarChart2 className="h-3 w-3 text-amber-400" />
          <span className="text-xs text-stone-400">Stocks</span>
          <span className="ml-auto text-xs font-semibold text-stone-200">₹{fmt(summary.totalStockValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-blue-400" />
          <span className="text-xs text-stone-400">Mutual Funds</span>
          <span className="ml-auto text-xs font-semibold text-stone-200">₹{fmt(summary.totalMFValue)}</span>
        </div>
        {summary.totalValue > 0 && (
          <div className="mt-3 h-2 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${(summary.totalStockValue / summary.totalValue) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center mb-4">
        <DollarSign className="h-8 w-8 text-stone-600" />
      </div>
      <h2 className="text-xl font-semibold text-stone-300 mb-2">No holdings yet</h2>
      <p className="text-stone-500 text-sm max-w-sm">
        Add your first stock or mutual fund to start tracking your portfolio performance.
      </p>
    </div>
  );
}

export function PnlBadge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
      {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pos ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}
