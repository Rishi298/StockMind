'use client';

import { useState } from 'react';
import { Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PnlBadge } from './PortfolioSummary';

interface MFItem {
  id: number;
  schemeCode: string;
  schemeName: string;
  amcName: string;
  units: number;
  avgNav: number;
  investedAmount: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  trailing1M: number;
  trailing3M: number;
  trailing1Y: number;
  direction?: 'positive' | 'negative' | 'sideways';
  consecutiveUnderperformMonths?: number;
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function DirectionBadge({ direction, months }: { direction?: string; months?: number }) {
  if (direction === 'positive') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
        <TrendingUp className="h-3 w-3" /> Positive
      </span>
    );
  }
  if (direction === 'negative') {
    return (
      <div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 rounded-full px-2 py-0.5">
          <TrendingDown className="h-3 w-3" /> Negative
        </span>
        {months && months >= 3 && (
          <p className="text-[10px] text-red-500 mt-0.5">{months}m underperforming</p>
        )}
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
      <Minus className="h-3 w-3" /> Sideways
    </span>
  );
}

interface Props {
  mfs: MFItem[];
  onDelete: (id: number) => void;
}

export function MFHoldingsTable({ mfs, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null);

  if (!mfs.length) {
    return <p className="text-stone-500 text-sm text-center py-12">No mutual fund holdings yet. Add your first fund above.</p>;
  }

  async function handleDelete(id: number) {
    await fetch(`/api/portfolio/mf?id=${id}`, { method: 'DELETE' });
    onDelete(id);
    setConfirmId(null);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-800 bg-stone-900/50">
            {['Fund Name', 'Units', 'Avg NAV', 'Value', 'P&L', '1M', '3M', '1Y', 'Direction', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mfs.map((m) => (
            <tr key={m.id} className="border-b border-stone-800/50 hover:bg-stone-900/40 transition-colors">
              <td className="px-4 py-3 max-w-[220px]">
                <p className="text-stone-200 text-xs font-medium truncate">{m.schemeName}</p>
                <p className="text-stone-500 text-[10px] truncate">{m.amcName}</p>
              </td>
              <td className="px-4 py-3 text-stone-300 font-mono text-xs">{m.units.toFixed(3)}</td>
              <td className="px-4 py-3 text-stone-300 font-mono text-xs">₹{fmt(m.avgNav)}</td>
              <td className="px-4 py-3 text-stone-200 font-mono text-xs font-semibold">₹{fmt(m.currentValue)}</td>
              <td className="px-4 py-3">
                <div>
                  <p className={`font-mono text-xs font-semibold ${m.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.pnl >= 0 ? '+' : ''}₹{fmt(m.pnl)}
                  </p>
                  <PnlBadge pct={m.pnlPct} />
                </div>
              </td>
              <td className="px-4 py-3"><PnlBadge pct={m.trailing1M} /></td>
              <td className="px-4 py-3"><PnlBadge pct={m.trailing3M} /></td>
              <td className="px-4 py-3"><PnlBadge pct={m.trailing1Y} /></td>
              <td className="px-4 py-3">
                <DirectionBadge direction={m.direction} months={m.consecutiveUnderperformMonths} />
              </td>
              <td className="px-4 py-3">
                {confirmId === m.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(m.id)} className="text-xs text-red-400 hover:text-red-300">Confirm</button>
                    <button onClick={() => setConfirmId(null)} className="text-xs text-stone-500 hover:text-stone-300">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(m.id)} className="text-stone-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
