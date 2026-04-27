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
  const [status, setStatus] = useState('');
  function getSmartDefaultRoute() {
    if (typeof window === 'undefined') return '/dashboard';
    const onboardingComplete = localStorage.getItem('taskpilot-onboarding-complete') === 'true';
    if (!onboardingComplete) return '/onboarding';
    const today = new Date().toISOString().slice(0, 10);
    const dailyKeys = Object.keys(localStorage).filter((key) => key.includes(`taskpilot-daily-`) && key.includes(today));
    if (dailyKeys.length) {
      try {
        const parsed = JSON.parse(localStorage.getItem(dailyKeys[0]) || '{}');
        if (parsed?.active_focus_block?.status === 'active') return '/daily';
        if (Array.isArray(parsed?.outcomes) && parsed.outcomes.length) return '/daily';
      } catch {
        // ignore
      }
    }
    const hasSession = Object.keys(localStorage).some((key) => key.startsWith('taskpilot-session-'));
    return hasSession ? '/dashboard' : '/onboarding';
  }

  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get('next') || '/dashboard');
    if (params.get('error') === 'auth_callback_failed') {
      setError('Auth callback failed. Please try logging in again.');
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.refresh();
        router.replace(params.get('next') || getSmartDefaultRoute());
      }
    });
  }, [router]);

  async function login() {
    setError('');
    setStatus('');
    setEmailNotConfirmed(false);
    if (!email || !password) {
      setError('Missing email/password');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setError('Supabase auth is not configured.');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const lower = signInError.message.toLowerCase();
        if (lower.includes('email not confirmed')) {
          setEmailNotConfirmed(true);
          setError('Email not confirmed. Check your inbox or resend confirmation.');
          return;
        }
        if (lower.includes('invalid login credentials')) {
          setError('Invalid login credentials');
          return;
        }
        setError(signInError.message);
        return;
      }
      if (data.user?.id) localStorage.setItem('taskpilot-auth-user-id', data.user.id);
      router.refresh();
      router.push(nextPath === '/dashboard' ? getSmartDefaultRoute() : nextPath);
    } catch {
      setError('Network error');
    }
  }

  async function resendConfirmationEmail() {
    setError('');
    setStatus('');
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setError('Supabase auth is not configured.');
    if (!email) return setError('Enter your email first.');
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'https://taskpilot.live';
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`
        }
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setStatus('Confirmation email sent. Check your inbox and spam folder.');
    } catch {
      setError('Network error');
    }
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
          {status && <p className="mb-2 text-sm text-emerald-300">{status}</p>}
          <button className="btn-primary w-full" onClick={login}>Login</button>
          {emailNotConfirmed && (
            <button className="btn-secondary mt-2 w-full" onClick={resendConfirmationEmail}>Resend confirmation email</button>
          )}
          <div className="mt-3 flex justify-between text-sm text-slate-400">
            <Link href="/signup">Create account</Link>
            <span>Forgot password (coming soon)</span>
          </div>
        </div>
      </section>
    </main>
  );
}
