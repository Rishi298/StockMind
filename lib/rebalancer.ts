import { prisma } from './db';
import { getCurrentNav, getMFDirection } from './mfapi';
import { getValidToken } from './angelone-session';
import { getQuote } from './yahoo';
import { NIFTY_50 } from './universe';

const SCRIP_TOKENS: Record<string, string> = require('./scrip-tokens.json');
const API_BASE = process.env.ANGEL_ONE_API_BASE ?? '';

function angelHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-PrivateKey': process.env.NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID ?? '',
    'X-MACaddress': '00:00:00:00:00:00',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '0.0.0.0',
  };
}

export interface DiversificationScore {
  total: number;
  positionConcentration: number;  // HHI relative to equal-weight optimum
  sectorSpread: number;           // sector HHI + coverage vs benchmark
  maxPositionRisk: number;        // penalty for runaway single positions
  benchmarkAlignment: number;     // sector weights vs Nifty 50
}

export interface RebalanceSummary {
  totalStockValue: number;
  totalMFValue: number;
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  totalPnLPct: number;
  stockCount: number;
  mfCount: number;
  avgPositionSize: number;
  largestPosition: { symbol: string; weight: number };
  topSector: { name: string; weight: number };
  diversificationScore: DiversificationScore;
}

export interface ReviewItem {
  type: 'stock' | 'mf';
  symbol: string;
  name: string;
  reason: string;
  urgency: 'high' | 'medium';
  currentValue: number;
  pnlPct: number;
  pnlAbs: number;
  accountId?: string;
  action: string;
}

export interface TrimItem {
  type: 'stock' | 'mf';
  symbol: string;
  name: string;
  currentWeight: number;
  targetWeight: number;
  excessValue: number;
  accountId?: string;
}

export interface AddItem {
  type: 'stock' | 'mf';
  symbol: string;
  name: string;
  sector: string;
  reason: string;
  suggestedAllocationPct: number;
  suggestedAmount: number;
}

export interface SectorAlloc {
  sector: string;
  portfolioPct: number;
  benchmarkPct: number;
  gap: number;
  value: number;
}

export interface RebalanceReport {
  summary: RebalanceSummary;
  review: ReviewItem[];
  trim: TrimItem[];
  add: AddItem[];
  sectorBreakdown: SectorAlloc[];
  generatedAt: string;
  priceSource: 'angel' | 'yahoo';
}

const NIFTY50_SECTORS = NIFTY_50.reduce<Record<string, number>>((acc, s) => {
  acc[s.sector] = (acc[s.sector] ?? 0) + 1;
  return acc;
}, {});
const TOTAL_NIFTY50 = Object.values(NIFTY50_SECTORS).reduce((a, b) => a + b, 0);

async function bulkAngelQuote(symbols: string[], token: string): Promise<Map<string, { ltp: number; high52w: number; low52w: number; close: number }>> {
  const map = new Map<string, { ltp: number; high52w: number; low52w: number; close: number }>();
  if (!token || !API_BASE) return map;

  // Build token list from scrip-tokens + DB cache
  const cachedTokens = await prisma.settings.findMany({ where: { key: { startsWith: 'angel_token_' } } });
  const tokenMap = new Map<string, string>();
  for (const r of cachedTokens) tokenMap.set(r.key.replace('angel_token_', ''), r.value);
  for (const sym of symbols) {
    if (!tokenMap.has(sym) && SCRIP_TOKENS[sym]) tokenMap.set(sym, SCRIP_TOKENS[sym]);
  }

  const reverseMap = new Map<string, string>();
  tokenMap.forEach((tok, sym) => reverseMap.set(tok, sym));

  const tokens = symbols.map((s) => tokenMap.get(s)).filter(Boolean) as string[];
  if (!tokens.length) return map;

  const CHUNK = 50;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    try {
      const res = await fetch(`${API_BASE}/rest/secure/angelbroking/market/v1/quote/`, {
        method: 'POST',
        headers: angelHeaders(token),
        body: JSON.stringify({ mode: 'FULL', exchangeTokens: { NSE: chunk } }),
      });
      const data = await res.json() as {
        status: boolean;
        data?: { fetched: Array<{ symbolToken: string; ltp: number; high52Week: number; low52Week: number; close: number }> }
      };
      if (data.status && data.data) {
        for (const q of data.data.fetched) {
          const sym = reverseMap.get(q.symbolToken);
          if (sym && q.ltp > 0) {
            map.set(sym, { ltp: q.ltp, high52w: q.high52Week ?? 0, low52w: q.low52Week ?? 0, close: q.close ?? 0 });
          }
        }
      }
    } catch { /* continue */ }
  }
  return map;
}

