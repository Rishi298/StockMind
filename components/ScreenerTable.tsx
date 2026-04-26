'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Star } from 'lucide-react';
import type { ScreenerRow, Signal } from '@/app/api/screener/route';
import { ScreenerRowSkeleton } from '@/components/ui/LoadingSkeleton';
import clsx from 'clsx';

type SortKey = keyof Pick<ScreenerRow, 'price' | 'changePct' | 'marketCap' | 'pe' | 'pb' | 'dividendYield' | 'volume'>;

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function fmtCr(n: number): string {
  if (!n) return '—';
  const cr = n / 1e7; // Convert to crores
  if (cr >= 100000) return `₹${(cr / 100000).toFixed(1)}L Cr`;
  if (cr >= 1000) return `₹${(cr / 1000).toFixed(1)}K Cr`;
  return `₹${cr.toFixed(0)} Cr`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const SIGNAL_STYLES: Record<Signal, string> = {
  'Strong Buy': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Buy':        'bg-green-500/20 text-green-400 border-green-500/30',
  'Accumulate': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Hold':       'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Sell':       'bg-red-500/20 text-red-400 border-red-500/30',
};

function SortIcon({ col, active, dir }: { col: string; active: string; dir: 'asc' | 'desc' }) {
  if (col !== active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />;
}

interface ScreenerTableProps {
  rows: ScreenerRow[];
  loading: boolean;
}

export default function ScreenerTable({ rows, loading }: ScreenerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    const aVal = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
    const bVal = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const cols: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'changePct', label: 'Day %', align: 'right' },
    { key: 'marketCap', label: 'Mkt Cap', align: 'right' },
    { key: 'pe', label: 'P/E', align: 'right' },
    { key: 'pb', label: 'P/B', align: 'right' },
    { key: 'dividendYield', label: 'Div Yield', align: 'right' },
    { key: 'volume', label: 'Volume', align: 'right' },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-800 bg-stone-900/80">
            <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider w-64">
              Company
            </th>
            {cols.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-right text-xs font-medium text-stone-400 uppercase tracking-wider cursor-pointer hover:text-amber-400 transition-colors select-none"
                onClick={() => handleSort(col.key)}
              >
                <span className="flex items-center justify-end gap-1">
                  {col.label}
                  <SortIcon col={col.key} active={sortKey} dir={sortDir} />
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-medium text-stone-400 uppercase tracking-wider">
              52W Range
            </th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <ScreenerRowSkeleton key={i} />)
            : sorted.map((row) => <TableRow key={row.ticker} row={row} />)
          }
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-stone-500">
                No stocks found. Try a different preset or search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function WatchlistStar({ ticker }: { ticker: string }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      if (added) {
        await fetch(`/api/watchlist?symbol=${ticker}`, { method: 'DELETE' });
        setAdded(false);
      } else {
        await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: ticker }) });
        setAdded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [ticker, added]);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={added ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`transition-colors ${added ? 'text-amber-400' : 'text-stone-700 hover:text-amber-400'}`}
    >
      <Star className={`h-3.5 w-3.5 ${added ? 'fill-amber-400' : ''}`} />
    </button>
  );
}

function TableRow({ row }: { row: ScreenerRow }) {
  const changePositive = row.changePct >= 0;
  const aboveMA50 = row.price > row.dma50 && row.dma50 > 0;
  const aboveMA200 = row.price > row.dma200 && row.dma200 > 0;

  // 52W range position
  const range = row.fiftyTwoWeekHigh - row.fiftyTwoWeekLow;
  const rangePct = range > 0 ? ((row.price - row.fiftyTwoWeekLow) / range) * 100 : 50;

  const dyPct = row.dividendYield
    ? row.dividendYield > 1
      ? row.dividendYield
      : row.dividendYield * 100
    : null;

  return (
    <tr className="border-b border-stone-800/50 hover:bg-stone-900/40 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-stone-100">{row.ticker}</span>
              <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-medium', SIGNAL_STYLES[row.signal])}>
                {row.signal}
              </span>
            </div>
            <div className="text-xs text-stone-400 mt-0.5 max-w-[180px] truncate">{row.name}</div>
            <div className="text-[10px] text-stone-600 mt-0.5">{row.sector}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-right font-mono text-sm text-stone-200">
        ₹{fmt(row.price)}
      </td>

      <td className={clsx('px-4 py-3 text-right font-mono text-sm', changePositive ? 'text-emerald-400' : 'text-red-400')}>
        {fmtPct(row.changePct)}
      </td>

      <td className="px-4 py-3 text-right font-mono text-xs text-stone-300">
        {fmtCr(row.marketCap)}
      </td>

      <td className="px-4 py-3 text-right font-mono text-xs text-stone-300">
        {row.pe ? `${fmt(row.pe, 1)}x` : '—'}
      </td>

      <td className="px-4 py-3 text-right font-mono text-xs text-stone-300">
        {row.pb ? `${fmt(row.pb, 2)}x` : '—'}
      </td>

      <td className="px-4 py-3 text-right font-mono text-xs text-stone-300">
        {dyPct ? `${fmt(dyPct, 2)}%` : '—'}
      </td>

      <td className="px-4 py-3 text-right font-mono text-xs text-stone-400">
        {row.volume >= 1e6
          ? `${(row.volume / 1e6).toFixed(1)}M`
          : row.volume >= 1e3
          ? `${(row.volume / 1e3).toFixed(0)}K`
          : row.volume.toLocaleString()}
      </td>

      <td className="px-4 py-3 w-36">
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-stone-600 font-mono">
            <span>₹{row.fiftyTwoWeekLow.toFixed(0)}</span>
            <span>₹{row.fiftyTwoWeekHigh.toFixed(0)}</span>
          </div>
          <div className="relative h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full"
              style={{ width: '100%' }}
            />
            <div
              className="absolute top-0 w-2 h-2 bg-white rounded-full -mt-0.5 shadow"
              style={{ left: `calc(${Math.min(100, Math.max(0, rangePct))}% - 4px)` }}
            />
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <WatchlistStar ticker={row.ticker} />
          <Link href={`/stock/${row.ticker}`} className="text-stone-400 hover:text-amber-400">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
