'use client';

import { useState, useCallback, useRef } from 'react';
import useSWR from 'swr';
import ScreenerTable from '@/components/ScreenerTable';
import FilterSliders, { DEFAULT_FILTERS, type FilterState } from '@/components/FilterSliders';
import PresetChips, { PRESETS } from '@/components/PresetChips';
import type { ScreenerRow, Signal } from '@/app/api/screener/route';
import { RefreshCw, TrendingUp, Zap, Search, X } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

interface CompositeSignal { ticker: string; score: number; signal: Signal; verdict: string; }
type PresetId = (typeof PRESETS)[number]['id'];
interface ScreenerResponse { rows: ScreenerRow[]; count: number; preset: string | null; }
interface NSEResult { symbol: string; name: string; sector: string; inUniverse: boolean; }

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error('Network error'); return r.json(); });

const INDEX_TABS = [
  { id: 'default', label: 'Nifty 50', param: null },
  { id: 'next50',  label: 'Nifty Next 50', param: 'next50' },
  { id: 'midcap',  label: 'Midcap 150', param: 'midcap' },
  { id: 'small',   label: 'Smallcap 250', param: 'small' },
] as const;

function buildURL(preset: PresetId | null, index: string | null, query: string): string {
  const p = new URLSearchParams({ limit: '25' });
  if (preset)      p.set('preset', preset);
  else if (query)  p.set('q', query);
  else if (index)  p.set('index', index);
  return `/api/screener?${p}`;
}

function applyFilters(rows: ScreenerRow[], filters: FilterState, signal: Signal | null): ScreenerRow[] {
  return rows.filter((r) => {
    if (signal && r.signal !== signal) return false;
    if (r.pe !== null && (r.pe < filters.minPE || r.pe > filters.maxPE)) return false;
    if (r.marketCap > 0) {
      const mcCr = r.marketCap / 1e7;
      if (mcCr < filters.minMarketCap || mcCr > filters.maxMarketCap) return false;
    }
    if (r.changePct < filters.minChange || r.changePct > filters.maxChange) return false;
    return true;
  });
}

