import type { HistoryBar } from '../yahoo';
import { computeTechnicals } from '../indicators';
import type { KeyLevels } from '../indicators';

export interface TechnicalSubScore {
  score: number;
  max: 20;
  assessment: string;
}

export interface TechnicalResult {
  score: number;     // 0-10 normalized for composite
  rawScore: number;  // 0-100 per new rubric
  grade: string;
  subScores: {
    trend: TechnicalSubScore;
    momentum: TechnicalSubScore;
    volume: TechnicalSubScore;
    patternQuality: TechnicalSubScore;
    relativeStrength: TechnicalSubScore;
  };
  keyLevels: KeyLevels;
  trendDirection: 'Bullish' | 'Bearish' | 'Neutral';
  patternDetected: string;
  // Backward-compatible fields (used by Sections, AgentScorecards, etc.)
  rsi: number;
  rsiSignal: string;
  macd: number;
  macdSignal: string;
  macdTrend: string;
  dma50: number;
  dma200: number;
  trend: string;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
  atr: number;
  momentum: string;
  bollingerPosition: string;
  signals: string[];
  warnings: string[];
}

// ─── Sub-dimension scorers ──────────────────────────────────────────────────

function scoreTrend(
  price: number,
  dma50: number,
  dma200: number,
  rsi: number,
  trend: string,
): TechnicalSubScore {
  let score: number;
  let assessment: string;

  if (trend === 'strong_uptrend') {
    score = 17 + (rsi >= 60 ? 3 : rsi >= 55 ? 2 : 0);
    assessment = `Strong uptrend — price above rising 50DMA (₹${dma50.toFixed(0)}) and 200DMA (₹${dma200.toFixed(0)})`;
  } else if (trend === 'uptrend') {
    score = 13 + (dma50 > dma200 ? 2 : 0);
    assessment = `Uptrend — price above 200DMA, ${dma50 > dma200 ? 'golden cross configuration' : '50DMA momentum slowing'}`;
  } else if (trend === 'sideways') {
    const aboveMid = price > (dma50 + dma200) / 2;
    score = aboveMid ? 11 : 9;
    assessment = `Sideways consolidation — price between 50DMA (₹${dma50.toFixed(0)}) and 200DMA (₹${dma200.toFixed(0)})`;
  } else if (trend === 'downtrend') {
    score = 5 + (price > dma200 ? 2 : 0);
    assessment = `Downtrend — price below 50DMA (₹${dma50.toFixed(0)}), approaching 200DMA (₹${dma200.toFixed(0)})`;
  } else {
    // strong_downtrend
    score = 1 + (rsi <= 30 ? 2 : 0); // some credit for extreme oversold (reversal potential)
    assessment = `Strong downtrend — price below 50DMA and 200DMA, death cross in effect`;
  }

  return { score: Math.max(0, Math.min(20, score)), max: 20, assessment };
}

function scoreMomentum(rsi: number, macdHistogram: number, macdTrend: string): TechnicalSubScore {
  let score = 10;
  let assessment: string;

  // RSI component (primary)
  if (rsi >= 55 && rsi <= 70) {
    score += 6;
    assessment = `RSI ${rsi} — bullish momentum zone`;
  } else if (rsi >= 50 && rsi < 55) {
    score += 3;
    assessment = `RSI ${rsi} — mild bullish momentum`;
  } else if (rsi >= 40 && rsi < 50) {
    score -= 1;
    assessment = `RSI ${rsi} — neutral zone, momentum fading`;
  } else if (rsi >= 30 && rsi < 40) {
    score -= 3;
    assessment = `RSI ${rsi} — weak momentum, approaching oversold`;
  } else if (rsi < 30) {
    score -= 5;
    assessment = `RSI ${rsi} — deeply oversold, reversal potential but strong downward pressure`;
  } else if (rsi > 80) {
    score -= 5;
    assessment = `RSI ${rsi} — extreme overbought, reversal risk`;
  } else {
    // 70-80
    score -= 2;
    assessment = `RSI ${rsi} — overbought zone, potential pullback`;
  }

  // MACD component (secondary)
  if (macdTrend === 'bullish') {
    score += macdHistogram > 0.5 ? 5 : 3;
  } else if (macdTrend === 'bearish') {
    score -= macdHistogram < -0.5 ? 4 : 2;
  }

  return { score: Math.max(0, Math.min(20, Math.round(score))), max: 20, assessment };
}

