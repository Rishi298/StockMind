'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/app/api/search/route';

interface SearchBarProps {
  onQuery?: (q: string) => void;
}

export default function SearchBar({ onQuery }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: SearchResult[]) => {
          setResults(data);
          setOpen(true);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 250);
  }, []);

  useEffect(() => {
    search(query);
    onQuery?.(query);
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(ticker: string) {
    setQuery('');
    setOpen(false);
    onQuery?.('');
    router.push(`/stock/${ticker}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (results.length > 0) {
        handleSelect(results[0].ticker);
      } else if (query.length >= 2) {
        handleSelect(query.toUpperCase());
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      onQuery?.('');
    }
  }

  return (
    <div ref={ref} className="relative w-full max-w-2xl mx-auto">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${
          focused
            ? 'border-amber-500/70 bg-stone-900 shadow-lg shadow-amber-500/10'
            : 'border-stone-700 bg-stone-900/60'
        }`}
      >
        {loading
          ? <Loader2 className="h-5 w-5 text-amber-400 flex-shrink-0 animate-spin" />
          : <Search className="h-5 w-5 text-stone-400 flex-shrink-0" />
        }
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search any NSE stock — POLYCAB, ZOMATO, HDFC Bank..."
          className="flex-1 bg-transparent font-mono text-sm text-stone-100 placeholder-stone-500 outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); onQuery?.(''); }}
            className="text-stone-500 hover:text-stone-300 transition-colors text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-stone-700 bg-stone-900 shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {results.map((stock, i) => (
            <button
              key={stock.ticker}
              onClick={() => handleSelect(stock.ticker)}
              className={`w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-stone-800 transition-colors ${
                i > 0 ? 'border-t border-stone-800' : ''
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-stone-100">{stock.ticker}</p>
                <p className="text-xs text-stone-400 truncate">{stock.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-stone-700 bg-stone-900 shadow-2xl z-50 overflow-hidden">
          <p className="text-xs text-stone-500 px-4 pt-3 pb-1">No results — try direct lookup:</p>
          <button
            onClick={() => handleSelect(query.toUpperCase())}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-800 transition-colors border-t border-stone-800"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-stone-100">{query.toUpperCase()}</p>
              <p className="text-xs text-stone-400">Analyse this ticker on NSE</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
