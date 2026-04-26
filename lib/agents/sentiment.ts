import type { QuoteData, SummaryData } from '../yahoo';

export interface SentimentResult {
  index: number; // -100 to 100
  label: string;
  narrative: string;
  analystTarget: number | null;
  analystTargetUpside: number | null;
  analystRating: string;
  buyCount: number | null;
  holdCount: number | null;
  sellCount: number | null;
  institutionalOwnership: number | null;
  shortInterest: number | null;
  insiderOwnership: number | null;
  signals: string[];
}

function safeNum(val: unknown): number | null {
  if (val == null || typeof val === 'object') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export function sentimentAgent(quote: QuoteData, summary: SummaryData): SentimentResult {
  const fd = summary.financialData as Record<string, unknown>;
  const ks = summary.defaultKeyStatistics as Record<string, unknown>;
  const rt = summary.recommendationTrend as Record<string, unknown>;

  const signals: string[] = [];
  let sentimentScore = 0;

  // Analyst target price
  const analystTarget = safeNum(fd.targetMeanPrice) ?? safeNum(fd.targetHighPrice);
  const currentPrice = quote.regularMarketPrice;
  let analystTargetUpside: number | null = null;
  if (analystTarget && currentPrice > 0) {
    analystTargetUpside = +((analystTarget - currentPrice) / currentPrice * 100).toFixed(1);
    if (analystTargetUpside > 20) {
      sentimentScore += 25;
      signals.push(`Analyst consensus target ₹${analystTarget.toFixed(0)} implies ${analystTargetUpside}% upside`);
    } else if (analystTargetUpside > 10) {
      sentimentScore += 15;
      signals.push(`Analyst target ₹${analystTarget.toFixed(0)} — ${analystTargetUpside}% upside`);
    } else if (analystTargetUpside < -10) {
      sentimentScore -= 20;
      signals.push(`Analyst target ₹${analystTarget.toFixed(0)} — implies ${Math.abs(analystTargetUpside)}% downside`);
    }
  }

  // Recommendation
  const recKey = safeNum(fd.recommendationKey ?? fd.targetMeanPrice);
  const recMean = safeNum(fd.recommendationMean);
  let analystRating = 'Hold';
  if (recMean !== null) {
    if (recMean <= 1.5) { analystRating = 'Strong Buy'; sentimentScore += 30; }
    else if (recMean <= 2.5) { analystRating = 'Buy'; sentimentScore += 20; }
    else if (recMean <= 3.5) { analystRating = 'Hold'; }
    else if (recMean <= 4.5) { analystRating = 'Underperform'; sentimentScore -= 20; }
    else { analystRating = 'Sell'; sentimentScore -= 30; }
  } else {
    const recStr = String(fd.recommendationKey ?? '').toLowerCase();
    if (recStr.includes('strong_buy') || recStr.includes('strongbuy')) { analystRating = 'Strong Buy'; sentimentScore += 30; }
    else if (recStr.includes('buy')) { analystRating = 'Buy'; sentimentScore += 20; }
    else if (recStr.includes('sell')) { analystRating = 'Sell'; sentimentScore -= 30; }
  }

  // Analyst counts from trend
  const trends = (rt as { trend?: Array<Record<string, unknown>> })?.trend;
  let buyCount: number | null = null;
  let holdCount: number | null = null;
  let sellCount: number | null = null;

  if (Array.isArray(trends) && trends.length > 0) {
    const latest = trends[0];
    buyCount = (safeNum(latest.strongBuy) ?? 0) + (safeNum(latest.buy) ?? 0);
    holdCount = safeNum(latest.hold);
    sellCount = (safeNum(latest.sell) ?? 0) + (safeNum(latest.strongSell) ?? 0);

    const total = (buyCount ?? 0) + (holdCount ?? 0) + (sellCount ?? 0);
    if (total > 0) {
      const buyPct = ((buyCount ?? 0) / total * 100).toFixed(0);
      signals.push(`${buyCount} analysts Buy / ${holdCount} Hold / ${sellCount} Sell (${buyPct}% bullish)`);
    }
  }

  // Institutional ownership
  const institutionalOwnership = safeNum(ks.heldPercentInstitutions);
  if (institutionalOwnership !== null) {
    const pct = institutionalOwnership > 1 ? institutionalOwnership : institutionalOwnership * 100;
    if (pct > 60) { sentimentScore += 10; signals.push(`High institutional ownership at ${pct.toFixed(1)}% — smart money conviction`); }
    else if (pct > 40) signals.push(`Institutional ownership: ${pct.toFixed(1)}%`);
  }

  // Short interest (proxy from sharesShortPriorMonthDate)
  const shortRatio = safeNum(ks.shortRatio);
  let shortInterest: number | null = null;
  if (shortRatio !== null) {
    shortInterest = shortRatio;
    if (shortRatio > 10) { sentimentScore -= 15; signals.push(`High short interest (${shortRatio.toFixed(1)} days to cover) — bearish bets`); }
    else if (shortRatio < 2) signals.push(`Low short interest — limited bearish positioning`);
  }

  // Insider ownership
  const insiderOwnership = safeNum(ks.heldPercentInsiders);
  if (insiderOwnership !== null) {
    const pct = insiderOwnership > 1 ? insiderOwnership : insiderOwnership * 100;
    if (pct > 50) signals.push(`Promoter holding ${pct.toFixed(1)}% — skin in the game`);
    else if (pct > 30) signals.push(`Insider ownership: ${pct.toFixed(1)}%`);
  }

  // Clamp to -100..100
  sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

  const label =
    sentimentScore >= 60 ? 'Strongly Bullish' :
    sentimentScore >= 25 ? 'Bullish' :
    sentimentScore >= -10 ? 'Neutral' :
    sentimentScore >= -40 ? 'Bearish' : 'Strongly Bearish';

  const narrative =
    sentimentScore >= 60
      ? `Market sentiment is strongly positive. Analyst consensus is ${analystRating.toLowerCase()} with meaningful upside to target prices. Institutional participation is constructive.`
      : sentimentScore >= 25
      ? `Sentiment is moderately bullish with a ${analystRating.toLowerCase()} consensus. The stock is well-covered by analysts with positive to neutral price targets.`
      : sentimentScore >= -10
      ? `Sentiment is mixed to neutral. Analyst views are divergent. Wait for a catalyst to establish a clear trend.`
      : `Sentiment is cautious. Analyst downgrades or target cuts have created headwinds. Monitor for fundamental improvement before committing capital.`;

  return {
    index: sentimentScore,
    label,
    narrative,
    analystTarget,
    analystTargetUpside,
    analystRating,
    buyCount,
    holdCount,
    sellCount,
    institutionalOwnership,
    shortInterest,
    insiderOwnership,
    signals: signals.slice(0, 5),
  };
}
