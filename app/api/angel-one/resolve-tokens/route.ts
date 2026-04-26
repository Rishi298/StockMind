import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSymbolToToken } from '@/lib/scripmaster';

export async function POST() {
  const stocks = await prisma.stockHolding.findMany({ select: { symbol: true } });
  const symbols = stocks.map((s: { symbol: string }) => s.symbol);

  const existing = await prisma.settings.findMany({
    where: { key: { startsWith: 'angel_token_' } },
  });
  const cachedSet = new Set(existing.map((r) => r.key.replace('angel_token_', '')));

  let scripMap: Map<string, string>;
  try {
    scripMap = await getSymbolToToken();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load ScripMaster' },
      { status: 500 }
    );
  }

  const resolved: string[] = [];
  const failed: string[] = [];

  const upserts = symbols
    .map((symbol) => {
      if (cachedSet.has(symbol)) return null;
      const token = scripMap.get(symbol);
      if (!token) { failed.push(symbol); return null; }
      resolved.push(symbol);
      return prisma.settings.upsert({
        where: { key: `angel_token_${symbol}` },
        update: { value: token },
        create: { key: `angel_token_${symbol}`, value: token },
      });
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  await Promise.all(upserts);

  return NextResponse.json({
    resolved: resolved.length,
    failed,
    cached: cachedSet.size + resolved.length,
    total: symbols.length,
    message: `Resolved ${resolved.length} new tokens. ${
      failed.length > 0 ? `Not in ScripMaster: ${failed.join(', ')}` : 'All resolved.'
    }`,
  });
}
