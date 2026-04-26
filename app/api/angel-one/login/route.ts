import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Angel One SmartAPI: generate a new JWT session using client code + PIN + TOTP.
// The user supplies their TOTP from the Angel One authenticator app.
// The password is stored (as entered by user) and hashed server-side.
export async function POST(req: NextRequest) {
  const body = await req.json() as { clientCode: string; pin: string; totp: string };
  const { clientCode, pin, totp } = body;

  if (!clientCode || !pin || !totp) {
    return NextResponse.json({ error: 'clientCode, pin, and totp are required' }, { status: 400 });
  }

  if (!/^\d{6}$/.test(totp)) {
    return NextResponse.json({ error: 'TOTP must be a 6-digit number' }, { status: 400 });
  }

  try {
    // Angel One expects the PIN as plain text (they hash it server-side).
    const res = await fetch(
      `${process.env.ANGEL_ONE_API_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-PrivateKey': process.env.NEXT_PUBLIC_ANGEL_ONE_CLIENT_ID ?? '',
          'X-MACaddress': '00:00:00:00:00:00',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '0.0.0.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ clientcode: clientCode, password: pin, totp }),
      }
    );

    const data = await res.json() as {
      status: boolean;
      message: string;
      data?: { jwtToken: string; refreshToken: string; feedToken: string; clientcode: string };
    };

    if (!data.status || !data.data?.jwtToken) {
      return NextResponse.json(
        { error: data.message ?? 'Login failed — check client code, PIN, and TOTP' },
        { status: 401 }
      );
    }

    // Store the new JWT in the DB so all API routes pick it up automatically
    await prisma.settings.upsert({
      where: { key: 'angel_one_jwt' },
      update: { value: data.data.jwtToken },
      create: { key: 'angel_one_jwt', value: data.data.jwtToken },
    });

    if (data.data.refreshToken) {
      await prisma.settings.upsert({
        where: { key: 'angel_one_refresh_token' },
        update: { value: data.data.refreshToken },
        create: { key: 'angel_one_refresh_token', value: data.data.refreshToken },
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Angel One session refreshed successfully',
      clientCode: data.data.clientcode,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 500 });
  }
}
