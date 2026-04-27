'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace('/');
      return;
    }
    void supabase.auth.signOut().finally(() => {
      localStorage.removeItem('taskpilot-auth-user-id');
      router.replace('/');
    });
  }, [router]);
  return <main className="p-8 text-sm text-slate-300">Signing out...</main>;
}
