'use client';

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { NIFTY_50, NIFTY_NEXT_50 } from '@/lib/universe';

const ALL_STOCKS = [...NIFTY_50, ...NIFTY_NEXT_50];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function AddHoldingModal({ onClose, onSaved }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ ticker: string; name: string; sector: string } | null>(null);
  const [qty, setQty] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [broker, setBroker] = useState('Manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = search.length > 0
    ? ALL_STOCKS.filter((s) =>
        s.ticker.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  async function handleSave() {
    if (!selected || !qty || !avgPrice) {
      setError('Please fill all fields');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/portfolio/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selected.ticker,
          name: selected.name,
          sector: selected.sector,
          qty: parseFloat(qty),
          avgBuyPrice: parseFloat(avgPrice),
          buyDate,
          brokerName: broker,
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
          <h2 className="font-semibold text-stone-100">Add Stock Holding</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-stone-400 mb-1 block">Search Stock</label>
            {selected ? (
              <div className="flex items-center justify-between bg-stone-800 border border-amber-500/40 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-semibold text-amber-400">{selected.ticker}</span>
                  <span className="text-xs text-stone-400 ml-2">{selected.name}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-stone-500 hover:text-red-400"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
                <input
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  placeholder="Type ticker or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-stone-800 border border-stone-700 rounded-lg mt-1 z-10 max-h-48 overflow-y-auto">
                    {filtered.map((s) => (
                      <button
                        key={s.ticker}
                        onClick={() => { setSelected(s); setSearch(''); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-stone-700 text-left"
                      >
                        <span className="text-xs font-mono font-bold text-amber-400 w-20 shrink-0">{s.ticker}</span>
                        <span className="text-xs text-stone-300 truncate">{s.name}</span>
                        <span className="text-xs text-stone-600 ml-auto shrink-0">{s.sector}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Quantity</label>
              <input
                type="number" min="0" step="1"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                placeholder="10"
                value={qty} onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Avg Buy Price (₹)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                placeholder="1500.00"
                value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-400 mb-1 block">Buy Date</label>
            <input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-stone-400 mb-1 block">Broker</label>
            <select
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
              value={broker} onChange={(e) => setBroker(e.target.value)}
            >
              <option>Manual</option>
              <option>Zerodha</option>
              <option>Groww</option>
              <option>Upstox</option>
              <option>ICICI Direct</option>
              <option>HDFC Securities</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-stone-700 text-stone-400 rounded-lg py-2 text-sm hover:bg-stone-800">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-amber-500 text-stone-950 font-semibold rounded-lg py-2 text-sm hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Holding'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
