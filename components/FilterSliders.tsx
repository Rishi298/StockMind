'use client';

import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterState {
  minPE: number;
  maxPE: number;
  minMarketCap: number;
  maxMarketCap: number;
  minChange: number;
  maxChange: number;
}

const DEFAULT_FILTERS: FilterState = {
  minPE: 0,
  maxPE: 100,
  minMarketCap: 0,
  maxMarketCap: 1000000,
  minChange: -20,
  maxChange: 20,
};

interface FilterSlidersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

function RangeInput({
  label,
  min,
  max,
  value,
  onChange,
  prefix = '',
  suffix = '',
}: {
  label: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-stone-400">{label}</span>
        <span className="font-mono text-xs text-amber-400">
          {prefix}{value[0]}{suffix} – {prefix}{value[1]}{suffix}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
          className="w-full accent-amber-500 bg-stone-700 rounded h-1"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
          className="w-full accent-amber-500 bg-stone-700 rounded h-1"
        />
      </div>
    </div>
  );
}

export default function FilterSliders({ filters, onChange }: FilterSlidersProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters =
    filters.minPE !== DEFAULT_FILTERS.minPE ||
    filters.maxPE !== DEFAULT_FILTERS.maxPE ||
    filters.minMarketCap !== DEFAULT_FILTERS.minMarketCap ||
    filters.maxMarketCap !== DEFAULT_FILTERS.maxMarketCap ||
    filters.minChange !== DEFAULT_FILTERS.minChange ||
    filters.maxChange !== DEFAULT_FILTERS.maxChange;

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2 text-stone-300">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-stone-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-500" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-stone-800 pt-4">
          <RangeInput
            label="P/E Ratio"
            min={0}
            max={100}
            value={[filters.minPE, filters.maxPE]}
            onChange={([lo, hi]) => onChange({ ...filters, minPE: lo, maxPE: hi })}
            suffix="x"
          />
          <RangeInput
            label="Market Cap (₹Cr)"
            min={0}
            max={1000000}
            value={[filters.minMarketCap, filters.maxMarketCap]}
            onChange={([lo, hi]) => onChange({ ...filters, minMarketCap: lo, maxMarketCap: hi })}
            prefix="₹"
          />
          <RangeInput
            label="Day Change"
            min={-20}
            max={20}
            value={[filters.minChange, filters.maxChange]}
            onChange={([lo, hi]) => onChange({ ...filters, minChange: lo, maxChange: hi })}
            suffix="%"
          />
          <div className="flex justify-end">
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="text-xs text-stone-500 hover:text-amber-400 transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_FILTERS };
