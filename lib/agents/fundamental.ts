import type { SummaryData } from '../yahoo';

export interface FundamentalSubScore {
  score: number;
  max: 20;
  assessment: string;
}

export interface FundamentalResult {
  score: number;     // 0-10 normalized for composite
  rawScore: number;  // 0-100 per new rubric
  grade: string;
  subScores: {
    valuation: FundamentalSubScore;
    growth: FundamentalSubScore;
    profitability: FundamentalSubScore;
    financialHealth: FundamentalSubScore;
    moatStrength: FundamentalSubScore;
  };
  metrics: {
    // New names
    forwardPE: number | null;
    trailingPE: number | null;
    psRatio: number | null;
    evEbitda: number | null;
    pegRatio: number | null;
    revenueGrowthYoY: number | null;
    epsGrowthYoY: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    fcfMargin: number | null;
    roe: number | null;
    roa: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    pbRatio: number | null;
    dividendYield: number | null;
    // Legacy aliases (keep for existing UI code)
    peRatio: number | null;
    roeFiveYr: number | null;
    revenueGrowth: number | null;
    earningsGrowth: number | null;
    freeCashFlowYield: number | null;
  };
  valuationAssessment: string;
  growthOutlook: string;
  moatRating: 'Wide' | 'Narrow' | 'No Moat';
  strengths: string[];
  risks: string[];
}