export async function runRebalance(userId: string): Promise<RebalanceReport> {
  const [stocks, mfs] = await Promise.all([
    prisma.stockHolding.findMany({ where: { userId } }),
    prisma.mFHolding.findMany({ where: { userId } }),
  ]);

  // ── Stock prices via Angel One bulk (with Yahoo fallback per-symbol) ──
  const jwtToken = await getValidToken();
  const symbols = stocks.map((s) => s.symbol);
  const angelMap = await bulkAngelQuote(symbols, jwtToken);
  let priceSource: 'angel' | 'yahoo' = angelMap.size > symbols.length * 0.5 ? 'angel' : 'yahoo';

  const priceMap = new Map<string, { price: number; high52w: number; low52w: number }>();
  const yahooFallbacks = symbols.filter((s) => !angelMap.has(s));

  // Fill from Angel first
  angelMap.forEach((q, sym) => priceMap.set(sym, { price: q.ltp, high52w: q.high52w, low52w: q.low52w }));

  // Yahoo fallback only for symbols Angel didn't cover
  if (yahooFallbacks.length > 0) {
    const fallbacks = await Promise.allSettled(
      yahooFallbacks.map((sym) => getQuote(sym).then((q) => ({
        sym,
        price: q.regularMarketPrice,
        high52w: q.fiftyTwoWeekHigh ?? 0,
        low52w: q.fiftyTwoWeekLow ?? 0,
      })))
    );
    for (const r of fallbacks) {
      if (r.status === 'fulfilled') priceMap.set(r.value.sym, { price: r.value.price, high52w: r.value.high52w, low52w: r.value.low52w });
    }
  }

  // ── Stock computations ──
  let totalStockValue = 0, totalStockInvested = 0;
  const stockItems = stocks.map((s) => {
    const q = priceMap.get(s.symbol);
    const cmp = q?.price ?? s.avgBuyPrice;
    const currentValue = cmp * s.qty;
    const invested = s.avgBuyPrice * s.qty;
    const pnlAbs = currentValue - invested;
    const pnlPct = s.avgBuyPrice > 0 ? ((cmp - s.avgBuyPrice) / s.avgBuyPrice) * 100 : 0;
    totalStockValue += currentValue;
    totalStockInvested += invested;
    return { ...s, cmp, currentValue, invested, pnlAbs, pnlPct, high52w: q?.high52w ?? 0, low52w: q?.low52w ?? 0 };
  });

  // ── MF computations — correct NAV × units ──
  const mfResults = await Promise.allSettled(
    mfs.map(async (m) => {
      const [nav, dir] = await Promise.all([getCurrentNav(m.schemeCode), getMFDirection(m.schemeCode)]);
      const currentValue = nav * m.units;
      const pnlAbs = currentValue - m.investedAmount;
      const pnlPct = m.investedAmount > 0 ? (pnlAbs / m.investedAmount) * 100 : 0;
      return { ...m, currentValue, pnlAbs, pnlPct, dir };
    })
  );

  let totalMFValue = 0, totalMFInvested = 0;
  const mfItems = mfResults.map((r, i) => {
    if (r.status === 'fulfilled') {
      totalMFValue += r.value.currentValue;
      totalMFInvested += r.value.investedAmount;
      return r.value;
    }
    const m = mfs[i];
    totalMFValue += m.investedAmount;
    totalMFInvested += m.investedAmount;
    return { ...m, currentValue: m.investedAmount, pnlAbs: 0, pnlPct: 0, dir: null };
  });

  const totalValue = totalStockValue + totalMFValue;
  const totalInvested = totalStockInvested + totalMFInvested;
  const totalPnL = totalValue - totalInvested;

  // Dynamic thresholds based on portfolio size
  const n = stocks.length;
  const trimThresholdPct = n >= 50 ? 5 : n >= 20 ? 8 : 15;   // max single-stock weight
  const stopLossHigh     = n >= 50 ? -30 : -25;               // urgent stop loss %
  const stopLossMed      = n >= 50 ? -20 : -15;               // medium review %
  const absLossThreshold = 5000;                               // flag if ₹ loss > this

  // ── Sector allocation ──
  const sectorValues: Record<string, number> = {};
  for (const s of stockItems) {
    if (s.currentValue > 0) sectorValues[s.sector || 'Other'] = (sectorValues[s.sector || 'Other'] ?? 0) + s.currentValue;
  }
  const sectorBreakdown: SectorAlloc[] = Object.entries(sectorValues)
    .map(([sector, value]) => {
      const portfolioPct = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const benchmarkCount = NIFTY50_SECTORS[sector] ?? 0;
      const benchmarkPct = (benchmarkCount / TOTAL_NIFTY50) * 100;
      return { sector, portfolioPct, benchmarkPct, gap: portfolioPct - benchmarkPct, value };
    })
    .sort((a, b) => b.portfolioPct - a.portfolioPct);

  const topSector = sectorBreakdown[0] ?? { sector: 'N/A', portfolioPct: 0 };
  const largestStock = [...stockItems].sort((a, b) => b.currentValue - a.currentValue)[0];
  const largestWeight = largestStock && totalValue > 0 ? (largestStock.currentValue / totalValue) * 100 : 0;

  // ── Composite diversification score ──
  // Factor 1 — Position concentration (25%)
  // Compare actual HHI to optimal equal-weight HHI (1/n).
  // A 140-stock portfolio with one runaway position should score lower than a clean one.
  const hhi = stockItems.reduce((acc, s) => {
    const w = totalValue > 0 ? s.currentValue / totalValue : 0;
    return acc + w * w;
  }, 0);
  const optimalHHI = n > 0 ? 1 / n : 1;
  const positionConcentration = n > 0
    ? Math.round(Math.min(100, (optimalHHI / Math.max(hhi, optimalHHI)) * 100))
    : 0;

  // Factor 2 — Sector spread (30%)
  // Sector HHI: how evenly spread across sectors. Penalises single-sector dominance.
  const sectorHHI = sectorBreakdown.reduce((acc, s) => {
    const w = totalValue > 0 ? s.value / totalValue : 0;
    return acc + w * w;
  }, 0);
  const uniqueSectors = sectorBreakdown.length;
  const benchmarkSectors = Object.keys(NIFTY50_SECTORS).length;
  const coverageRatio = Math.min(1, uniqueSectors / benchmarkSectors);
  const sectorSpread = Math.round((1 - sectorHHI) * 70 + coverageRatio * 30);

  // Factor 3 — Max position risk (25%)
  // Even one 20%-weight stock in a 140-stock portfolio should heavily penalise the score.
  const maxPositionRisk =
    largestWeight <= 3  ? 100 :
    largestWeight <= 5  ? Math.round(100 - (largestWeight - 3) * 10) :
    largestWeight <= 10 ? Math.round(80 - (largestWeight - 5) * 8) :
    largestWeight <= 20 ? Math.round(40 - (largestWeight - 10) * 3) : 10;

  // Factor 4 — Benchmark alignment (20%)
  // Sum of absolute deviations from Nifty 50 sector weights, capped at 100.
  // A 200% total deviation (completely different sector mix) → score 0.
  let totalSectorDev = 0;
  for (const [sector, count] of Object.entries(NIFTY50_SECTORS)) {
    const benchPct = (count / TOTAL_NIFTY50) * 100;
    const portPct = sectorBreakdown.find((s) => s.sector === sector)?.portfolioPct ?? 0;
    totalSectorDev += Math.abs(portPct - benchPct);
  }
  const benchmarkAlignment = Math.max(0, Math.round(100 - totalSectorDev * 1.2));

  const diversificationScore: DiversificationScore = {
    total: Math.round(
      positionConcentration * 0.25 +
      sectorSpread         * 0.30 +
      maxPositionRisk      * 0.25 +
      benchmarkAlignment   * 0.20
    ),
    positionConcentration,
    sectorSpread,
    maxPositionRisk,
    benchmarkAlignment,
  };

  const summary: RebalanceSummary = {
    totalStockValue, totalMFValue, totalValue, totalInvested,
    totalPnL, totalPnLPct: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
    stockCount: stocks.length, mfCount: mfs.length,
    avgPositionSize: stocks.length > 0 ? totalStockValue / stocks.length : 0,
    largestPosition: { symbol: largestStock?.symbol ?? '', weight: largestWeight },
    topSector: { name: topSector.sector, weight: topSector.portfolioPct },
    diversificationScore,
  };

  // ── Review flags ──
  const review: ReviewItem[] = [];

  for (const s of stockItems) {
    const weight = totalValue > 0 ? (s.currentValue / totalValue) * 100 : 0;
    const near52wLow = s.low52w > 0 && s.cmp < s.low52w * 1.05;
    const near52wHigh = s.high52w > 0 && s.cmp > s.high52w * 0.95;

    if (s.pnlPct <= stopLossHigh || (s.pnlPct <= stopLossMed && s.pnlAbs <= -absLossThreshold)) {
      review.push({
        type: 'stock', symbol: s.symbol, name: s.name,
        reason: `Down ${s.pnlPct.toFixed(1)}% (₹${Math.abs(s.pnlAbs).toLocaleString('en-IN', { maximumFractionDigits: 0 })} loss). Cut losses or average down only if thesis holds.`,
        urgency: s.pnlPct <= stopLossHigh ? 'high' : 'medium',
        currentValue: s.currentValue, pnlPct: s.pnlPct, pnlAbs: s.pnlAbs,
        accountId: s.accountId,
        action: 'Consider exiting or setting a strict stop-loss',
      });
    } else if (near52wLow && s.pnlPct < -10) {
      review.push({
        type: 'stock', symbol: s.symbol, name: s.name,
        reason: `Trading near 52-week low (₹${s.cmp.toFixed(0)} vs low ₹${s.low52w.toFixed(0)}). Down ${s.pnlPct.toFixed(1)}%.`,
        urgency: 'medium',
        currentValue: s.currentValue, pnlPct: s.pnlPct, pnlAbs: s.pnlAbs,
        accountId: s.accountId,
        action: 'Review fundamental thesis before adding more',
      });
    }

    if (near52wHigh && s.pnlPct > 50 && weight > trimThresholdPct / 2) {
      review.push({
        type: 'stock', symbol: s.symbol, name: s.name,
        reason: `Up ${s.pnlPct.toFixed(1)}% and near 52-week high. Partial profit booking recommended.`,
        urgency: 'medium',
        currentValue: s.currentValue, pnlPct: s.pnlPct, pnlAbs: s.pnlAbs,
        accountId: s.accountId,
        action: 'Book 25–50% profits; let the rest run',
      });
    }
  }

  // Sector concentration flag
  for (const sec of sectorBreakdown) {
    if (sec.portfolioPct > 35) {
      review.push({
        type: 'stock', symbol: sec.sector, name: sec.sector,
        reason: `${sec.sector} is ${sec.portfolioPct.toFixed(1)}% of your portfolio — heavily concentrated. Benchmark weight is ${sec.benchmarkPct.toFixed(1)}%.`,
        urgency: 'medium',
        currentValue: sec.value, pnlPct: 0, pnlAbs: 0,
        action: 'Reduce sector exposure by trimming overweight positions',
      });
    }
  }

  for (const m of mfItems) {
    const dir = m.dir;
    if (dir && dir.consecutiveUnderperformMonths >= 3) {
      review.push({
        type: 'mf', symbol: m.schemeCode, name: m.schemeName,
        reason: `Underperforming benchmark for ${dir.consecutiveUnderperformMonths} consecutive months. 1Y return: ${(dir.trailing1Y ?? 0).toFixed(1)}%.`,
        urgency: dir.consecutiveUnderperformMonths >= 5 ? 'high' : 'medium',
        currentValue: m.currentValue, pnlPct: m.pnlPct, pnlAbs: m.pnlAbs,
        action: 'Consider switching to a better-performing fund in the same category',
      });
    }
  }

  // Sort: high urgency first, then by absolute ₹ loss
  review.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === 'high' ? -1 : 1;
    return a.pnlAbs - b.pnlAbs;
  });

  // ── Trim: overweight positions ──
  const trim: TrimItem[] = [];
  for (const s of stockItems) {
    const weight = totalValue > 0 ? (s.currentValue / totalValue) * 100 : 0;
    if (weight > trimThresholdPct) {
      const targetWeight = trimThresholdPct * 0.7;
      trim.push({
        type: 'stock', symbol: s.symbol, name: s.name,
        currentWeight: weight, targetWeight,
        excessValue: ((weight - targetWeight) / 100) * totalValue,
        accountId: s.accountId,
      });
    }
  }
  for (const m of mfItems) {
    const weight = totalValue > 0 ? (m.currentValue / totalValue) * 100 : 0;
    if (weight > 15) {
      trim.push({
        type: 'mf', symbol: m.schemeCode, name: m.schemeName,
        currentWeight: weight, targetWeight: 10,
        excessValue: ((weight - 10) / 100) * totalValue,
      });
    }
  }
  trim.sort((a, b) => b.currentWeight - a.currentWeight);

  // ── Add: underweight sectors vs Nifty 50 benchmark ──
  const heldSymbols = new Set(stocks.map((s) => s.symbol));
  const add: AddItem[] = [];
  const freedCapital = trim.reduce((a, t) => a + t.excessValue, 0);

  for (const [sector, count] of Object.entries(NIFTY50_SECTORS)) {
    const benchmarkPct = (count / TOTAL_NIFTY50) * 100;
    const current = sectorBreakdown.find((s) => s.sector === sector);
    const portfolioPct = current?.portfolioPct ?? 0;
    if (portfolioPct < benchmarkPct * 0.4) {
      const candidates = NIFTY_50.filter((s) => s.sector === sector && !heldSymbols.has(s.ticker));
      if (candidates.length > 0) {
        const candidate = candidates[0];
        add.push({
          type: 'stock', symbol: candidate.ticker, name: candidate.name, sector,
          reason: `${sector} is underweight: ${portfolioPct.toFixed(1)}% vs ${benchmarkPct.toFixed(1)}% in Nifty 50`,
          suggestedAllocationPct: benchmarkPct,
          suggestedAmount: Math.round((freedCapital * benchmarkPct) / 100),
        });
      }
    }
  }

  return {
    summary,
    review,
    trim,
    add: add.slice(0, 6),
    sectorBreakdown,
    generatedAt: new Date().toISOString(),
    priceSource,
  };
}
