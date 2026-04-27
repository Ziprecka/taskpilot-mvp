import { NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth';

export async function GET() {
  const { user } = await getCurrentUser();
  const profile = user ? await getUserProfile(user.id) : null;
  return NextResponse.json({
    ok: true,
    serverUserExists: Boolean(user),
    userId: user?.id ?? null,
    email: user?.email ?? null,
    profileExists: Boolean(profile),
    cookiesVisibleToServer: Boolean(user),
    envDetected: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    },
    timestamp: new Date().toISOString()
  });
}
