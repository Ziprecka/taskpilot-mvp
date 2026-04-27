'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Nav } from '@/components/Nav';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function signup() {
    setError('');
    setStatus('');
    if (!email || !password || !confirmPassword) return setError('Missing email or password.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setError('Supabase auth is not configured.');
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://taskpilot.live';
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${origin}/auth/callback`
      }
    });
    if (signUpError) return setError(signUpError.message);
    if (data.user?.id) {
      localStorage.setItem('taskpilot-auth-user-id', data.user.id);
      await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email })
      }).catch(() => null);
    }
    if (data.session) {
      router.refresh();
      router.push('/dashboard');
      return;
    }
    setStatus('Account created. Check your email to confirm your account before logging in.');
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="card p-5">
          <h1 className="mb-3 text-3xl font-black">Create account</h1>
          <input className="input mb-2" placeholder="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="input mb-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input mb-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input mb-2" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {error && <p className="mb-2 text-sm text-amber-300">{error}</p>}
          {status && <p className="mb-2 text-sm text-emerald-300">{status}</p>}
          <button className="btn-primary w-full" onClick={signup}>Create account</button>
          <p className="mt-3 text-sm text-slate-400">Already have an account? <Link href="/login">Login</Link></p>
        </div>
      </section>
    </main>
  );
}
