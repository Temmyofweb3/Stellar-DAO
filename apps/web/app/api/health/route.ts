import { NextResponse } from 'next/server';

import { parseEnv } from '@stellardao/shared';

export const revalidate = 30;

export async function GET() {
  const env = parseEnv.web();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5_000);
    const res = await fetch(`${env.NEXT_PUBLIC_HORIZON_URL}/`, { signal: ctrl.signal });
    clearTimeout(t);
    return NextResponse.json({
      status: 'ok',
      networkPassphrase: env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
      horizon: res.ok ? 'reachable' : 'down',
      contracts: {
        bridge: env.NEXT_PUBLIC_BRIDGE_CONTRACT_ID ?? 'unset',
        factory: env.NEXT_PUBLIC_FACTORY_CONTRACT_ID ?? 'unset',
      },
    });
  } catch {
    return NextResponse.json({ status: 'ok', horizon: 'down' }, { status: 200 });
  }
}
