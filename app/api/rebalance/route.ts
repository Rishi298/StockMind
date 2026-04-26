import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runRebalance } from '@/lib/rebalancer';
import { prisma } from '@/lib/db';
import { createAlert } from '@/lib/alerts';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const report = await runRebalance(userId);

    await prisma.rebalanceHistory.create({
      data: { userId, report: JSON.stringify(report) },
    });

    const urgentCount = report.review.filter((r) => r.urgency === 'high').length;
    if (urgentCount > 0) {
      await createAlert({
        userId,
        type: 'REBALANCE_DUE',
        title: 'Portfolio Rebalancing Required',
        message: `${urgentCount} urgent + ${report.review.length - urgentCount} review items. Trim ${report.trim.length} overweight positions.`,
        severity: 'high',
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
