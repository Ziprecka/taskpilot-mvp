import { NextResponse } from 'next/server';
import { getServerEnvStatus } from '@/lib/env';
import { TASKPILOT_VERSION } from '@/lib/version';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  const env = getServerEnvStatus();
  const userId = await getCurrentUserId();
  return NextResponse.json({
    app: 'TaskPilot',
    version: TASKPILOT_VERSION,
    environment: process.env.NODE_ENV || 'development',
    ok: true,
    env,
    openai: env.openai,
    supabase: env.supabase,
    robot: env.robot,
    auth: {
      configured: Boolean(env.hasSupabaseUrl && env.hasSupabaseAnonKey),
      current_user: Boolean(userId)
    },
    pwa: {
      manifest: '/manifest.webmanifest',
      start_url: '/dashboard'
    },
    productionReady: env.productionReady,
    missing: env.missing,
    timestamp: new Date().toISOString()
  });
}
