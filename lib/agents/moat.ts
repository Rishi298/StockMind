import type { SummaryData } from '../yahoo';

export interface MoatResult {
  score: number; // 0-10
  moatType: string;
  durability: 'Narrow' | 'Wide' | 'No Moat';
  alignment: string;
  indicators: string[];
  weaknesses: string[];
  sectorContext: string;
}

function safeNum(val: unknown): number | null {
  if (val == null || typeof val === 'object') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

const MOAT_SECTOR_MAP: Record<string, { type: string; context: string }> = {
  IT: { type: 'Switching Costs + Scale', context: 'Indian IT majors benefit from long-term client stickiness, proprietary platforms, and talent scale. Multi-year contracts create recurring visibility.' },
  Banking: { type: 'Scale + Network Effects', context: 'Large deposit franchises, branch networks, and digital moats create funding advantages. Brand trust is a regulatory and consumer barrier.' },
  FMCG: { type: 'Brand + Distribution', context: 'Decades of brand equity and deep rural distribution networks are hard to replicate. Pricing power over staples is durable.' },
  Pharma: { type: 'Patents + R&D Pipeline', context: 'Regulatory filings, API capabilities, and complex chemistry act as barriers. Generics leadership in US markets compounds over time.' },
  Telecom: { type: 'Network Effects + Scale', context: 'Spectrum assets, tower infrastructure, and subscriber lock-in create natural oligopoly dynamics in India.' },
  Energy: { type: 'Government Mandate + Scale', context: 'Regulated returns, captive markets, and fuel security mandates provide durable revenue floors.' },
  Auto: { type: 'Scale + Brand', context: 'Manufacturing scale, dealer networks, and brand loyalty create switching costs in a capex-intensive industry.' },
  Infrastructure: { type: 'Concession Assets + Scale', context: 'Long-dated concession contracts, port/SEZ assets, and government partnerships create durable cash flows.' },
  Consumer: { type: 'Brand + Retail Distribution', context: 'Premium brand positioning, exclusive retail tie-ups, and aspirational appeal support pricing power.' },
  Metals: { type: 'Cost Position + Scale', context: 'Captive mines, integrated operations, and low-cost production create competitive cost positions.' },
  Diversified: { type: 'Conglomerate Scale + Brand', context: 'Diversified revenue streams, government relationships, and brand halo across verticals provide stability.' },
};

export function moatAgent(summary: SummaryData): MoatResult {
  const fd = summary.financialData as Record<string, unknown>;
  const ks = summary.defaultKeyStatistics as Record<string, unknown>;
  const profile = summary.assetProfile as Record<string, unknown>;
  const sd = summary.summaryDetail as Record<string, unknown>;

  const sector = String(profile?.sector ?? '');
  const industry = String(profile?.industry ?? '');

  const indicators: string[] = [];
  const weaknesses: string[] = [];
  let score = 5;

  // ROE as proxy for moat strength (Buffett's rule: consistently high ROE = moat)
  const roe = safeNum(fd.returnOnEquity) ?? safeNum(ks.returnOnEquity);
  if (roe !== null) {
    const roePct = roe > 1 ? roe : roe * 100;
    if (roePct > 25) { score += 2; indicators.push(`Consistently high ROE of ${roePct.toFixed(1)}% — hallmark of a durable moat`); }
    else if (roePct > 18) { score += 1; indicators.push(`Strong ROE of ${roePct.toFixed(1)}% — moat indicators present`); }
    else if (roePct < 10) { score -= 1; weaknesses.push(`ROE of ${roePct.toFixed(1)}% below cost of capital threshold`); }
  }

  // Operating margin sustainability
  const opMargin = safeNum(fd.operatingMargins);
  if (opMargin !== null) {
    const opPct = opMargin > 1 ? opMargin : opMargin * 100;
    if (opPct > 25) { score += 1.5; indicators.push(`High operating margin of ${opPct.toFixed(1)}% — pricing power evident`); }
    else if (opPct > 15) { score += 0.5; indicators.push(`Healthy operating margin of ${opPct.toFixed(1)}%`); }
    else if (opPct < 5) { weaknesses.push(`Thin operating margin of ${opPct.toFixed(1)}% — competitive pricing environment`); }
  }

  // Net margin
  const netMargin = safeNum(fd.profitMargins);
  if (netMargin !== null) {
    const pct = netMargin > 1 ? netMargin : netMargin * 100;
    if (pct > 20) { score += 0.5; indicators.push(`Superior net margin of ${pct.toFixed(1)}% over industry`); }
    else if (pct < 3) weaknesses.push(`Thin net margins signal commodity-like competition`);
  }

  // Revenue growth consistency
  const revGrowth = safeNum(fd.revenueGrowth);
  if (revGrowth !== null) {
    const pct = revGrowth > 1 ? revGrowth : revGrowth * 100;
    if (pct > 15) indicators.push(`Revenue growing at ${pct.toFixed(1)}% — market share gains or pricing`);
    else if (pct < 0) weaknesses.push(`Revenue declining — market share or cyclical headwinds`);
  }

  // Sector-based moat context
  const sectorEntry = Object.entries(MOAT_SECTOR_MAP).find(
    ([key]) => sector.toLowerCase().includes(key.toLowerCase()) || industry.toLowerCase().includes(key.toLowerCase())
  );

  const moatType = sectorEntry?.[1].type ?? 'Operational Excellence';
  const sectorContext = sectorEntry?.[1].context ?? 'Business model analysis required. Moat assessment based on financial metrics.';

  // Add sector-specific moat indicators
  if (sectorEntry) indicators.push(`Sector moat type: ${moatType}`);

  // Dividend consistency as moat proxy (durable earnings)
  const divYield = safeNum(sd.dividendYield) ?? safeNum(sd.trailingAnnualDividendYield);
  if (divYield !== null && divYield > 0) {
    const dyPct = divYield > 1 ? divYield : divYield * 100;
    if (dyPct > 2) indicators.push(`Consistent dividend of ${dyPct.toFixed(2)}% — earnings durability signal`);
  }

  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  const durability: MoatResult['durability'] =
    score >= 7 ? 'Wide' : score >= 4.5 ? 'Narrow' : 'No Moat';

  const alignment =
    durability === 'Wide'
      ? 'Business fundamentals strongly support a durable competitive advantage. The company demonstrates pricing power, consistent high returns on capital, and structural barriers to competition.'
      : durability === 'Narrow'
      ? 'Some competitive advantages are visible but not yet durable or wide enough to classify as a wide moat. Monitor for margin expansion and consistent ROE improvement.'
      : 'Competitive advantages are unclear or limited. The business competes primarily on price in a commoditized market. Capital allocation discipline becomes critical.';

  return {
    score,
    moatType,
    durability,
    alignment,
    indicators: indicators.slice(0, 5),
    weaknesses: weaknesses.slice(0, 3),
    sectorContext,
  };
}
