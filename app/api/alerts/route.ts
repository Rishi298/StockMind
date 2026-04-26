import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = parseInt(searchParams.get('limit') ?? '50');

  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
  const [alerts, unreadCount] = await Promise.all([
    prisma.alert.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.alert.count({ where: { userId, isRead: false } }),
  ]);
  return NextResponse.json({ alerts, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json() as { action: 'markRead' | 'markAllRead'; id?: number };
  if (body.action === 'markAllRead') {
    await prisma.alert.updateMany({ where: { userId }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'markRead' && body.id) {
    await prisma.alert.updateMany({ where: { id: body.id, userId }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '0');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.alert.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
