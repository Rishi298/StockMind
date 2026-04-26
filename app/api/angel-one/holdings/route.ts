import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function getToken(): string {
  // Prefer DB-stored token (refreshed via TOTP) over env var
  return process.env.ANGEL_ONE_API_TOKEN ?? '';
}

function headers(token: string) {
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

export async function GET() {
  // Check for a fresher token stored in DB
  const tokenRecord = await prisma.settings.findUnique({ where: { key: 'angel_one_jwt' } });
  const token = tokenRecord?.value ?? getToken();

  if (!token) {
    return NextResponse.json({ error: 'Angel One token not configured' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${process.env.ANGEL_ONE_API_BASE}/rest/secure/angelbroking/portfolio/v1/getAllHolding`,
      { method: 'GET', headers: headers(token) }
    );
    const data = await res.json() as {
      status: boolean;
      message: string;
      data?: {
        holdings: Array<{
          tradingsymbol: string;
          isin: string;
          exchange: string;
          quantity: number;
          realisedquantity: number;
          averageprice: number;
          ltp: number;
          close: number;
          profitandloss: number;
          pnlpercentage: number;
          symboltoken: string;
          product: string;
        }>;
        totalholding: {
          totalholdingvalue: number;
          totalinvvalue: number;
          totalprofitandloss: number;
          totalpnlpercentage: number;
        };
      };
    };

    if (!data.status) {
      return NextResponse.json({ error: data.message ?? 'Angel One API error' }, { status: 400 });
    }

    return NextResponse.json(data.data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Request failed' }, { status: 500 });
  }
}
