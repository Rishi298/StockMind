import type { SummaryData } from '../yahoo';

export interface GrowthResult {
  bearCase3Y: number;
  baseCase3Y: number;
  bullCase4Y: number;
  cagr: {
    bear: number;
    base: number;
    bull: number;
  };
  drivers: string[];
  headwinds: string[];
  earningsCAGR: number | null;
  revenueCAGR: number | null;
  impliedPE: {
    bear: number | null;
    base: number | null;
    bull: number | null;
  };
}

function safeNum(val: unknown): number | null {
  if (val == null || typeof val === 'object') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export function growthAgent(summary: SummaryData, currentPrice: number): GrowthResult {
  const fd = summary.financialData as Record<string, unknown>;
  const ks = summary.defaultKeyStatistics as Record<string, unknown>;
  const sd = summary.summaryDetail as Record<string, unknown>;
  const profile = summary.assetProfile as Record<string, unknown>;

  const drivers: string[] = [];
  const headwinds: string[] = [];

  // Extract key metrics
  const revenueGrowth = safeNum(fd.revenueGrowth);
  const earningsGrowth = safeNum(fd.earningsGrowth);
  const grossMargin = safeNum(fd.grossMargins);
  const operatingMargin = safeNum(fd.operatingMargins);
  const roe = safeNum(fd.returnOnEquity) ?? safeNum(ks.returnOnEquity);
  const debtToEquity = safeNum(ks.debtToEquity) ?? safeNum(fd.debtToEquity);
  const pe = safeNum(sd.trailingPE) ?? safeNum(ks.trailingPE);
  const forwardEps = safeNum(ks.forwardEps) ?? safeNum(ks.trailingEps);
  const targetHighPrice = safeNum(fd.targetHighPrice);
  const targetLowPrice = safeNum(fd.targetLowPrice);
  const targetMeanPrice = safeNum(fd.targetMeanPrice);

  // India macro tailwinds
  const sector = String(profile?.sector ?? '').toLowerCase();
  if (sector.includes('it') || sector.includes('tech')) {
    drivers.push('India-to-global tech outsourcing secular growth (AI + cloud migration)');
    drivers.push('Rupee depreciation tailwind on export revenues');
  }
  if (sector.includes('bank') || sector.includes('nbfc') || sector.includes('finance')) {
    drivers.push('India credit penetration still low — structural credit growth runway');
    drivers.push('Formalisation of economy boosting banking system deposits');
  }
  if (sector.includes('pharma')) {
    drivers.push('US generic market expansion + biosimilars pipeline');
    drivers.push("India's 'pharmacy of the world' positioning strengthening");
  }
  if (sector.includes('consumer') || sector.includes('fmcg')) {
    drivers.push('Rising per-capita income driving premiumisation in India');
    drivers.push('Rural recovery and expanding middle class supporting volume growth');
  }
  if (sector.includes('infra') || sector.includes('engineering') || sector.includes('power')) {
    drivers.push('Government capex cycle — ₹10L+ crore infrastructure push');
    drivers.push('PLI schemes boosting domestic manufacturing');
  }

  // Revenue growth driver
  if (revenueGrowth !== null) {
    const pct = revenueGrowth > 1 ? revenueGrowth : revenueGrowth * 100;
    if (pct > 15) drivers.push(`Current revenue trajectory of ${pct.toFixed(1)}% provides growth visibility`);
    else if (pct < 5) headwinds.push(`Slowing revenue growth (${pct.toFixed(1)}%) may signal market saturation`);
  }

  // Margin expansion
  if (operatingMargin !== null) {
    const pct = operatingMargin > 1 ? operatingMargin : operatingMargin * 100;
    if (pct > 20) drivers.push('High operating leverage — margin expansion likely at scale');
    if (pct < 8) headwinds.push('Low operating margins limit earnings leverage');
  }

  // Debt drag
  if (debtToEquity !== null) {
    const de = debtToEquity > 10 ? debtToEquity / 100 : debtToEquity;
    if (de > 1.5) headwinds.push('High debt servicing may constrain growth investments');
  }

  // Generic headwinds for India
  headwinds.push('Rupee volatility and global risk-off episodes can compress valuations');
  if (pe !== null && pe > 40) headwinds.push('Premium valuation leaves little margin of safety');

  // Growth assumptions
  let baseGrowthRate = 0.12; // 12% default for India large cap
  if (revenueGrowth !== null) {
    const rg = revenueGrowth > 1 ? revenueGrowth / 100 : revenueGrowth;
    baseGrowthRate = Math.max(0.05, Math.min(0.35, rg * 0.8 + 0.04));
  }
  if (earningsGrowth !== null) {
    const eg = earningsGrowth > 1 ? earningsGrowth / 100 : earningsGrowth;
    baseGrowthRate = (baseGrowthRate + Math.max(0.04, Math.min(0.40, eg * 0.75))) / 2;
  }

  const bearGrowth = baseGrowthRate * 0.4;
  const bullGrowth = baseGrowthRate * 1.8;

  // 3Y bear, 3Y base, 4Y bull price targets
  const bearCase3Y = +(currentPrice * Math.pow(1 + bearGrowth, 3)).toFixed(0);
  const baseCase3Y = +(currentPrice * Math.pow(1 + baseGrowthRate, 3)).toFixed(0);
  const bullCase4Y = +(currentPrice * Math.pow(1 + bullGrowth, 4)).toFixed(0);

  const bearCAGR = +(bearGrowth * 100).toFixed(1);
  const baseCAGR = +(baseGrowthRate * 100).toFixed(1);
  const bullCAGR = +(bullGrowth * 100).toFixed(1);

  // Implied PE at target prices
  const eps = forwardEps ?? (pe && currentPrice ? currentPrice / pe : null);
  const impliedPE = {
    bear: eps && eps > 0 ? +(bearCase3Y / (eps * Math.pow(1 + baseGrowthRate * 0.4, 3))).toFixed(1) : null,
    base: eps && eps > 0 ? +(baseCase3Y / (eps * Math.pow(1 + baseGrowthRate, 3))).toFixed(1) : null,
    bull: eps && eps > 0 ? +(bullCase4Y / (eps * Math.pow(1 + bullGrowth, 4))).toFixed(1) : null,
  };

  // Earnings CAGR from analyst estimates
  const earningsCAGR = earningsGrowth !== null
    ? +(earningsGrowth > 1 ? earningsGrowth : earningsGrowth * 100).toFixed(1)
    : null;
  const revenueCAGR = revenueGrowth !== null
    ? +(revenueGrowth > 1 ? revenueGrowth : revenueGrowth * 100).toFixed(1)
    : null;

  return {
    bearCase3Y,
    baseCase3Y,
    bullCase4Y,
    cagr: { bear: bearCAGR, base: baseCAGR, bull: bullCAGR },
    drivers: drivers.slice(0, 5),
    headwinds: headwinds.slice(0, 4),
    earningsCAGR,
    revenueCAGR,
    impliedPE,
  };
}
