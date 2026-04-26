import { NextRequest, NextResponse } from 'next/server';
import { getSummary } from '@/lib/angelone';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    const data = await getSummary(ticker.toUpperCase());
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch fundamentals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