function safeNum(val: unknown): number | null {
  if (val == null || typeof val === 'object') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// Yahoo Finance returns margins/growth as decimals (0.18 = 18%) or percentages.
// Normalize to percentage.
function toPct(val: number | null): number | null {
  if (val == null) return null;
  return Math.abs(val) > 1 ? val : val * 100;
}

// Sector-specific forward PE benchmarks for NSE/BSE
const SECTOR_PE: Record<string, number> = {
  'Information Technology': 22,
  'Technology': 22,
  'Financial Services': 18,
  'Banking': 12,
  'Consumer Defensive': 45,
  'Consumer Cyclical': 30,
  'Healthcare': 22,
  'Energy': 12,
  'Basic Materials': 10,
  'Industrials': 20,
  'Real Estate': 20,
  'Communication Services': 18,
  'Utilities': 14,
};

function getSectorPE(sector: string): number {
  for (const [key, val] of Object.entries(SECTOR_PE)) {
    if (sector.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 18; // NSE broad market default
}

// ─── Sub-dimension scorers ──────────────────────────────────────────────────

function scoreValuation(
  forwardPE: number | null,
  pegRatio: number | null,
  evEbitda: number | null,
  sector: string,
): FundamentalSubScore {
  const sectorAvgPE = getSectorPE(sector);
  let score = 10;
  const notes: string[] = [];

  if (forwardPE !== null && forwardPE > 0) {
    const discount = (sectorAvgPE - forwardPE) / sectorAvgPE;
    if (discount > 0.30)       { score += 7; notes.push(`Forward P/E ${forwardPE.toFixed(1)}x — >30% below sector avg (${sectorAvgPE}x)`); }
    else if (discount > 0.10)  { score += 4; notes.push(`Forward P/E ${forwardPE.toFixed(1)}x — moderate discount to sector`); }
    else if (discount > -0.10) {             notes.push(`Forward P/E ${forwardPE.toFixed(1)}x — in line with sector avg`); }
    else if (discount > -0.30) { score -= 3; notes.push(`Forward P/E ${forwardPE.toFixed(1)}x — 10-30% premium to sector`); }
    else                       { score -= 6; notes.push(`Forward P/E ${forwardPE.toFixed(1)}x — >30% premium, requires flawless execution`); }
  }

  if (pegRatio !== null && pegRatio > 0) {
    if (pegRatio < 1)         { score += 4; notes.push(`PEG ${pegRatio.toFixed(2)} — growth at a compelling discount`); }
    else if (pegRatio < 1.5)  { score += 2; notes.push(`PEG ${pegRatio.toFixed(2)} — reasonable growth/value trade-off`); }
    else if (pegRatio > 3)    { score -= 4; notes.push(`PEG ${pegRatio.toFixed(2)} — growth fully priced in`); }
    else if (pegRatio > 2)    { score -= 2; notes.push(`PEG ${pegRatio.toFixed(2)} — stretched`); }
  }

  if (evEbitda !== null && evEbitda > 0) {
    if (evEbitda < 8)        { score += 3; notes.push(`EV/EBITDA ${evEbitda.toFixed(1)}x — attractive vs peers`); }
    else if (evEbitda < 12)  { score += 1; }
    else if (evEbitda > 30)  { score -= 3; notes.push(`EV/EBITDA ${evEbitda.toFixed(1)}x — extended`); }
    else if (evEbitda > 20)  { score -= 1; }
  }

  return {
    score: Math.max(0, Math.min(20, Math.round(score))),
    max: 20,
    assessment: notes[0] ?? 'Insufficient valuation data to assess',
  };
}

function scoreGrowth(
  revenueGrowth: number | null,
  epsGrowth: number | null,
): FundamentalSubScore {
  let score = 10;
  const notes: string[] = [];

  if (revenueGrowth !== null) {
    const g = toPct(revenueGrowth)!;
    if (g > 30)      { score += 8; notes.push(`Revenue +${g.toFixed(1)}% YoY — hyper-growth, TAM expanding`); }
    else if (g > 15) { score += 5; notes.push(`Revenue +${g.toFixed(1)}% YoY — strong growth, above sector`); }
    else if (g > 8)  { score += 2; notes.push(`Revenue +${g.toFixed(1)}% YoY — moderate, in line with expectations`); }
    else if (g > 0)  { score -= 1; notes.push(`Revenue +${g.toFixed(1)}% YoY — low growth, limited momentum`); }
    else if (g > -5) { score -= 4; notes.push(`Revenue ${g.toFixed(1)}% YoY — declining, market share at risk`); }
    else             { score -= 7; notes.push(`Revenue ${g.toFixed(1)}% YoY — sharp contraction`); }
  }

  if (epsGrowth !== null) {
    const g = toPct(epsGrowth)!;
    if (g > 25)      { score += 3; notes.push(`EPS +${g.toFixed(1)}% — earnings acceleration`); }
    else if (g > 10) { score += 1; }
    else if (g < 0)  { score -= 2; notes.push(`EPS ${g.toFixed(1)}% — earnings pressure`); }
  }

  return {
    score: Math.max(0, Math.min(20, Math.round(score))),
    max: 20,
    assessment: notes[0] ?? 'Growth data not available',
  };
}

function scoreProfitability(
  operatingMargin: number | null,
  netMargin: number | null,
  roe: number | null,
  fcfMargin: number | null,
): FundamentalSubScore {
  let score = 8;
  const notes: string[] = [];

  const opPct = toPct(operatingMargin);
  if (opPct !== null) {
    if (opPct > 25)      { score += 7; notes.push(`Operating margin ${opPct.toFixed(1)}% — exceptional, sector-leading profitability`); }
    else if (opPct > 15) { score += 4; notes.push(`Operating margin ${opPct.toFixed(1)}% — strong, margins stable or improving`); }
    else if (opPct > 8)  { score += 1; notes.push(`Operating margin ${opPct.toFixed(1)}% — average, in line with sector`); }
    else if (opPct > 2)  { score -= 1; notes.push(`Operating margin ${opPct.toFixed(1)}% — below average, under pressure`); }
    else if (opPct < 0)  { score -= 4; notes.push(`Negative operating margin — cash burn concern`); }
  }

  const roePct = toPct(roe);
  if (roePct !== null) {
    if (roePct > 20)     { score += 4; notes.push(`ROE ${roePct.toFixed(1)}% — excellent capital allocation`); }
    else if (roePct > 15){ score += 2; }
    else if (roePct < 8) { score -= 2; notes.push(`ROE ${roePct.toFixed(1)}% — poor capital efficiency`); }
  }

  if (fcfMargin !== null) {
    if (fcfMargin > 20)  { score += 2; notes.push(`FCF margin ${fcfMargin.toFixed(1)}% — strong cash generation`); }
    else if (fcfMargin < 0) { score -= 1; notes.push('Negative FCF — cash outflow'); }
  }

  return {
    score: Math.max(0, Math.min(20, Math.round(score))),
    max: 20,
    assessment: notes[0] ?? 'Profitability data not available',
  };
}

function scoreFinancialHealth(
  deRatio: number | null,
  currentRatio: number | null,
  totalCash: number | null,
  totalDebt: number | null,
): FundamentalSubScore {
  let score = 10;
  const notes: string[] = [];

  // Net cash position is the strongest signal
  if (totalCash !== null && totalDebt !== null && totalCash > totalDebt) {
    score += 5;
    notes.push('Net cash position — no refinancing risk');
  }

  if (deRatio !== null) {
    if (deRatio < 0.3)      { score += 5; notes.push(`D/E ${deRatio.toFixed(2)}x — fortress balance sheet`); }
    else if (deRatio < 0.8) { score += 3; notes.push(`D/E ${deRatio.toFixed(2)}x — healthy leverage`); }
    else if (deRatio < 1.5) {             notes.push(`D/E ${deRatio.toFixed(2)}x — moderate leverage, manageable`); }
    else if (deRatio < 2.5) { score -= 4; notes.push(`D/E ${deRatio.toFixed(2)}x — elevated leverage, interest rate sensitive`); }
    else                    { score -= 7; notes.push(`D/E ${deRatio.toFixed(2)}x — high leverage, refinancing risk`); }
  }

  if (currentRatio !== null) {
    if (currentRatio > 2)        { score += 3; notes.push(`Current ratio ${currentRatio.toFixed(2)} — strong liquidity`); }
    else if (currentRatio > 1.2) { score += 1; }
    else if (currentRatio < 1)   { score -= 3; notes.push(`Current ratio ${currentRatio.toFixed(2)} — liquidity stress`); }
  }

  return {
    score: Math.max(0, Math.min(20, Math.round(score))),
    max: 20,
    assessment: notes[0] ?? 'Balance sheet data not available',
  };
}

function scoreMoat(
  roe: number | null,
  operatingMargin: number | null,
  revenueGrowth: number | null,
  sector: string,
): FundamentalSubScore & { moatRating: 'Wide' | 'Narrow' | 'No Moat' } {
  let score = 8;
  const notes: string[] = [];

  // ROE is Warren Buffett's primary moat proxy
  const roePct = toPct(roe);
  if (roePct !== null) {
    if (roePct > 25)     { score += 7; notes.push(`ROE ${roePct.toFixed(1)}% — Buffett-grade moat: consistently high returns signal durable advantage`); }
    else if (roePct > 18){ score += 4; notes.push(`ROE ${roePct.toFixed(1)}% — moat indicators present`); }
    else if (roePct < 10){ score -= 3; notes.push(`ROE ${roePct.toFixed(1)}% — below cost of capital, limited moat`); }
  }

  // High operating margins = pricing power moat
  const opPct = toPct(operatingMargin);
  if (opPct !== null) {
    if (opPct > 25)      { score += 5; notes.push(`${opPct.toFixed(1)}% operating margin — pricing power and scale advantages`); }
    else if (opPct > 15) { score += 2; }
    else if (opPct < 5)  { score -= 2; notes.push('Thin margins indicate commoditised competition'); }
  }

  // Revenue growth = market share defence
  const revPct = toPct(revenueGrowth);
  if (revPct !== null) {
    if (revPct > 15)     { score += 2; notes.push(`${revPct.toFixed(1)}% revenue growth — expanding market position`); }
    else if (revPct < 0) { score -= 1; notes.push('Revenue decline — competitive pressure on market share'); }
  }

  const finalScore = Math.max(0, Math.min(20, Math.round(score)));
  const moatRating: 'Wide' | 'Narrow' | 'No Moat' =
    finalScore >= 15 ? 'Wide' : finalScore >= 9 ? 'Narrow' : 'No Moat';

  return {
    score: finalScore,
    max: 20,
    assessment: notes[0] ?? `Sector: ${sector || 'General business'} — moat based on financial proxies`,
    moatRating,
  };
}

// ─── Main agent ─────────────────────────────────────────────────────────────

export function fundamentalAgent(summary: SummaryData): FundamentalResult {
  const fd = summary.financialData as Record<string, unknown>;
  const ks = summary.defaultKeyStatistics as Record<string, unknown>;
  const sd = summary.summaryDetail as Record<string, unknown>;
  const profile = summary.assetProfile as Record<string, unknown>;
  const pr = summary.price as Record<string, unknown>;

  const sector = String(profile?.sector ?? '');

  // ── Raw metric extraction ──
  const forwardPE    = safeNum(ks.forwardPE);
  const trailingPE   = safeNum(sd.trailingPE) ?? safeNum(pr.trailingPE) ?? safeNum(ks.trailingPE);
  const psRatio      = safeNum(ks.priceToSalesTrailing12Months);
  const evEbitda     = safeNum(ks.enterpriseToEbitda);
  const pegRatio     = safeNum(ks.pegRatio);
  const pbRatio      = safeNum(ks.priceToBook);

  const revenueGrowth  = safeNum(fd.revenueGrowth);
  const epsGrowth      = safeNum(fd.earningsGrowth);

  const grossMargin    = safeNum(fd.grossMargins);
  const operatingMargin= safeNum(fd.operatingMargins);
  const netMargin      = safeNum(fd.profitMargins);
  const roe            = safeNum(fd.returnOnEquity);
  const roa            = safeNum(fd.returnOnAssets);

  // Yahoo Finance debtToEquity is expressed as (ratio × 100) — normalize to ratio
  const rawDE          = safeNum(fd.debtToEquity);
  const debtToEquity   = rawDE !== null ? (rawDE > 5 ? rawDE / 100 : rawDE) : null;

  const currentRatio   = safeNum(fd.currentRatio);
  const totalCash      = safeNum(fd.totalCash);
  const totalDebt      = safeNum(fd.totalDebt);
  const totalRevenue   = safeNum(fd.totalRevenue);
  const freeCashflow   = safeNum(fd.freeCashflow);
  const dividendYield  = safeNum(sd.dividendYield) ?? safeNum(sd.trailingAnnualDividendYield);

  const fcfMargin = freeCashflow && totalRevenue && totalRevenue > 0
    ? (freeCashflow / totalRevenue) * 100
    : null;

  const freeCashFlowYield = safeNum(ks.marketCap)
    ? freeCashflow && safeNum(ks.marketCap)! > 0
      ? (freeCashflow / safeNum(ks.marketCap)!) * 100
      : null
    : null;

  // ── Score each dimension ──
  const valuation     = scoreValuation(forwardPE, pegRatio, evEbitda, sector);
  const growth        = scoreGrowth(revenueGrowth, epsGrowth);
  const profitability = scoreProfitability(operatingMargin, netMargin, roe, fcfMargin);
  const health        = scoreFinancialHealth(debtToEquity, currentRatio, totalCash, totalDebt);
  const moat          = scoreMoat(roe, operatingMargin, revenueGrowth, sector);

  const rawScore = valuation.score + growth.score + profitability.score + health.score + moat.score;
  const score    = Math.round((rawScore / 10) * 10) / 10; // normalize 0-100 → 0-10

  const grade =
    rawScore >= 80 ? 'A+' :
    rawScore >= 65 ? 'A'  :
    rawScore >= 50 ? 'B+' :
    rawScore >= 35 ? 'B'  :
    rawScore >= 20 ? 'C'  : 'D';

  // ── Narrative assessment ──
  const revPctStr = revenueGrowth !== null ? toPct(revenueGrowth)!.toFixed(1) + '%' : '—';
  const valuationAssessment =
    valuation.score >= 15 ? `Undervalued — trading below intrinsic value relative to ${sector || 'sector'} peers` :
    valuation.score >= 10 ? 'Fairly valued — price reflects current business fundamentals' :
    'Overvalued — premium demands near-flawless growth execution';

  const growthOutlook =
    growth.score >= 15 ? `Strong — revenue growing ${revPctStr} with positive estimate revisions` :
    growth.score >= 10 ? `Moderate — revenue at ${revPctStr}, in line with sector expectations` :
    growth.score >= 6  ? `Low — ${revPctStr} growth, limited earnings momentum` :
    `Negative — revenue contracting ${revPctStr}, market share risk`;

  // ── Strengths & risks ──
  const strengths: string[] = [];
  const risks: string[] = [];

  const dims = [
    { d: valuation, name: 'Valuation' },
    { d: growth, name: 'Growth' },
    { d: profitability, name: 'Profitability' },
    { d: health, name: 'Financial Health' },
    { d: moat, name: 'Moat' },
  ];
  for (const { d } of dims) {
    if (d.score >= 15) strengths.push(d.assessment);
    if (d.score <= 6)  risks.push(d.assessment);
  }

  return {
    score,
    rawScore,
    grade,
    subScores: {
      valuation,
      growth,
      profitability,
      financialHealth: health,
      moatStrength: moat,
    },
    metrics: {
      forwardPE,
      trailingPE,
      psRatio,
      evEbitda,
      pegRatio,
      revenueGrowthYoY: revenueGrowth,
      epsGrowthYoY: epsGrowth,
      grossMargin,
      operatingMargin,
      netMargin,
      fcfMargin,
      roe,
      roa,
      debtToEquity,
      currentRatio,
      pbRatio,
      dividendYield,
      freeCashFlowYield,
      // legacy aliases
      peRatio: trailingPE,
      roeFiveYr: roe,
      revenueGrowth,
      earningsGrowth: epsGrowth,
    },
    valuationAssessment,
    growthOutlook,
    moatRating: moat.moatRating,
    strengths: strengths.slice(0, 5),
    risks: risks.slice(0, 5),
  };
}