export default function HomePage() {
  const [preset, setPreset]           = useState<PresetId | null>(null);
  const [activeIndex, setActiveIndex] = useState<string | null>(null);
  const [filters, setFilters]         = useState<FilterState>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [signalFilter, setSignalFilter] = useState<Signal | null>(null);
  const [compositeSignals, setCompositeSignals] = useState<Map<string, CompositeSignal>>(new Map());
  const [signaturesLoading, setSignaturesLoading] = useState(false);

  // Universal NSE search suggestions
  const [suggestions, setSuggestions] = useState<NSEResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanRef = useRef<AbortController | null>(null);

  const url = buildURL(preset, activeIndex, searchQuery);

  const fetchCompositeSignals = useCallback((tickers: string[]) => {
    if (scanRef.current) scanRef.current.abort();
    scanRef.current = new AbortController();
    setSignaturesLoading(true);
    fetch(`/api/signals?tickers=${tickers.join(',')}`, { signal: scanRef.current.signal })
      .then((r) => r.json())
      .then((data: CompositeSignal[]) => {
        setCompositeSignals(new Map(data.map((s) => [s.ticker, s])));
        setSignaturesLoading(false);
      })
      .catch(() => setSignaturesLoading(false));
  }, []);

  const { data, error, isLoading, mutate } = useSWR<ScreenerResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const rows = (data?.rows ?? []).map((r) => {
    const cs = compositeSignals.get(r.ticker);
    return cs ? { ...r, signal: cs.signal } : r;
  });
  const filtered = applyFilters(rows, filters, signalFilter);

  function handleSearchInput(val: string) {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/nse-search?q=${encodeURIComponent(val)}`);
      const data = await res.json() as NSEResult[];
      setSuggestions(data);
      setShowSuggestions(true);
    }, 300);
  }

  function selectSuggestion(s: NSEResult) {
    setSearchInput(s.symbol);
    setSearchQuery(s.symbol);
    setPreset(null);
    setActiveIndex(null);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function handleSearchSubmit() {
    setSearchQuery(searchInput);
    setPreset(null);
    setActiveIndex(null);
    setShowSuggestions(false);
  }

  function clearSearch() {
    setSearchInput('');
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function selectIndex(param: string | null) {
    setActiveIndex(param);
    setPreset(null);
    setSearchQuery('');
    setSearchInput('');
  }

  function selectPreset(p: PresetId | null) {
    setPreset(p);
    setActiveIndex(null);
    setSearchQuery('');
    setSearchInput('');
  }

  const activeTab = INDEX_TABS.find((t) => t.param === activeIndex) ?? INDEX_TABS[0];
  const activePreset = PRESETS.find((p) => p.id === preset);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          <span className="text-xs text-stone-500 font-mono uppercase tracking-widest">NSE Stock Screener</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-50 leading-tight">StockMind Terminal</h1>
        <p className="text-stone-400 text-sm max-w-lg mx-auto">
          Screen 500+ NSE stocks — Large Cap, Mid Cap, Smallcap. Deep analysis with 6 AI agents.
        </p>
      </div>

      {/* Universal Search */}
      <div className="relative max-w-xl mx-auto">
        <div className="flex items-center bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 gap-2 focus-within:border-amber-500/60">
          <Search className="h-4 w-4 text-stone-500 shrink-0" />
          <input
            className="flex-1 bg-transparent text-stone-200 text-sm placeholder-stone-600 focus:outline-none"
            placeholder="Search any NSE stock — e.g. RELIANCE, Infosys, smallcap pharma..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {searchInput && (
            <button onClick={clearSearch} className="text-stone-600 hover:text-stone-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-stone-900 border border-stone-700 rounded-xl z-20 overflow-hidden shadow-xl">
            {suggestions.map((s) => (
              <button
                key={s.symbol}
                onMouseDown={() => selectSuggestion(s)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-800 text-left"
              >
                <span className="font-mono font-bold text-amber-400 text-sm w-24 shrink-0">{s.symbol}</span>
                <span className="text-xs text-stone-300 flex-1 truncate">{s.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {s.sector && <span className="text-[10px] text-stone-600">{s.sector}</span>}
                  {!s.inUniverse && <span className="text-[10px] text-amber-600 bg-amber-500/10 rounded px-1">NSE</span>}
                </div>
              </button>
            ))}
            {suggestions.some((s) => !s.inUniverse) && (
              <p className="text-[10px] text-stone-600 px-4 py-2 border-t border-stone-800">
                Stocks marked NSE are outside Nifty 500 — click to analyse via deep-dive
              </p>
            )}
          </div>
        )}
      </div>

      {/* Index Tabs */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {INDEX_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectIndex(tab.param)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-lg border transition-all',
              activeTab.id === tab.id && !preset && !searchQuery
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 font-semibold'
                : 'border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Strategy Presets */}
      <div className="space-y-2">
        <p className="text-xs text-stone-600 text-center uppercase tracking-wider">Strategy Presets</p>
        <PresetChips selected={preset} onChange={selectPreset} />
      </div>

      {/* Filters */}
      <FilterSliders filters={filters} onChange={setFilters} />

      {/* Signal Filter + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {(['Strong Buy', 'Buy', 'Accumulate', 'Hold', 'Sell'] as Signal[]).map((sig) => {
            const active = signalFilter === sig;
            const colorCls = {
              'Strong Buy': 'emerald', 'Buy': 'green', 'Accumulate': 'cyan', 'Hold': 'amber', 'Sell': 'red',
            }[sig];
            const cls = {
              emerald: active ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400' : 'border-stone-700 text-stone-500 hover:border-emerald-500/40 hover:text-emerald-400',
              green:   active ? 'border-green-500 bg-green-500/15 text-green-400'       : 'border-stone-700 text-stone-500 hover:border-green-500/40 hover:text-green-400',
              cyan:    active ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'          : 'border-stone-700 text-stone-500 hover:border-cyan-500/40 hover:text-cyan-400',
              amber:   active ? 'border-amber-500 bg-amber-500/15 text-amber-400'       : 'border-stone-700 text-stone-500 hover:border-amber-500/40 hover:text-amber-400',
              red:     active ? 'border-red-500 bg-red-500/15 text-red-400'             : 'border-stone-700 text-stone-500 hover:border-red-500/40 hover:text-red-400',
            }[colorCls!];
            return (
              <button
                key={sig}
                onClick={() => setSignalFilter(active ? null : sig)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${cls}`}
              >
                {sig}
              </button>
            );
          })}
          {signalFilter && <button onClick={() => setSignalFilter(null)} className="text-xs text-stone-600 hover:text-stone-400 px-1">✕</button>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { const tickers = (data?.rows ?? []).map((r) => r.ticker); if (tickers.length) fetchCompositeSignals(tickers); }}
            disabled={signaturesLoading || isLoading}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-stone-800 hover:border-amber-500/30 disabled:opacity-40"
          >
            <Zap className={clsx('h-3 w-3', signaturesLoading && 'animate-pulse text-amber-400')} />
            {signaturesLoading ? 'Scoring...' : 'Deep Scan'}
          </button>
          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-stone-800 hover:border-amber-500/30 disabled:opacity-40"
          >
            <RefreshCw className={clsx('h-3 w-3', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-300">
          {activePreset ? activePreset.label : searchQuery ? `Search: "${searchQuery}"` : activeTab.label}
          <span className="ml-2 text-stone-600 font-mono text-xs">{isLoading ? '...' : `${filtered.length} stocks`}</span>
        </p>
        {searchQuery && !PRESETS.find((p) => p.id === preset) && suggestions.length === 0 && data?.rows?.length === 0 && (
          <Link href={`/stock/${searchQuery.toUpperCase()}`} className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg px-3 py-1">
            Analyse {searchQuery.toUpperCase()} →
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center">
          <p className="text-sm text-red-400">Failed to load. Yahoo Finance may be rate-limiting — try again in 60s.</p>
          <button onClick={() => mutate()} className="mt-2 text-xs text-stone-400 hover:text-stone-200">Retry</button>
        </div>
      )}

      <ScreenerTable rows={filtered} loading={isLoading} />

      <p className="text-center text-xs text-stone-700">
        Data: Yahoo Finance · Prices ~15 min delayed ·{' '}
        <span className="text-amber-700">⚠ Educational only, not investment advice</span>
      </p>
    </div>
  );
}
