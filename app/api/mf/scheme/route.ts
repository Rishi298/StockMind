import { NextRequest, NextResponse } from 'next/server';
import { getMFDetail, getMFTrailingReturns, getMFDirection } from '@/lib/mfapi';

export async function GET(req: NextRequest) {
  const schemeCode = new URL(req.url).searchParams.get('code') ?? '';
  if (!schemeCode) return NextResponse.json({ error: 'code required' }, { status: 400 });
  try {
    const [detail, trailing, direction] = await Promise.all([
      getMFDetail(schemeCode),
      getMFTrailingReturns(schemeCode),
      getMFDirection(schemeCode),
    ]);
    return NextResponse.json({
      meta: detail.meta,
      latestNav: detail.data[0] ?? null,
      history: detail.data.slice(0, 365),
      trailing,
      direction,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch MF data' }, { status: 500 });
  }
}
