'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState('/dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get('next') || '/dashboard');
  }, []);

  async function login() {
    setError('');
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setError('Supabase auth is not configured.');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return setError(signInError.message);
    if (data.user?.id) localStorage.setItem('taskpilot-auth-user-id', data.user.id);
    router.push(nextPath);
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="card p-5">
          <h1 className="mb-3 text-3xl font-black">Login</h1>
          <input className="input mb-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input mb-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="mb-2 text-sm text-amber-300">{error}</p>}
          <button className="btn-primary w-full" onClick={login}>Login</button>
          <div className="mt-3 flex justify-between text-sm text-slate-400">
            <Link href="/signup">Create account</Link>
            <span>Forgot password (coming soon)</span>
          </div>
        </div>
      </section>
    </main>
  );
}
