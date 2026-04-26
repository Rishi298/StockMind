'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Star, Trash2, RefreshCw, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  addedAt: string;
  price: number;
  changePct: number;
  high52: number;
  low52: number;
  volume: number;
  signal: string;
}

const SIGNAL_COLOR: Record<string, string> = {
  'Strong Buy': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'Buy':        'text-green-400 bg-green-500/10 border-green-500/30',
  'Accumulate': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  'Hold':       'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'Sell':       'text-red-400 bg-red-500/10 border-red-500/30',
};

function fmt(n: number) { return n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist');
      setItems(await res.json() as WatchlistItem[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(symbol: string) {
    await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Star className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-100">Watchlist</h1>
            <p className="text-xs text-stone-500">{items.length} stocks being tracked</p>
          </div>
        </div>
        <button onClick={() => load()} disabled={loading} className="p-2 text-stone-500 hover:text-stone-300 border border-stone-700 rounded-lg disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-20">
          <Star className="h-12 w-12 text-stone-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-stone-400 mb-2">Your watchlist is empty</h2>
          <p className="text-stone-600 text-sm mb-4">Add stocks from the screener or deep-dive pages using the ★ button.</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm border border-amber-500/30 rounded-lg px-4 py-2">
            Browse Screener →
          </Link>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="h-14 bg-stone-900 border border-stone-800 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-stone-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-900/50">
                {['Symbol', 'Name', 'Price', 'Day %', '52W Range', 'Signal', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const range = item.high52 - item.low52;
                const pos = range > 0 ? ((item.price - item.low52) / range) * 100 : 0;
                return (
                  <tr key={item.symbol} className="border-b border-stone-800/50 hover:bg-stone-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/stock/${item.symbol}`} className="flex items-center gap-1 text-amber-400 font-mono font-bold hover:text-amber-300">
                        {item.symbol} <ExternalLink className="h-3 w-3 opacity-50" />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-300 text-xs truncate max-w-[180px]">{item.name}</p>
                      <p className="text-stone-600 text-[10px]">{item.sector}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-200 font-mono font-semibold">
                      {item.price > 0 ? `₹${fmt(item.price)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.price > 0 && (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${item.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {item.changePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      {item.high52 > 0 && (
                        <div>
                          <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-amber-500/70 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pos))}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-stone-600">
                            <span>₹{fmt(item.low52)}</span>
                            <span>₹{fmt(item.high52)}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.signal && (
                        <span className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 ${SIGNAL_COLOR[item.signal] ?? 'text-stone-400 bg-stone-800 border-stone-700'}`}>
                          {item.signal}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(item.symbol)} className="text-stone-600 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
