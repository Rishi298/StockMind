import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { NIFTY_50, NIFTY_NEXT_50 } from '@/lib/universe';

const universe = [...NIFTY_50, ...NIFTY_NEXT_50];

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const holdings = await prisma.stockHolding.findMany({ where: { userId }, orderBy: { symbol: 'asc' } });
  return NextResponse.json(holdings);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json() as {
    symbol: string; name?: string; sector?: string;
    qty: number; avgBuyPrice: number; buyDate?: string; brokerName?: string; notes?: string;
  };

  const { symbol, qty, avgBuyPrice } = body;
  if (!symbol || !qty || !avgBuyPrice) {
    return NextResponse.json({ error: 'symbol, qty, avgBuyPrice are required' }, { status: 400 });
  }

  const info = universe.find((s) => s.ticker === symbol.toUpperCase());
  const buyDate = body.buyDate ? new Date(body.buyDate) : new Date();
  const sym = symbol.toUpperCase();

  const existing = await prisma.stockHolding.findFirst({
    where: { userId, symbol: sym, accountId: 'default' },
    select: { id: true },
  });
  const holding = existing
    ? await prisma.stockHolding.update({
        where: { id: existing.id },
        data: { qty, avgBuyPrice, buyDate, brokerName: body.brokerName ?? 'Manual', notes: body.notes ?? '' },
      })
    : await prisma.stockHolding.create({
        data: {
          userId, symbol: sym, accountId: 'default',
          name: body.name ?? info?.name ?? sym,
          sector: body.sector ?? info?.sector ?? '',
          qty, avgBuyPrice, buyDate,
          brokerName: body.brokerName ?? 'Manual',
          notes: body.notes ?? '',
        },
      });

  return NextResponse.json(holding, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '0');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.stockHolding.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
