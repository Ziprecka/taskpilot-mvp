import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { getCurrentUser, getUserProfile } from '@/lib/auth';

export default async function AccountPage() {
  const user = await getCurrentUser();
  const profile = user ? await getUserProfile(user.id) : null;
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-black">Account</h1>
        {!user ? (
          <div className="card p-5"><p className="text-slate-300">Sign in required.</p><Link href="/login" className="btn-secondary mt-2 inline-flex">Login</Link></div>
        ) : (
          <div className="card p-5 space-y-2 text-sm text-slate-300">
            <p><span className="text-slate-500">Full name:</span> {profile?.full_name || 'Not set'}</p>
            <p><span className="text-slate-500">Email:</span> {user.email}</p>
            <p><span className="text-slate-500">Plan:</span> {profile?.plan || 'free'}</p>
            <p><span className="text-slate-500">Subscription status:</span> {profile?.subscription_status || 'free'}</p>
            <p><span className="text-slate-500">Onboarding complete:</span> {profile?.onboarding_complete ? 'yes' : 'no'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/account/profile" className="btn-secondary">Edit Profile</Link>
              <Link href="/account/billing" className="btn-secondary">Billing</Link>
              <Link href="/account/data" className="btn-secondary">Data Utilities</Link>
              <Link href="/logout" className="btn-secondary">Logout</Link>
              <button className="btn-secondary">Delete Account (coming soon)</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
