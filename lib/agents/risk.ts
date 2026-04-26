import type { QuoteData, SummaryData } from '../yahoo';

export interface RiskResult {
  grade: 'A' | 'B' | 'C' | 'D';
  score: number; // 0-10, higher = riskier
  topRisks: string[];
  mitigants: string[];
  positionSizing: string;
  volatility: 'Low' | 'Medium' | 'High' | 'Very High';
  beta: number | null;
  stressScenario: {
    bear20pct: number;
    bear40pct: number;
  };
  liquidityRisk: 'Low' | 'Medium' | 'High';
}

function safeNum(val: unknown): number | null {
  if (val == null || typeof val === 'object') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export function riskAgent(quote: QuoteData, summary: SummaryData): RiskResult {
  const fd = summary.financialData as Record<string, unknown>;
  const ks = summary.defaultKeyStatistics as Record<string, unknown>;
  const sd = summary.summaryDetail as Record<string, unknown>;
  const profile = summary.assetProfile as Record<string, unknown>;

  const topRisks: string[] = [];
  const mitigants: string[] = [];
  let riskScore = 3; // baseline (lower = safer)

  // Beta
  const beta = safeNum(ks.beta) ?? safeNum(sd.beta);
  if (beta !== null) {
    if (beta > 1.5) { riskScore += 2; topRisks.push(`High beta of ${beta.toFixed(2)} — amplified market moves`); }
    else if (beta > 1.2) { riskScore += 1; topRisks.push(`Above-market beta of ${beta.toFixed(2)}`); }
    else if (beta < 0.7) { riskScore -= 1; mitigants.push(`Low beta of ${beta.toFixed(2)} — defensive, low market correlation`); }
  }

  // Leverage risk
  const debtToEquity = safeNum(ks.debtToEquity) ?? safeNum(fd.debtToEquity);
  if (debtToEquity !== null) {
    const de = debtToEquity > 10 ? debtToEquity / 100 : debtToEquity;
    if (de > 2.5) { riskScore += 2; topRisks.push(`High financial leverage (D/E: ${de.toFixed(2)}x) — rate hike exposure`); }
    else if (de > 1.2) { riskScore += 1; topRisks.push(`Elevated debt levels (D/E: ${de.toFixed(2)}x)`); }
    else if (de < 0.5) mitigants.push(`Conservative balance sheet (D/E: ${de.toFixed(2)}x)`);
  }

  // Interest coverage
  const ic = safeNum(fd.ebitda);
  const intExp = safeNum(fd.totalDebt);
  if (ic !== null && intExp !== null && intExp > 0) {
    const coverage = ic / intExp;
    if (coverage < 2) { riskScore += 1.5; topRisks.push('Thin interest coverage — debt servicing risk in rising rate environment'); }
  }

  // Valuation risk
  const pe = safeNum(sd.trailingPE) ?? safeNum(ks.trailingPE);
  if (pe !== null) {
    if (pe > 60) { riskScore += 1.5; topRisks.push(`Very high P/E of ${pe.toFixed(0)}x — vulnerable to earnings misses`); }
    else if (pe > 40) { riskScore += 0.5; topRisks.push(`Premium P/E of ${pe.toFixed(0)}x — priced for execution`); }
    else if (pe < 12) mitigants.push(`Value P/E of ${pe.toFixed(0)}x — limited downside from valuation compression`);
  }

  // Earnings growth consistency
  const egrowth = safeNum(fd.earningsGrowth);
  if (egrowth !== null) {
    const pct = egrowth > 1 ? egrowth : egrowth * 100;
    if (pct < -10) { riskScore += 1; topRisks.push(`Earnings declining at ${Math.abs(pct).toFixed(1)}% — fundamental deterioration`); }
    else if (pct > 20) mitigants.push(`Strong earnings growth of ${pct.toFixed(1)}% provides cushion`);
  }

  // Sector-specific risks
  const sector = String(profile?.sector ?? '').toLowerCase();
  if (sector.includes('bank') || sector.includes('nbfc')) {
    topRisks.push('Credit cycle risk — NPA formation can accelerate in economic downturns');
    mitigants.push('RBI regulatory oversight provides systemic stability');
  }
  if (sector.includes('pharma')) {
    topRisks.push('USFDA inspection risk and price erosion in US generics market');
  }
  if (sector.includes('it') || sector.includes('tech')) {
    topRisks.push('Global recession risk reducing enterprise IT spending');
    mitigants.push('Diversified client base and multi-year contracts provide visibility');
  }
  if (sector.includes('metal') || sector.includes('steel') || sector.includes('mining')) {
    topRisks.push('Commodity price cyclicality — China demand a key swing factor');
  }
  if (sector.includes('energy') || sector.includes('oil')) {
    topRisks.push('Global crude price volatility and government price controls');
  }

  // Liquidity risk
  const avgVol = quote.averageVolume;
  const marketCap = quote.marketCap;
  let liquidityRisk: RiskResult['liquidityRisk'] = 'Low';
  if (avgVol < 100000) { liquidityRisk = 'High'; riskScore += 1; topRisks.push('Low trading volume — exit liquidity risk for large positions'); }
  else if (avgVol < 500000) { liquidityRisk = 'Medium'; }

  if (marketCap > 1e13) mitigants.push('Large-cap status — high institutional liquidity');
  else if (marketCap < 1e12) { riskScore += 0.5; }

  // 52-week position risk
  const priceFrom52WH = quote.fiftyTwoWeekHigh > 0
    ? ((quote.regularMarketPrice - quote.fiftyTwoWeekHigh) / quote.fiftyTwoWeekHigh * 100).toFixed(1)
    : null;
  if (priceFrom52WH !== null && parseFloat(priceFrom52WH) < -30) {
    mitigants.push(`Trading ${Math.abs(parseFloat(priceFrom52WH))}% below 52W high — mean reversion potential`);
  }

  // Clamp score
  riskScore = Math.max(0, Math.min(10, Math.round(riskScore * 10) / 10));

  const grade: RiskResult['grade'] =
    riskScore <= 3 ? 'A' :
    riskScore <= 5 ? 'B' :
    riskScore <= 7 ? 'C' : 'D';

  const volatility: RiskResult['volatility'] =
    (beta ?? 1) > 1.5 ? 'Very High' :
    (beta ?? 1) > 1.2 ? 'High' :
    (beta ?? 1) > 0.8 ? 'Medium' : 'Low';

  // Position sizing recommendation
  const positionSizing =
    grade === 'A'
      ? '4-6% of portfolio — low-risk, suitable for core holding'
      : grade === 'B'
      ? '2-4% of portfolio — moderate risk, standard position'
      : grade === 'C'
      ? '1-2% of portfolio — higher risk, use tight stop-losses'
      : '0.5-1% of portfolio — speculative; only for high-risk tolerance accounts';

  const currentPrice = quote.regularMarketPrice;
  return {
    grade,
    score: riskScore,
    topRisks: topRisks.slice(0, 5),
    mitigants: mitigants.slice(0, 4),
    positionSizing,
    volatility,
    beta,
    stressScenario: {
      bear20pct: +(currentPrice * 0.8).toFixed(0),
      bear40pct: +(currentPrice * 0.6).toFixed(0),
    },
    liquidityRisk,
  };
}
