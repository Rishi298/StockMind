'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, ExternalLink } from 'lucide-react';
import { PnlBadge } from './PortfolioSummary';
import { stockXirr, formatXirr } from '@/lib/xirr';

interface StockItem {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  qty: number;
  avgBuyPrice: number;
  buyDate?: string;
  cmp: number;
  currentValue: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  dayChangePct: number;
  brokerName?: string;
  quoteFailed?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

interface Props {
  stocks: StockItem[];
  onDelete: (id: number) => void;
}

export function HoldingsTable({ stocks, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null);

  if (!stocks.length) {
    return <p className="text-stone-500 text-sm text-center py-12">No stock holdings yet. Add your first holding above.</p>;
  }

  async function handleDelete(id: number) {
    await fetch(`/api/portfolio/stocks?id=${id}`, { method: 'DELETE' });
    onDelete(id);
    setConfirmId(null);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-800 bg-stone-900/50">
            {['Symbol', 'Name', 'Qty', 'Avg Buy', 'CMP', 'Value', 'P&L', 'XIRR', 'Day %', 'Broker', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => (
            <tr key={s.id} className="border-b border-stone-800/50 hover:bg-stone-900/40 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/stock/${s.symbol}`} className="flex items-center gap-1 text-amber-400 font-mono font-bold hover:text-amber-300">
                  {s.symbol} <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
                {s.quoteFailed && (
                  <span className="text-[10px] text-stone-600 mt-0.5 block">no live price</span>
                )}
              </td>
              <td className="px-4 py-3 text-stone-300 text-xs max-w-[160px] truncate">{s.name}</td>
              <td className="px-4 py-3 text-stone-200 font-mono">{s.qty}</td>
              <td className="px-4 py-3 text-stone-300 font-mono">₹{fmt(s.avgBuyPrice)}</td>
              <td className={`px-4 py-3 font-mono font-semibold ${s.quoteFailed ? 'text-stone-600' : 'text-stone-200'}`}>
                ₹{fmt(s.cmp)}
              </td>
              <td className="px-4 py-3 text-stone-200 font-mono">₹{fmt(s.currentValue)}</td>
              <td className="px-4 py-3">
                <div>
                  <p className={`font-mono text-xs font-semibold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s.pnl >= 0 ? '+' : ''}₹{fmt(s.pnl)}
                  </p>
                  <PnlBadge pct={s.pnlPct} />
                </div>
              </td>
              <td className="px-4 py-3">
                {s.buyDate && s.cmp > 0 ? (
                  <span className={`text-xs font-mono font-semibold ${
                    (() => { const r = stockXirr(new Date(s.buyDate), s.avgBuyPrice, s.qty, s.cmp); return r !== null && r >= 0 ? 'text-emerald-400' : 'text-red-400'; })()
                  }`}>
                    {formatXirr(stockXirr(new Date(s.buyDate), s.avgBuyPrice, s.qty, s.cmp))}
                  </span>
                ) : <span className="text-stone-600 text-xs">—</span>}
              </td>
              <td className="px-4 py-3">
                <PnlBadge pct={s.dayChangePct} />
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-stone-500 bg-stone-800 rounded px-2 py-0.5">{s.brokerName ?? 'Manual'}</span>
              </td>
              <td className="px-4 py-3">
                {confirmId === s.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Confirm</button>
                    <button onClick={() => setConfirmId(null)} className="text-xs text-stone-500 hover:text-stone-300">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(s.id)} className="text-stone-600 hover:text-red-400 transition-colors">
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