function scoreVolume(
  obvTrend: string,
  upDownRatio: number,
  volumeRatio: number,
): TechnicalSubScore {
  let score = 10;
  let assessment: string;

  // OBV trend is the primary signal
  if (obvTrend === 'rising') {
    score += 5;
    assessment = 'OBV rising — smart money accumulating on up days';
  } else if (obvTrend === 'falling') {
    score -= 5;
    assessment = 'OBV falling — distribution pattern, selling pressure building';
  } else {
    assessment = 'OBV neutral — no clear accumulation or distribution';
  }

  // Up vs Down day volume ratio
  if (upDownRatio > 1.4) {
    score += 4;
    if (obvTrend !== 'rising') assessment = `Up-day volume ${upDownRatio}x down-day volume — accumulation signal`;
  } else if (upDownRatio > 1.1) {
    score += 2;
  } else if (upDownRatio < 0.7) {
    score -= 4;
    if (obvTrend !== 'falling') assessment = `Down-day volume ${(1 / upDownRatio).toFixed(1)}x up-day volume — distribution`;
  } else if (upDownRatio < 0.9) {
    score -= 2;
  }

  // Volume spike confirmation
  if (volumeRatio > 2) {
    score += (upDownRatio > 1) ? 2 : -2;
  }

  return { score: Math.max(0, Math.min(20, Math.round(score))), max: 20, assessment };
}

function scorePattern(pattern: { name: string; bullish: boolean; confidence: string }): TechnicalSubScore {
  const conf = pattern.confidence;
  let score: number;

  if (pattern.bullish) {
    score = conf === 'high' ? 18 : conf === 'medium' ? 14 : 10;
  } else {
    score = conf === 'high' ? 2 : conf === 'medium' ? 6 : 10;
  }

  // Specific pattern bonuses/penalties
  if (pattern.name.includes('Golden Cross')) score = 19;
  if (pattern.name.includes('Death Cross')) score = 1;
  if (pattern.name.includes('Bull Flag')) score = 16;
  if (pattern.name.includes('Bear Flag')) score = 4;
  if (pattern.name.includes('Oversold')) score = 12; // potential reversal
  if (pattern.name.includes('Overbought')) score = 7; // risky

  return {
    score: Math.max(0, Math.min(20, score)),
    max: 20,
    assessment: `${pattern.name} — ${pattern.bullish ? 'bullish' : 'bearish'} setup (${pattern.confidence} confidence)`,
  };
}

// NIFTY 50 historical annual return baseline (~12%). Used to gauge relative strength.
function scoreRelativeStrength(performance52W: number): TechnicalSubScore {
  const NIFTY_BASELINE = 12; // approximate NIFTY 50 1Y return %
  const relativeOutperformance = performance52W - NIFTY_BASELINE;
  let score: number;
  let assessment: string;

  if (performance52W > 30) {
    score = 18;
    assessment = `+${performance52W.toFixed(1)}% in 52W — top decile performer, strong relative strength`;
  } else if (performance52W > 15) {
    score = 15;
    assessment = `+${performance52W.toFixed(1)}% in 52W — outperforming NIFTY 50 by ${relativeOutperformance.toFixed(1)}%`;
  } else if (performance52W > 0) {
    score = 11;
    assessment = `+${performance52W.toFixed(1)}% in 52W — positive but near NIFTY 50 baseline`;
  } else if (performance52W > -10) {
    score = 7;
    assessment = `${performance52W.toFixed(1)}% in 52W — underperforming NIFTY 50 by ${Math.abs(relativeOutperformance).toFixed(1)}%`;
  } else {
    score = 3;
    assessment = `${performance52W.toFixed(1)}% in 52W — significant underperformance vs market`;
  }

  return { score, max: 20, assessment };
}

// ─── Main agent ─────────────────────────────────────────────────────────────

