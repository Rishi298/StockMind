'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

interface MFScheme { schemeCode: string; schemeName: string; }

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function AddMFModal({ onClose, onSaved }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<MFScheme[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MFScheme | null>(null);
  const [units, setUnits] = useState('');
  const [avgNav, setAvgNav] = useState('');
  const [category, setCategory] = useState('Equity');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/mf/search?q=${encodeURIComponent(search)}`);
        const data = await res.json() as MFScheme[];
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleSave() {
    if (!selected || !units || !avgNav) { setError('Please fill all fields'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/portfolio/mf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemeCode: selected.schemeCode,
          schemeName: selected.schemeName,
          category,
          units: parseFloat(units),
          avgNav: parseFloat(avgNav),
          investedAmount: parseFloat(units) * parseFloat(avgNav),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-stone-100">Add Mutual Fund</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-stone-400 mb-1 block">Search Fund</label>
            {selected ? (
              <div className="flex items-center justify-between bg-stone-800 border border-blue-500/40 rounded-lg px-3 py-2">
                <span className="text-xs text-stone-300 flex-1 truncate">{selected.schemeName}</span>
                <button onClick={() => setSelected(null)} className="text-stone-500 hover:text-red-400 ml-2"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
                <input
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Axis Bluechip, SBI Small Cap..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {(results.length > 0 || searching) && (
                  <div className="absolute top-full left-0 right-0 bg-stone-800 border border-stone-700 rounded-lg mt-1 z-10 max-h-48 overflow-y-auto">
                    {searching && <p className="text-xs text-stone-500 px-3 py-2">Searching...</p>}
                    {results.map((s) => (
                      <button
                        key={s.schemeCode}
                        onClick={() => { setSelected(s); setSearch(''); setResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-stone-700 text-xs text-stone-300"
                      >
                        {s.schemeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-stone-400 mb-1 block">Category</label>
            <select
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-blue-500"
              value={category} onChange={(e) => setCategory(e.target.value)}
            >
              <option>Equity</option>
              <option>Debt</option>
              <option>Hybrid</option>
              <option>Index</option>
              <option>ELSS</option>
              <option>International</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Units</label>
              <input
                type="number" min="0" step="0.001"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-blue-500"
                placeholder="100.000"
                value={units} onChange={(e) => setUnits(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Avg NAV (₹)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-blue-500"
                placeholder="50.00"
                value={avgNav} onChange={(e) => setAvgNav(e.target.value)}
              />
            </div>
          </div>

          {units && avgNav && (
            <p className="text-xs text-stone-500">
              Invested amount: <span className="text-stone-300 font-semibold">₹{(parseFloat(units) * parseFloat(avgNav)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-stone-700 text-stone-400 rounded-lg py-2 text-sm hover:bg-stone-800">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white font-semibold rounded-lg py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Fund'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
