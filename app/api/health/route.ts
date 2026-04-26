import { NextResponse } from 'next/server';
import { getServerEnvStatus } from '@/lib/env';

export async function GET() {
  const env = getServerEnvStatus();
  return NextResponse.json({
    ok: true,
    env,
    productionReady: env.productionReady,
    missing: env.missing
  });
}
