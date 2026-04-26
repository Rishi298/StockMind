'use client';

import { BarChart2, TrendingUp, MessageCircle, Shield, Rocket, AlertTriangle } from 'lucide-react';
import type { AnalysisResult } from '@/app/api/analyze/[ticker]/route';
import clsx from 'clsx';

interface ScoreCardProps {
  title: string;
  score: number;
  maxScore: number;
  grade?: string;
  icon: React.ReactNode;
  accentColor: string;
  metrics: { label: string; value: string }[];
  bullets: string[];
  warnings?: string[];
}

function ScoreRing({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = (score / max) * 100;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#1c1917" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={clsx('font-mono text-sm font-bold', color)}>{score.toFixed(1)}</span>
      </div>
    </div>
  );
}

function AgentCard({ title, score, maxScore, grade, icon, accentColor, metrics, bullets, warnings = [] }: ScoreCardProps) {
  const scoreColor =
    score >= 7 ? 'text-emerald-400' :
    score >= 5 ? 'text-amber-400' :
    score >= 3 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <ScoreRing score={score} max={maxScore} color={scoreColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('p-1 rounded', accentColor)}>{icon}</span>
            <h3 className="text-sm font-semibold text-stone-200">{title}</h3>
            {grade && (
              <span className={clsx(
                'ml-auto text-xs font-bold px-2 py-0.5 rounded font-mono',
                grade.startsWith('A') ? 'bg-emerald-500/20 text-emerald-400' :
                grade.startsWith('B') ? 'bg-amber-500/20 text-amber-400' :
                grade.startsWith('C') ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
              )}>
                {grade}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="bg-stone-950/50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">{m.label}</p>
              <p className="font-mono text-xs text-stone-200 font-semibold mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bullets */}
      {bullets.length > 0 && (
        <ul className="space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
              <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
              {b}
            </li>
          ))}
        </ul>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <ul className="space-y-1.5">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
              <span className="text-red-500 mt-0.5 flex-shrink-0">⚠</span>
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  const v = Math.abs(n) > 1 ? n : n * 100;
  return `${v >= 0 ? '' : ''}${v.toFixed(1)}%`;
}

interface AgentScorecardsProps {
  data: AnalysisResult;
}

export default function AgentScorecards({ data }: AgentScorecardsProps) {
  const { fundamental: f, technical: t, sentiment: s, moat: m, growth: g, risk: r } = data;

  const cards: ScoreCardProps[] = [
    {
      title: `Fundamental Analysis · ${f.rawScore}/100`,
      score: f.score,
      maxScore: 10,
      grade: f.grade,
      icon: <BarChart2 className="h-4 w-4" />,
      accentColor: 'bg-amber-500/10 text-amber-400',
      metrics: [
        { label: 'Valuation', value: `${f.subScores.valuation.score}/20` },
        { label: 'Growth', value: `${f.subScores.growth.score}/20` },
        { label: 'Profitability', value: `${f.subScores.profitability.score}/20` },
        { label: 'Fin. Health', value: `${f.subScores.financialHealth.score}/20` },
        { label: 'Moat', value: `${f.subScores.moatStrength.score}/20` },
        { label: 'Fwd P/E', value: f.metrics.forwardPE ? `${fmt(f.metrics.forwardPE)}x` : '—' },
        { label: 'ROE', value: fmtPct(f.metrics.roe) },
        { label: 'Op. Margin', value: fmtPct(f.metrics.operatingMargin) },
        { label: 'Rev Growth', value: fmtPct(f.metrics.revenueGrowthYoY) },
        { label: 'D/E', value: f.metrics.debtToEquity ? `${fmt(f.metrics.debtToEquity)}x` : '—' },
      ],
      bullets: f.strengths,
      warnings: f.risks,
    },
    {
      title: `Technical Analysis · ${t.rawScore}/100`,
      score: t.score,
      maxScore: 10,
      grade: t.grade,
      icon: <TrendingUp className="h-4 w-4" />,
      accentColor: 'bg-cyan-500/10 text-cyan-400',
      metrics: [
        { label: 'Trend', value: `${t.subScores.trend.score}/20` },
        { label: 'Momentum', value: `${t.subScores.momentum.score}/20` },
        { label: 'Volume', value: `${t.subScores.volume.score}/20` },
        { label: 'Pattern', value: `${t.subScores.patternQuality.score}/20` },
        { label: 'Rel. Strength', value: `${t.subScores.relativeStrength.score}/20` },
        { label: 'RSI (14)', value: `${t.rsi} — ${t.rsiSignal}` },
        { label: 'MACD', value: t.macdSignal },
        { label: '50-DMA', value: `₹${fmt(t.dma50, 0)}` },
        { label: '200-DMA', value: `₹${fmt(t.dma200, 0)}` },
        { label: 'Pattern', value: t.patternDetected },
      ],
      bullets: t.signals,
      warnings: t.warnings,
    },
    {
      title: 'Market Sentiment',
      score: Math.round((s.index + 100) / 20 * 10) / 10,
      maxScore: 10,
      icon: <MessageCircle className="h-4 w-4" />,
      accentColor: 'bg-violet-500/10 text-violet-400',
      metrics: [
        { label: 'Rating', value: s.analystRating },
        { label: 'Target', value: s.analystTarget ? `₹${fmt(s.analystTarget, 0)}` : '—' },
        { label: 'Upside', value: s.analystTargetUpside ? `${s.analystTargetUpside}%` : '—' },
        { label: 'Sentiment', value: s.label },
        { label: 'Buy / Hold / Sell', value: `${s.buyCount ?? '—'} / ${s.holdCount ?? '—'} / ${s.sellCount ?? '—'}` },
        { label: 'Inst. Ownership', value: s.institutionalOwnership ? fmtPct(s.institutionalOwnership) : '—' },
      ],
      bullets: s.signals,
    },
    {
      title: 'Competitive Moat',
      score: m.score,
      maxScore: 10,
      icon: <Shield className="h-4 w-4" />,
      accentColor: 'bg-emerald-500/10 text-emerald-400',
      metrics: [
        { label: 'Moat Type', value: m.moatType },
        { label: 'Durability', value: m.durability },
      ],
      bullets: m.indicators,
      warnings: m.weaknesses,
    },
    {
      title: 'Growth Outlook (3–4Y)',
      score: Math.min(10, Math.max(0, g.cagr.base / 3)),
      maxScore: 10,
      icon: <Rocket className="h-4 w-4" />,
      accentColor: 'bg-amber-500/10 text-amber-400',
      metrics: [
        { label: 'Bear Case 3Y', value: `₹${g.bearCase3Y.toLocaleString('en-IN')}` },
        { label: 'Base Case 3Y', value: `₹${g.baseCase3Y.toLocaleString('en-IN')}` },
        { label: 'Bull Case 4Y', value: `₹${g.bullCase4Y.toLocaleString('en-IN')}` },
        { label: 'Base CAGR', value: `${g.cagr.base}%` },
        { label: 'Rev CAGR Est.', value: g.revenueCAGR ? `${g.revenueCAGR}%` : '—' },
        { label: 'EPS CAGR Est.', value: g.earningsCAGR ? `${g.earningsCAGR}%` : '—' },
      ],
      bullets: g.drivers,
      warnings: g.headwinds,
    },
    {
      title: 'Risk Assessment',
      score: r.score,
      maxScore: 10,
      grade: r.grade,
      icon: <AlertTriangle className="h-4 w-4" />,
      accentColor: 'bg-red-500/10 text-red-400',
      metrics: [
        { label: 'Risk Grade', value: r.grade },
        { label: 'Volatility', value: r.volatility },
        { label: 'Beta', value: r.beta ? fmt(r.beta) : '—' },
        { label: 'Liquidity', value: r.liquidityRisk },
        { label: '-20% Stress', value: `₹${r.stressScenario.bear20pct.toLocaleString('en-IN')}` },
        { label: '-40% Stress', value: `₹${r.stressScenario.bear40pct.toLocaleString('en-IN')}` },
      ],
      bullets: r.mitigants,
      warnings: r.topRisks,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {cards.map((card) => (
        <AgentCard key={card.title} {...card} />
      ))}
    </div>
  );
}
