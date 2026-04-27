'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string | null } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email } : null);
      if (data.user?.id) localStorage.setItem('taskpilot-auth-user-id', data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email } : null);
      if (session?.user?.id) localStorage.setItem('taskpilot-auth-user-id', session.user.id);
      if (!session?.user) localStorage.removeItem('taskpilot-auth-user-id');
      router.refresh();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link href="/" className="text-xl font-black tracking-tight">Task<span className="text-amber-400">Pilot</span></Link>
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <Link href="/pricing" className="hover:text-white">Pricing</Link>
        <Link href="/demo" className="hover:text-white">Demo</Link>
        {user ? (
          <>
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link href="/workflows/generate" className="hover:text-white">Generate</Link>
            <Link href="/daily" className="hover:text-white">Daily</Link>
            <Link href="/account" className="hover:text-white">Account</Link>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-xs">{(user.email || 'U').slice(0, 1).toUpperCase()}</span>
            <Link href="/logout" className="rounded-full border border-slate-700 px-3 py-1">Logout</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-white">Login</Link>
            <Link href="/signup" className="rounded-full bg-amber-500 px-4 py-2 font-bold text-slate-950">Start Free</Link>
          </>
        )}
      </div>
    </nav>
  );
}
