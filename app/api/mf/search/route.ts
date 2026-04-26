import { NextRequest, NextResponse } from 'next/server';
import { searchMFSchemes } from '@/lib/mfapi';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json([]);
  try {
    const results = await searchMFSchemes(q, 20);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Failed to search MF schemes' }, { status: 500 });
  }
}
