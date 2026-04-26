'use client';

import { useState } from 'react';
import { Sparkles, TrendingUp, BarChart2, Layers, DollarSign, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export const PRESETS = [
  { id: 'quality', label: 'Quality Compounders', icon: Sparkles, color: 'amber', description: 'High ROE, low debt, durable moat' },
  { id: 'momentum', label: 'Momentum Leaders', icon: TrendingUp, color: 'cyan', description: 'Outperforming 50-DMA with volume' },
  { id: 'value', label: 'Deep Value', icon: BarChart2, color: 'violet', description: 'Low P/E, P/B, high dividend yield' },
  { id: 'garp', label: 'GARP', icon: Layers, color: 'emerald', description: 'Growth at a Reasonable Price' },
  { id: 'income', label: 'Income', icon: DollarSign, color: 'amber', description: 'High dividend yield, stable earnings' },
  { id: 'turnaround', label: 'Turnaround', icon: RefreshCw, color: 'red', description: 'Recovery plays off 52W lows' },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

const colorClasses: Record<string, { inactive: string; active: string }> = {
  amber: {
    inactive: 'border-stone-700 text-stone-400 hover:border-amber-500/50 hover:text-amber-400',
    active: 'border-amber-500 bg-amber-500/10 text-amber-400',
  },
  cyan: {
    inactive: 'border-stone-700 text-stone-400 hover:border-cyan-500/50 hover:text-cyan-400',
    active: 'border-cyan-500 bg-cyan-500/10 text-cyan-400',
  },
  violet: {
    inactive: 'border-stone-700 text-stone-400 hover:border-violet-500/50 hover:text-violet-400',
    active: 'border-violet-500 bg-violet-500/10 text-violet-400',
  },
  emerald: {
    inactive: 'border-stone-700 text-stone-400 hover:border-emerald-500/50 hover:text-emerald-400',
    active: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  },
  red: {
    inactive: 'border-stone-700 text-stone-400 hover:border-red-500/50 hover:text-red-400',
    active: 'border-red-500 bg-red-500/10 text-red-400',
  },
};

interface PresetChipsProps {
  selected: PresetId | null;
  onChange: (preset: PresetId | null) => void;
}

export default function PresetChips({ selected, onChange }: PresetChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {PRESETS.map((preset) => {
        const Icon = preset.icon;
        const isActive = selected === preset.id;
        const colors = colorClasses[preset.color] ?? colorClasses.amber;

        return (
          <button
            key={preset.id}
            onClick={() => onChange(isActive ? null : preset.id)}
            title={preset.description}
            className={clsx(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150',
              isActive ? colors.active : colors.inactive
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
