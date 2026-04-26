import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getQuote } from '@/lib/yahoo';
import { sendEmail, buildDigestHtml } from '@/lib/email';

export async function POST() {
  try {
    const [stocks, alerts] = await Promise.all([
      prisma.stockHolding.findMany(),
      prisma.alert.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const quotes = await Promise.allSettled(
      stocks.map((s) => getQuote(s.symbol).then((q) => ({
        symbol: s.symbol,
        cmp: q.regularMarketPrice,
        pnlPct: ((q.regularMarketPrice - s.avgBuyPrice) / s.avgBuyPrice) * 100,
        currentValue: q.regularMarketPrice * s.qty,
        invested: s.avgBuyPrice * s.qty,
      })))
    );

    const items = quotes.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<{
      symbol: string; cmp: number; pnlPct: number; currentValue: number; invested: number;
    }>).value);

    const totalValue = items.reduce((a, i) => a + i.currentValue, 0);
    const totalInvested = items.reduce((a, i) => a + i.invested, 0);
    const totalPnL = totalValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    const sorted = [...items].sort((a, b) => b.pnlPct - a.pnlPct);
    const topGainers = sorted.slice(0, 3).filter((i) => i.pnlPct > 0);
    const topLosers = sorted.slice(-3).filter((i) => i.pnlPct < 0).reverse();

    const to = process.env.EMAIL_FROM ?? '';
    const html = buildDigestHtml({ totalValue, totalPnL, totalPnLPct, topGainers, topLosers, recentAlerts: alerts });

    await sendEmail({ to, subject: `StockMind Portfolio Digest — ${new Date().toLocaleDateString('en-IN')}`, html });

    return NextResponse.json({ ok: true, to, alertCount: alerts.length, stockCount: items.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Email failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
