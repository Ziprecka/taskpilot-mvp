'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { CommandPalette } from '@/components/CommandPalette';
import { TASKPILOT_VERSION } from '@/lib/version';

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  const [isBetaAdmin, setIsBetaAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const publicPrimary = [
    { href: '/', label: 'Home' },
    { href: '/daily', label: 'Today' },
    { href: '/workflows/saved', label: 'Playbooks' },
    { href: '/reports', label: 'Reports' },
    { href: '/pricing', label: 'Pricing' }
  ];
  const signedInPrimary = [
    { href: '/dashboard', label: 'Home' },
    { href: '/daily', label: 'Today' },
    { href: '/workflows/saved', label: 'Playbooks' },
    { href: '/reports', label: 'Reports' },
    { href: '/account', label: 'Account' }
  ];
  const toolsBase = [
    { href: '/settings/robot', label: 'DeskBot Settings' },
    { href: '/feedback', label: 'Feedback' }
  ];
  const toolsAdmin = [
    { href: '/settings/setup', label: 'Setup' },
    { href: '/settings/deploy', label: 'Deploy' },
    { href: '/settings/auth-debug', label: 'Auth Debug' }
  ];

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || null;
      setUser(data.user ? { email } : null);
      const allow = String(process.env.NEXT_PUBLIC_TASKPILOT_BETA_ADMIN_EMAILS || '')
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      setIsBetaAdmin(Boolean(email && allow.includes(email.toLowerCase())));
      if (data.user?.id) localStorage.setItem('taskpilot-auth-user-id', data.user.id);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      setUser(session?.user ? { email } : null);
      const allow = String(process.env.NEXT_PUBLIC_TASKPILOT_BETA_ADMIN_EMAILS || '')
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      setIsBetaAdmin(Boolean(email && allow.includes(email.toLowerCase())));
      if (session?.user?.id) localStorage.setItem('taskpilot-auth-user-id', session.user.id);
      if (!session?.user) localStorage.removeItem('taskpilot-auth-user-id');
      setAuthLoading(false);
      router.refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const signedIn = Boolean(user);
  const primary = signedIn ? signedInPrimary : publicPrimary;
  const tools = signedIn ? [...toolsBase, ...(isBetaAdmin ? toolsAdmin : [])] : [];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="text-xl font-black tracking-tight">Task<span className="text-amber-400">Pilot</span></Link>
          <div className="hidden items-center gap-1 md:flex">
            {primary.map((item) => (
              <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-1.5 text-sm transition ${isActive(item.href) ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white'}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {signedIn && <button className="btn-ghost btn-sm hidden md:inline-flex" onClick={() => window.dispatchEvent(new Event('taskpilot-open-command'))}>
            Command / Ctrl+K
          </button>}

          {signedIn && <details className="hidden md:block">
            <summary className="btn-ghost btn-sm cursor-pointer list-none">Tools</summary>
            <div className="absolute right-36 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-xl">
              {tools.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">{item.label}</Link>
              ))}
              <p className="mt-2 px-2 text-[10px] text-slate-500">TaskPilot beta · build {TASKPILOT_VERSION}</p>
            </div>
          </details>}

          {!signedIn && !authLoading ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="btn-ghost btn-sm">Login</Link>
              <Link href="/signup" className="btn-primary btn-sm">Start Free</Link>
            </div>
          ) : (
            <details>
              <summary className="cursor-pointer list-none rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-200">
                {authLoading ? '...' : (user?.email || 'U').slice(0, 1).toUpperCase()}
              </summary>
              <div className="absolute right-4 mt-2 w-52 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-xl">
                <Link href="/account" className="block rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Account</Link>
                <Link href="/logout" className="block rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Logout</Link>
              </div>
            </details>
          )}

          <button className="btn-ghost btn-sm md:hidden" onClick={() => setShowMobileMenu((p) => !p)}>Menu</button>
        </div>
      </nav>

      {showMobileMenu && (
        <div className="border-t border-slate-800 px-4 py-2 md:hidden">
          <div className="mb-2 flex gap-2">
            <Link href={signedIn ? '/dashboard' : '/'} className={`rounded-lg px-3 py-1 text-sm ${isActive(signedIn ? '/dashboard' : '/') ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>Home</Link>
            <Link href="/daily" className={`rounded-lg px-3 py-1 text-sm ${isActive('/daily') ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>Today</Link>
            <Link href="/workflows/saved" className={`rounded-lg px-3 py-1 text-sm ${isActive('/workflows/saved') ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>Playbooks</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[...primary.slice(0, 5), ...(signedIn ? tools : [{ href: '/login', label: 'Login' }, { href: '/signup', label: 'Start Free' }])].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg border border-slate-700 px-2 py-1 text-slate-300">{item.label}</Link>
            ))}
          </div>
        </div>
      )}
      <CommandPalette />
    </header>
  );
}

