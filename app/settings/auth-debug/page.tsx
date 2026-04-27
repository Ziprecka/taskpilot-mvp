'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthDebugPage() {
  const router = useRouter();
  const [serverDebug, setServerDebug] = useState<any>(null);
  const [clientUser, setClientUser] = useState<any>(null);

  async function refreshAuthState() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      setClientUser(data.user ?? null);
    }
    const res = await fetch('/api/auth/debug');
    const data = await res.json();
    setServerDebug(data);
    router.refresh();
  }

  useEffect(() => {
    void refreshAuthState();
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    localStorage.removeItem('taskpilot-auth-user-id');
    router.refresh();
    router.replace('/login');
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-black">Auth Debug</h1>
        <div className="card p-5 space-y-2 text-sm text-slate-300">
          <p>client session exists: {clientUser ? 'yes' : 'no'}</p>
          <p>server user exists: {serverDebug?.serverUserExists ? 'yes' : 'no'}</p>
          <p>user id: {serverDebug?.userId || 'none'}</p>
          <p>email: {serverDebug?.email || 'none'}</p>
          <p>profile row exists: {serverDebug?.profileExists ? 'yes' : 'no'}</p>
          <p>cookies visible to server: {serverDebug?.cookiesVisibleToServer ? 'yes' : 'no'}</p>
          <p>NEXT_PUBLIC_SUPABASE_URL detected: {serverDebug?.envDetected?.hasSupabaseUrl ? 'yes' : 'no'}</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY detected: {serverDebug?.envDetected?.hasSupabaseAnonKey ? 'yes' : 'no'}</p>
          <p>Site URL expected: https://taskpilot.live</p>
          <p>callback route exists: yes (`/auth/callback`)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => void refreshAuthState()}>Refresh auth state</button>
            <button className="btn-secondary" onClick={() => void signOut()}>Sign out</button>
            <Link className="btn-secondary" href="/dashboard">Go dashboard</Link>
            <Link className="btn-secondary" href="/login">Go login</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
