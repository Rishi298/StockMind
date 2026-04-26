import { NextResponse } from 'next/server';

/**
 * Test Angel One SmartAPI connectivity
 */
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID;
  const clientSecret = process.env.ANGEL_ONE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Angel One credentials not configured in .env.local' },
      { status: 400 }
    );
  }

  const apiToken = process.env.ANGEL_ONE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { error: 'ANGEL_ONE_API_TOKEN not set in .env.local — authenticate via /api/auth/login first' },
      { status: 400 }
    );
  }

  try {
    // Test connection to Angel One API using INFY (token 1594)
    const response = await fetch(`${process.env.ANGEL_ONE_API_BASE}/rest/secure/angelbroking/market/v1/quote/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-PrivateKey': clientId,
      },
      body: JSON.stringify({
        mode: 'LTP',
        exchangeTokens: { NSE: ['1594'] }, // INFY token
      }),
    });

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Angel One API connected',
      credentials: {
        clientId: clientId.substring(0, 4) + '****',
        configured: true,
      },
      apiResponse: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 500 }
    );
  }
}
