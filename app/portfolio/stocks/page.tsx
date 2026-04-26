'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { HoldingsTable } from '@/components/Portfolio/HoldingsTable';
import { AddHoldingModal } from '@/components/Portfolio/AddHoldingModal';
import { ZerodhaImport } from '@/components/Portfolio/ZerodhaImport';

interface StockItem {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  qty: number;
  avgBuyPrice: number;
  brokerName: string;
  accountId: string;
  cmp: number;
  currentValue: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  dayChangePct: number;
  quoteFailed?: boolean;
}

interface OverviewResponse {
  stocks: StockItem[];
  summary: {
    totalStockValue: number;
    totalInvested: number;
    totalPnL: number;
    totalPnLPct: number;
  };
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState({ totalStockValue: 0, totalInvested: 0, totalPnL: 0, totalPnLPct: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [activeAccount, setActiveAccount] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio/overview');
      const data = await res.json() as OverviewResponse;
      setStocks(data.stocks ?? []);
      setSummary({
        totalStockValue: data.summary.totalStockValue,
        totalInvested: data.summary.totalInvested,
        totalPnL: data.summary.totalPnL,
        totalPnLPct: data.summary.totalPnLPct,
      });
      setFailedCount((data.stocks ?? []).filter((s) => s.quoteFailed).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s during NSE market hours (9:15 – 15:30 IST, Mon–Fri)
  useEffect(() => {
    function isMarketOpen() {
      const now = new Date();
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const day = ist.getDay();
      if (day === 0 || day === 6) return false;
      const h = ist.getHours(), m = ist.getMinutes();
      const mins = h * 60 + m;
      return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
    }
    const id = setInterval(() => { if (isMarketOpen()) load(); }, 60000);
    return () => clearInterval(id);
  }, [load]);

  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  // Derive unique accounts
  const accounts = ['all', ...Array.from(new Set(stocks.map((s) => s.accountId))).sort()];
  const visibleStocks = activeAccount === 'all' ? stocks : stocks.filter((s) => s.accountId === activeAccount);

  // Per-account summary
  const visibleValue    = visibleStocks.reduce((a, s) => a + s.currentValue, 0);
  const visibleInvested = visibleStocks.reduce((a, s) => a + s.invested, 0);
  const visiblePnL      = visibleStocks.reduce((a, s) => a + s.pnl, 0);
  const visiblePnLPct   = visibleInvested > 0 ? (visiblePnL / visibleInvested) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Stock Holdings</h1>
          {!loading && (
            <p className="text-stone-500 text-xs mt-0.5">
              {visibleStocks.length} stocks ·{' '}
              <span className="text-stone-400">₹{fmt(visibleValue)}</span>
              {' '}·{' '}
              <span className={visiblePnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {visiblePnL >= 0 ? '+' : ''}₹{fmt(visiblePnL)}{' '}
                ({visiblePnL >= 0 ? '+' : ''}{visiblePnLPct.toFixed(2)}%)
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="p-2 text-stone-500 hover:text-stone-300 border border-stone-700 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm bg-amber-500 text-stone-950 font-semibold rounded-lg px-4 py-2 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" /> Add Stock
          </button>
        </div>
      </div>

      {/* Account tabs */}
      {accounts.length > 2 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {accounts.map((acc) => {
            const count = acc === 'all' ? stocks.length : stocks.filter((s) => s.accountId === acc).length;
            return (
              <button
                key={acc}
                onClick={() => setActiveAccount(acc)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  activeAccount === acc
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-stone-700 text-stone-500 hover:border-stone-600'
                }`}
              >
                {acc === 'all' ? 'All accounts' : `Account ${acc}`}
                <span className="ml-1.5 text-stone-600">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {!loading && failedCount > 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {failedCount} stock{failedCount > 1 ? 's' : ''} (ETFs / unlisted) could not fetch live prices — showing avg buy price as CMP.
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-stone-900 border border-stone-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <HoldingsTable
          stocks={visibleStocks}
          onDelete={(id) => setStocks((prev) => prev.filter((s) => s.id !== id))}
        />
      )}

      <div className="mt-6">
        <ZerodhaImport onImported={load} />
      </div>

      {showAdd && <AddHoldingModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}
