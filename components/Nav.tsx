'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { CommandPalette } from '@/components/CommandPalette';

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  const linkCls = (href: string) =>
    `rounded-lg px-2 py-1 transition ${pathname === href ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white'}`;

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
    <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="text-xl font-black tracking-tight">Task<span className="text-amber-400">Pilot</span></Link>
      <div className="flex items-center gap-1 text-sm">
        <button className="btn-ghost btn-sm hidden md:inline-flex" onClick={() => window.dispatchEvent(new Event('taskpilot-open-command'))}>Command</button>
        <Link href="/pricing" className={linkCls('/pricing')}>Pricing</Link>
        <Link href="/demo" className={`${linkCls('/demo')} hidden sm:inline-flex`}>Demo</Link>
        {user ? (
          <>
            <Link href="/dashboard" className={linkCls('/dashboard')}>Dashboard</Link>
            <Link href="/workflows/generate" className={`${linkCls('/workflows/generate')} hidden md:inline-flex`}>Generate</Link>
            <Link href="/daily" className={`${linkCls('/daily')} hidden sm:inline-flex`}>Daily</Link>
            <Link href="/account" className={linkCls('/account')}>Account</Link>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-xs">{(user.email || 'U').slice(0, 1).toUpperCase()}</span>
            <Link href="/logout" className="btn-ghost btn-sm">Logout</Link>
          </>
        ) : (
          <>
            <Link href="/login" className={linkCls('/login')}>Login</Link>
            <Link href="/signup" className="btn-primary btn-sm">Start Free</Link>
          </>
        )}
      </div>
      <CommandPalette />
    </nav>
  );
}
