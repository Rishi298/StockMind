import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const holdings = await prisma.mFHolding.findMany({ where: { userId }, orderBy: { schemeName: 'asc' } });
  return NextResponse.json(holdings);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json() as {
    schemeCode: string; schemeName: string; amcName?: string;
    category?: string; units: number; avgNav: number; investedAmount?: number;
  };
  const { schemeCode, schemeName, units, avgNav } = body;
  if (!schemeCode || !schemeName || !units || !avgNav) {
    return NextResponse.json({ error: 'schemeCode, schemeName, units, avgNav are required' }, { status: 400 });
  }

  const existing = await prisma.mFHolding.findFirst({ where: { userId, schemeCode }, select: { id: true } });
  const holding = existing
    ? await prisma.mFHolding.update({
        where: { id: existing.id },
        data: { units, avgNav, investedAmount: body.investedAmount ?? units * avgNav },
      })
    : await prisma.mFHolding.create({
        data: { userId, schemeCode, schemeName, amcName: body.amcName ?? '', category: body.category ?? 'Equity', units, avgNav, investedAmount: body.investedAmount ?? units * avgNav },
      });

  return NextResponse.json(holding, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '0');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.mFHolding.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
