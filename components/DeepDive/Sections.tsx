'use client';

import type { AnalysisResult } from '@/app/api/analyze/[ticker]/route';
import { CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
      <h3 className="font-serif text-base font-semibold text-stone-200 mb-4 pb-3 border-b border-stone-800">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-stone-800/40 last:border-0">
      <span className="text-xs text-stone-400">{label}</span>
      <span className={clsx('font-mono text-xs font-semibold', highlight ? 'text-amber-400' : 'text-stone-200')}>
        {value}
      </span>
    </div>
  );
}

function fmt(n: number | null | undefined, dec = 2): string {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  const v = Math.abs(n) > 1 ? n : n * 100;
  return `${v >= 0 ? '' : ''}${v.toFixed(2)}%`;
}

function fmtCr(n: number): string {
  if (!n) return '—';
  const cr = n / 1e7;
  if (cr >= 100000) return `₹${(cr / 100000).toFixed(2)}L Cr`;
  if (cr >= 1000) return `₹${(cr / 1000).toFixed(2)}K Cr`;
  return `₹${cr.toFixed(0)} Cr`;
}

export default function Sections({ data }: { data: AnalysisResult }) {
  const { quote, fundamental: f, technical: t, sentiment: s, moat: m, growth: g, risk: r } = data;

  return (
    <div className="space-y-4">

      {/* 1. Business Snapshot */}
      <SectionCard title="1 · Business Snapshot">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <MetricRow label="Company" value={data.name} />
            <MetricRow label="Exchange" value={`${quote.exchangeName} · ${quote.currency}`} />
            <MetricRow label="Sector" value={data.sector} />
            <MetricRow label="Quote Type" value={quote.quoteType} />
          </div>
          <div className="space-y-1">
            <MetricRow label="Market Cap" value={fmtCr(quote.marketCap)} />
            <MetricRow label="Shares Outstanding" value="See Annual Report" />
            <MetricRow label="52W Range" value={`₹${fmt(quote.fiftyTwoWeekLow)} – ₹${fmt(quote.fiftyTwoWeekHigh)}`} />
            <MetricRow label="Moat Type" value={m.moatType} highlight />
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-stone-950/50 border border-stone-800">
          <p className="text-xs text-stone-400 leading-relaxed">{m.sectorContext}</p>
        </div>
      </SectionCard>

      {/* 2. Fundamentals Deep Dive */}
      <SectionCard title={`2 · Fundamentals — Score ${f.rawScore}/100 (${f.grade})`}>
        {/* Sub-dimension score bars */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {([
            { label: 'Valuation', score: f.subScores.valuation.score },
            { label: 'Growth', score: f.subScores.growth.score },
            { label: 'Profitability', score: f.subScores.profitability.score },
            { label: 'Fin. Health', score: f.subScores.financialHealth.score },
            { label: 'Moat', score: f.subScores.moatStrength.score },
          ]).map(({ label, score }) => (
            <div key={label} className="text-center">
              <div className="text-[10px] text-stone-500 mb-1">{label}</div>
              <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full', score >= 15 ? 'bg-emerald-500' : score >= 10 ? 'bg-amber-500' : 'bg-red-500')}
                  style={{ width: `${(score / 20) * 100}%` }}
                />
              </div>
              <div className="font-mono text-[10px] text-stone-400 mt-1">{score}/20</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <MetricRow label="P/E (TTM)" value={f.metrics.trailingPE ? `${fmt(f.metrics.trailingPE, 1)}x` : '—'} />
            <MetricRow label="P/E (Fwd)" value={f.metrics.forwardPE ? `${fmt(f.metrics.forwardPE, 1)}x` : '—'} />
            <MetricRow label="P/B" value={f.metrics.pbRatio ? `${fmt(f.metrics.pbRatio, 2)}x` : '—'} />
            <MetricRow label="EV/EBITDA" value={f.metrics.evEbitda ? `${fmt(f.metrics.evEbitda, 1)}x` : '—'} />
            <MetricRow label="PEG Ratio" value={f.metrics.pegRatio ? `${fmt(f.metrics.pegRatio, 2)}` : '—'} />
            <MetricRow label="EPS (TTM)" value={quote.epsTrailingTwelveMonths ? `₹${fmt(quote.epsTrailingTwelveMonths)}` : '—'} />
          </div>
          <div className="space-y-1">
            <MetricRow label="ROE" value={fmtPct(f.metrics.roe)} highlight />
            <MetricRow label="Net Margin" value={fmtPct(f.metrics.netMargin)} />
            <MetricRow label="Op. Margin" value={fmtPct(f.metrics.operatingMargin)} />
            <MetricRow label="FCF Margin" value={f.metrics.fcfMargin ? `${fmt(f.metrics.fcfMargin, 1)}%` : '—'} />
            <MetricRow label="D/E Ratio" value={f.metrics.debtToEquity ? `${fmt(f.metrics.debtToEquity, 2)}x` : '—'} />
            <MetricRow label="Current Ratio" value={f.metrics.currentRatio ? `${fmt(f.metrics.currentRatio, 2)}` : '—'} />
          </div>
        </div>

        {f.strengths.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Strengths</p>
            <ul className="space-y-1">
              {f.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
                  <span className="text-emerald-500 mt-0.5">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {f.risks.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Risks</p>
            <ul className="space-y-1">
              {f.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
                  <span className="text-red-500 mt-0.5">⚠</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* 3. 1Y Performance */}
      <SectionCard title="3 · 1-Year Performance">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '52W Performance', value: `${t.rsi > 50 ? '+' : ''}—` },
            { label: 'Current vs 50-DMA', value: quote.regularMarketPrice > t.dma50 ? `+${((quote.regularMarketPrice - t.dma50) / t.dma50 * 100).toFixed(2)}%` : `${((quote.regularMarketPrice - t.dma50) / t.dma50 * 100).toFixed(2)}%` },
            { label: 'Current vs 200-DMA', value: quote.regularMarketPrice > t.dma200 ? `+${((quote.regularMarketPrice - t.dma200) / t.dma200 * 100).toFixed(2)}%` : `${((quote.regularMarketPrice - t.dma200) / t.dma200 * 100).toFixed(2)}%` },
            { label: 'Avg Volume', value: quote.averageVolume >= 1e6 ? `${(quote.averageVolume / 1e6).toFixed(1)}M` : `${(quote.averageVolume / 1e3).toFixed(0)}K` },
          ].map((m) => (
            <div key={m.label} className="bg-stone-950/50 rounded-lg p-3">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">{m.label}</p>
              <p className="font-mono text-sm text-stone-200 font-semibold mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 4. Technicals Summary */}
      <SectionCard title={`4 · Technical Analysis — Score ${t.rawScore}/100 (${t.grade})`}>
        {/* Sub-score bars */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {([
            { label: 'Trend', score: t.subScores.trend.score },
            { label: 'Momentum', score: t.subScores.momentum.score },
            { label: 'Volume', score: t.subScores.volume.score },
            { label: 'Pattern', score: t.subScores.patternQuality.score },
            { label: 'Rel.Str.', score: t.subScores.relativeStrength.score },
          ]).map(({ label, score }) => (
            <div key={label} className="text-center">
              <div className="text-[10px] text-stone-500 mb-1">{label}</div>
              <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full', score >= 15 ? 'bg-cyan-500' : score >= 10 ? 'bg-amber-500' : 'bg-red-500')}
                  style={{ width: `${(score / 20) * 100}%` }}
                />
              </div>
              <div className="font-mono text-[10px] text-stone-400 mt-1">{score}/20</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <MetricRow label="Trend" value={t.trend} highlight />
            <MetricRow label="Pattern" value={t.patternDetected} />
            <MetricRow label="RSI (14)" value={`${t.rsi} — ${t.rsiSignal}`} />
            <MetricRow label="MACD" value={t.macdSignal} />
            <MetricRow label="Bollinger" value={t.bollingerPosition} />
            <MetricRow label="Momentum" value={t.momentum} />
          </div>
          <div className="space-y-1">
            <MetricRow label="Support 1" value={`₹${fmt(t.keyLevels.support1, 0)}`} />
            <MetricRow label="Support 2" value={`₹${fmt(t.keyLevels.support2, 0)}`} />
            <MetricRow label="Resistance 1" value={`₹${fmt(t.keyLevels.resistance1, 0)}`} />
            <MetricRow label="Resistance 2" value={`₹${fmt(t.keyLevels.resistance2, 0)}`} />
            <MetricRow label="50-DMA" value={`₹${fmt(t.dma50, 0)}`} />
            <MetricRow label="200-DMA" value={`₹${fmt(t.dma200, 0)}`} />
          </div>
        </div>
        {t.signals.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Signals</p>
            <ul className="space-y-1">
              {t.signals.map((s, i) => <li key={i} className="flex items-start gap-2 text-xs text-stone-400"><span className="text-cyan-500 mt-0.5">→</span>{s}</li>)}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* 5. Sentiment */}
      <SectionCard title="5 · Market Sentiment">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>Bearish</span>
              <span>Neutral</span>
              <span>Bullish</span>
            </div>
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all',
                  s.index >= 25 ? 'bg-emerald-500' : s.index >= -10 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(100, Math.max(5, (s.index + 100) / 2))}%` }}
              />
            </div>
          </div>
          <span className={clsx('font-mono text-lg font-bold flex-shrink-0',
            s.index >= 25 ? 'text-emerald-400' : s.index >= -10 ? 'text-amber-400' : 'text-red-400'
          )}>
            {s.index > 0 ? '+' : ''}{s.index}
          </span>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed mb-3">{s.narrative}</p>

        <div className="grid grid-cols-2 gap-2">
          <MetricRow label="Analyst Rating" value={s.analystRating} highlight />
          <MetricRow label="Target Price" value={s.analystTarget ? `₹${fmt(s.analystTarget, 0)}` : '—'} />
          <MetricRow label="Upside" value={s.analystTargetUpside ? `${s.analystTargetUpside}%` : '—'} />
          <MetricRow label="Sentiment" value={s.label} />
        </div>
      </SectionCard>

      {/* 6. Moat */}
      <SectionCard title="6 · Competitive Moat">
        <div className="flex items-start gap-4 mb-3">
          <div className={clsx('px-4 py-2 rounded-lg text-center flex-shrink-0',
            m.durability === 'Wide' ? 'bg-emerald-500/15 border border-emerald-500/30' :
            m.durability === 'Narrow' ? 'bg-amber-500/15 border border-amber-500/30' :
            'bg-stone-800 border border-stone-700'
          )}>
            <p className="text-xs text-stone-500">Durability</p>
            <p className={clsx('font-serif font-bold text-lg mt-0.5',
              m.durability === 'Wide' ? 'text-emerald-400' :
              m.durability === 'Narrow' ? 'text-amber-400' : 'text-stone-400'
            )}>{m.durability}</p>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">{m.alignment}</p>
        </div>

        {m.indicators.length > 0 && (
          <ul className="space-y-1 mt-3">
            {m.indicators.map((ind, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
                <span className="text-emerald-500 mt-0.5">✓</span>{ind}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 7. 3-4Y Outlook */}
      <SectionCard title="7 · 3–4 Year Outlook">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Bear Case (3Y)', value: `₹${g.bearCase3Y.toLocaleString('en-IN')}`, sub: `${g.cagr.bear}% CAGR`, color: 'text-red-400' },
            { label: 'Base Case (3Y)', value: `₹${g.baseCase3Y.toLocaleString('en-IN')}`, sub: `${g.cagr.base}% CAGR`, color: 'text-amber-400' },
            { label: 'Bull Case (4Y)', value: `₹${g.bullCase4Y.toLocaleString('en-IN')}`, sub: `${g.cagr.bull}% CAGR`, color: 'text-emerald-400' },
          ].map((c) => (
            <div key={c.label} className="bg-stone-950/50 rounded-lg p-3 text-center border border-stone-800">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">{c.label}</p>
              <p className={clsx('font-mono text-base font-bold mt-1', c.color)}>{c.value}</p>
              <p className="text-[10px] text-stone-600 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {g.drivers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Growth Drivers</p>
            <ul className="space-y-1">
              {g.drivers.map((d, i) => <li key={i} className="flex items-start gap-2 text-xs text-stone-400"><span className="text-emerald-500 mt-0.5">↑</span>{d}</li>)}
            </ul>
          </div>
        )}
        {g.headwinds.length > 0 && (
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Headwinds</p>
            <ul className="space-y-1">
              {g.headwinds.map((h, i) => <li key={i} className="flex items-start gap-2 text-xs text-stone-400"><span className="text-red-500 mt-0.5">↓</span>{h}</li>)}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* 8. Risk */}
      <SectionCard title="8 · Risk Assessment">
        <div className="flex items-center gap-4 mb-4">
          <div className={clsx('w-16 h-16 rounded-full flex items-center justify-center border-2 flex-shrink-0',
            r.grade === 'A' ? 'border-emerald-500 bg-emerald-500/10' :
            r.grade === 'B' ? 'border-amber-500 bg-amber-500/10' :
            r.grade === 'C' ? 'border-orange-500 bg-orange-500/10' : 'border-red-500 bg-red-500/10'
          )}>
            <span className={clsx('font-mono text-2xl font-bold',
              r.grade === 'A' ? 'text-emerald-400' :
              r.grade === 'B' ? 'text-amber-400' :
              r.grade === 'C' ? 'text-orange-400' : 'text-red-400'
            )}>{r.grade}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-stone-400">{r.positionSizing}</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-stone-500">Volatility: <span className="text-stone-300">{r.volatility}</span></span>
              <span className="text-stone-500">Beta: <span className="text-stone-300">{r.beta ? fmt(r.beta) : '—'}</span></span>
              <span className="text-stone-500">Liquidity: <span className="text-stone-300">{r.liquidityRisk}</span></span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Stress Scenarios</p>
          <div className="grid grid-cols-2 gap-2">
            <MetricRow label="-20% Scenario" value={`₹${r.stressScenario.bear20pct.toLocaleString('en-IN')}`} />
            <MetricRow label="-40% Scenario" value={`₹${r.stressScenario.bear40pct.toLocaleString('en-IN')}`} />
          </div>
        </div>

        {r.topRisks.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Key Risks</p>
            <ul className="space-y-1">
              {r.topRisks.map((risk, i) => <li key={i} className="flex items-start gap-2 text-xs text-stone-400"><span className="text-red-500 mt-0.5">⚠</span>{risk}</li>)}
            </ul>
          </div>
        )}
        {r.mitigants.length > 0 && (
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Mitigants</p>
            <ul className="space-y-1">
              {r.mitigants.map((m, i) => <li key={i} className="flex items-start gap-2 text-xs text-stone-400"><span className="text-emerald-500 mt-0.5">✓</span>{m}</li>)}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* 9. Synthesis */}
      <SectionCard title="9 · Investment Synthesis">
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-stone-950/50 border border-stone-800">
            <p className="font-serif text-sm text-stone-200 leading-relaxed">{data.verdict}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {[
              { label: 'Composite Score', value: `${data.compositeScore}/10`, color: 'text-amber-400' },
              { label: 'Moat', value: m.durability, color: m.durability === 'Wide' ? 'text-emerald-400' : 'text-amber-400' },
              { label: 'Risk Grade', value: r.grade, color: r.grade === 'A' ? 'text-emerald-400' : r.grade === 'B' ? 'text-amber-400' : 'text-red-400' },
              { label: 'Fundamental', value: f.grade, color: 'text-stone-300' },
              { label: 'Technical', value: t.grade, color: 'text-stone-300' },
              { label: 'Analyst View', value: s.analystRating, color: 'text-stone-300' },
            ].map((item) => (
              <div key={item.label} className="bg-stone-900 rounded-lg p-2.5 border border-stone-800">
                <p className="text-[10px] text-stone-500">{item.label}</p>
                <p className={clsx('font-mono text-sm font-bold mt-0.5', item.color)}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* 10. Monitoring Checklist */}
      <SectionCard title="10 · Monitoring Checklist">
        <div className="space-y-2">
          {[
            'Quarterly earnings — EPS vs consensus, revenue growth trajectory',
            'Promoter shareholding changes — watch for pledge creation or reduction',
            `RSI stays above 40 — price above 50-DMA (₹${fmt(t.dma50, 0)})`,
            `Stock holds above 200-DMA (₹${fmt(t.dma200, 0)}) on weekly close`,
            `Stop loss at ₹${fmt(t.stopLoss, 0)} — exit if breached on closing basis`,
            `Target 1 at ₹${fmt(t.target1, 0)}, consider partial profit booking`,
            'Analyst rating changes — any consensus downgrade is a flag',
            'Sector headwinds: RBI policy, crude prices, global risk-off events',
            'Annual report: free cash flow generation and capex guidance',
            'Management commentary on revenue guidance and margin outlook',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-xs text-stone-400">
              <Circle className="h-3.5 w-3.5 text-stone-700 mt-0.5 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
