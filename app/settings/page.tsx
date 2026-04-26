'use client';

import { useState } from 'react';
import { AngelOnePanel } from '@/components/AngelOnePanel';
import { ZerodhaImport } from '@/components/Portfolio/ZerodhaImport';
import { useRouter } from 'next/navigation';
import { RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';

function ScripMasterRefresh() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function refresh() {
    setStatus('running');
    setMsg('');
    try {
      const res = await fetch('/api/angel-one/resolve-tokens', { method: 'POST' });
      const d = await res.json() as { message?: string; error?: string };
      setStatus(res.ok ? 'done' : 'error');
      setMsg(d.message ?? d.error ?? '');
    } catch {
      setStatus('error');
      setMsg('Request failed');
    }
  }

  async function cacheFundamentals() {
    setStatus('running');
    setMsg('Caching fundamentals for Nifty 50 (takes ~2 min)...');
    try {
      const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'SBIN', 'LT', 'BAJFINANCE', 'KOTAKBANK', 'HINDUNILVR', 'AXISBANK', 'MARUTI', 'NTPC', 'SUNPHARMA', 'TATAMOTORS', 'WIPRO', 'TITAN', 'TECHM', 'NESTLEIND'];
      const res = await fetch(`/api/cache/fundamentals?symbols=${symbols.join(',')}`, { method: 'POST' });
      const d = await res.json() as { message?: string; error?: string };
      setStatus(res.ok ? 'done' : 'error');
      setMsg(d.message ?? d.error ?? '');
    } catch {
      setStatus('error');
      setMsg('Request failed');
    }
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-4 w-4 text-stone-400" />
        <h3 className="text-sm font-semibold text-stone-300">Data Maintenance</h3>
      </div>
      <p className="text-xs text-stone-500 mb-4">
        Refresh NSE token map (run when new stocks list) or cache fundamentals (P/E, market cap) for screener filters.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={refresh}
          disabled={status === 'running'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${status === 'running' ? 'animate-spin' : ''}`} />
          Refresh NSE Token Map
        </button>
        <button
          onClick={cacheFundamentals}
          disabled={status === 'running'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg disabled:opacity-50"
        >
          <Database className="h-3.5 w-3.5" />
          Cache Nifty 50 Fundamentals
        </button>
      </div>
      {msg && (
        <div className={`flex items-start gap-2 mt-3 text-xs ${status === 'done' ? 'text-emerald-400' : 'text-red-400'}`}>
          {status === 'done' ? <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
          <span>{msg}</span>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-xl font-bold text-stone-100 mb-1">Settings & Connections</h1>
      <p className="text-stone-500 text-sm mb-8">Manage your broker connections and data sources.</p>

      <div className="space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Broker Connections</h2>
          <AngelOnePanel onSynced={() => router.push('/portfolio')} />
        </section>

        <section>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Zerodha CSV Import</h2>
          <ZerodhaImport onImported={() => router.push('/portfolio/stocks')} />
        </section>

        <section>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Data Maintenance</h2>
          <ScripMasterRefresh />
        </section>

        <section>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Data Sources</h2>
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 text-xs text-stone-400">
            {[
              ['Live stock prices', 'Angel One SmartAPI → Yahoo Finance (fallback)', 'text-orange-400'],
              ['Mutual fund NAV', 'MFAPI.in (free, updated daily)', 'text-blue-400'],
              ['Stock fundamentals', 'Yahoo Finance (cached in DB)', 'text-stone-300'],
              ['NSE token map', 'Angel One ScripMaster (local JSON, 9,500+ stocks)', 'text-emerald-400'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span>{label}</span>
                <span className={`${color} font-semibold text-right`}>{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
