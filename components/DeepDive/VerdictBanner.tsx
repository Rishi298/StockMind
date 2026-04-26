'use client';

import { Target, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import type { AnalysisResult } from '@/app/api/analyze/[ticker]/route';
import clsx from 'clsx';

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const verdictConfig = {
  emerald: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    score: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  amber: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    score: 'text-amber-400',
    bar: 'bg-amber-500',
  },
  red: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    score: 'text-red-400',
    bar: 'bg-red-500',
  },
  violet: {
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/5',
    badge: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    score: 'text-violet-400',
    bar: 'bg-violet-500',
  },
};

interface VerdictBannerProps {
  data: AnalysisResult;
}

export default function VerdictBanner({ data }: VerdictBannerProps) {
  const { verdict, verdictColor, compositeScore, technical, entryZone, risk } = data;
  const cfg = verdictConfig[verdictColor];

  const scoreWidth = (compositeScore / 10) * 100;

  return (
    <div className={clsx('rounded-2xl border p-6', cfg.border, cfg.bg)}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">

        {/* Verdict + Score */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider', cfg.badge)}>
              Composite Score
            </span>
            <span className={clsx('font-mono text-3xl font-bold', cfg.score)}>
              {compositeScore.toFixed(1)}<span className="text-sm text-stone-500">/10</span>
            </span>
          </div>

          <div className="h-2 bg-stone-800 rounded-full overflow-hidden mb-4">
            <div
              className={clsx('h-full rounded-full transition-all duration-1000', cfg.bar)}
              style={{ width: `${scoreWidth}%` }}
            />
          </div>

          <p className="font-serif text-xl text-stone-100">{verdict}</p>
        </div>

        {/* Trade levels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:flex-shrink-0">
          <TradeLevel
            icon={<TrendingUp className="h-4 w-4" />}
            label="Entry Zone"
            value={`₹${fmt(entryZone.from)} – ₹${fmt(entryZone.to)}`}
            color="amber"
          />
          <TradeLevel
            icon={<Shield className="h-4 w-4" />}
            label="Stop Loss"
            value={`₹${fmt(technical.stopLoss)}`}
            color="red"
          />
          <TradeLevel
            icon={<Target className="h-4 w-4" />}
            label="Target 1"
            value={`₹${fmt(technical.target1)}`}
            color="emerald"
          />
          <TradeLevel
            icon={<Target className="h-4 w-4" />}
            label="Target 2"
            value={`₹${fmt(technical.target2)}`}
            color="emerald"
          />
        </div>
      </div>

      {/* Risk-reward + position */}
      <div className="mt-4 pt-4 border-t border-stone-800/60 flex flex-wrap gap-4 text-xs text-stone-500">
        <span>
          <span className="text-stone-400">Risk/Reward:</span>{' '}
          <span className="font-mono text-amber-400 font-semibold">1:{technical.riskReward}</span>
        </span>
        <span>
          <span className="text-stone-400">Position Size:</span>{' '}
          <span className="font-mono text-stone-300">{risk.positionSizing}</span>
        </span>
        <span>
          <span className="text-stone-400">Risk Grade:</span>{' '}
          <span className={clsx('font-mono font-semibold',
            risk.grade === 'A' ? 'text-emerald-400' :
            risk.grade === 'B' ? 'text-amber-400' :
            risk.grade === 'C' ? 'text-orange-400' : 'text-red-400'
          )}>
            {risk.grade}
          </span>
        </span>
        <span className="ml-auto flex items-center gap-1 text-stone-600">
          <AlertTriangle className="h-3 w-3" />
          Educational only. Not investment advice.
        </span>
      </div>
    </div>
  );
}

function TradeLevel({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'amber' | 'emerald' | 'red';
}) {
  const colors = {
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  };
  return (
    <div className="bg-stone-900/60 rounded-xl p-3 border border-stone-800">
      <div className={clsx('flex items-center gap-1.5 mb-1', colors[color])}>
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-mono text-sm font-semibold text-stone-200">{value}</p>
    </div>
  );
}