export function technicalAgent(history: HistoryBar[], currentPrice: number): TechnicalResult {
  const tech = computeTechnicals(history);
  const { rsi, macd, dma50, dma200, atr, bollinger, performance52W, volumeRatio,
          obvTrend, upDownVolumeRatio, pattern, keyLevels, trend } = tech;
  const price = currentPrice || tech.currentPrice;

  // ── Score each dimension ──
  const trendScore   = scoreTrend(price, dma50, dma200, rsi, trend);
  const momentumScore = scoreMomentum(rsi, macd.histogram, macd.trend);
  const volumeScore  = scoreVolume(obvTrend, upDownVolumeRatio, volumeRatio);
  const patternScore = scorePattern(pattern);
  const rsScore      = scoreRelativeStrength(performance52W);

  const rawScore = trendScore.score + momentumScore.score + volumeScore.score +
                   patternScore.score + rsScore.score;
  const score = Math.round((rawScore / 10) * 10) / 10; // normalize 0-100 → 0-10

  const grade =
    rawScore >= 80 ? 'A+' :
    rawScore >= 65 ? 'A'  :
    rawScore >= 50 ? 'B+' :
    rawScore >= 35 ? 'B'  :
    rawScore >= 20 ? 'C'  : 'D';

  // ── Trend direction string ──
  const trendDirection: TechnicalResult['trendDirection'] =
    trend === 'strong_uptrend' || trend === 'uptrend' ? 'Bullish' :
    trend === 'strong_downtrend' || trend === 'downtrend' ? 'Bearish' : 'Neutral';

  // ── RSI signal label ──
  const rsiSignal =
    rsi < 30 ? 'Deeply Oversold' :
    rsi < 40 ? 'Oversold Zone' :
    rsi > 80 ? 'Extreme Overbought' :
    rsi > 70 ? 'Overbought' :
    rsi > 60 ? 'Bullish' :
    rsi > 50 ? 'Neutral-Bullish' : 'Neutral';

  const macdSignal =
    macd.trend === 'bullish' ? 'Bullish Crossover' :
    macd.trend === 'bearish' ? 'Bearish' : 'Neutral';

  // ── Bollinger position ──
  let bollingerPosition = 'Middle Band';
  if (price > bollinger.upper) bollingerPosition = 'Above Upper Band';
  else if (price < bollinger.lower) bollingerPosition = 'Below Lower Band';
  else if (price > bollinger.middle) bollingerPosition = 'Upper Half';
  else bollingerPosition = 'Lower Half';

  // ── Momentum label ──
  const momentum =
    rsi > 60 && macd.trend === 'bullish' ? 'Strong Bullish' :
    rsi > 50 ? 'Moderate Bullish' :
    rsi < 40 && macd.trend === 'bearish' ? 'Strong Bearish' :
    rsi < 50 ? 'Moderate Bearish' : 'Neutral';

  // ── Signals and warnings ──
  const signals: string[] = [];
  const warnings: string[] = [];

  if (trendScore.score >= 15) signals.push(trendScore.assessment);
  if (momentumScore.score >= 14) signals.push(momentumScore.assessment);
  if (volumeScore.score >= 14) signals.push(volumeScore.assessment);
  if (patternScore.score >= 13) signals.push(patternScore.assessment);
  if (rsScore.score >= 14) signals.push(rsScore.assessment);

  if (trendScore.score <= 6) warnings.push(trendScore.assessment);
  if (momentumScore.score <= 6) warnings.push(momentumScore.assessment);
  if (volumeScore.score <= 6) warnings.push(volumeScore.assessment);
  if (patternScore.score <= 6) warnings.push(patternScore.assessment);
  if (rsScore.score <= 6) warnings.push(rsScore.assessment);

  // Add volume ratio confirmation signal
  if (volumeRatio > 1.5) signals.push(`Volume ${volumeRatio}x average — above-average participation`);

  // ── Entry / Stop-loss / Targets based on ATR ──
  const entry = +(price * 0.99).toFixed(2);
  const stopLoss = +(price - 1.5 * atr).toFixed(2);
  const risk = price - stopLoss;
  const target1 = +(price + risk * 1.5).toFixed(2);
  const target2 = +(price + risk * 3.0).toFixed(2);
  const riskReward = risk > 0 ? 2.25 : 1.5;

  // ── Trend label map ──
  const trendLabels: Record<string, string> = {
    strong_uptrend: 'Strong Uptrend',
    uptrend: 'Uptrend',
    sideways: 'Sideways / Consolidating',
    downtrend: 'Downtrend',
    strong_downtrend: 'Strong Downtrend',
  };

  return {
    score,
    rawScore,
    grade,
    subScores: {
      trend: trendScore,
      momentum: momentumScore,
      volume: volumeScore,
      patternQuality: patternScore,
      relativeStrength: rsScore,
    },
    keyLevels,
    trendDirection,
    patternDetected: pattern.name,
    // backward-compatible
    rsi,
    rsiSignal,
    macd: macd.macd,
    macdSignal,
    macdTrend: macd.trend,
    dma50,
    dma200,
    trend: trendLabels[trend] ?? trend,
    entry,
    stopLoss,
    target1,
    target2,
    riskReward,
    atr,
    momentum,
    bollingerPosition,
    signals: signals.slice(0, 6),
    warnings: warnings.slice(0, 4),
  };
}
