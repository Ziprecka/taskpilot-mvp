import { Nav } from '@/components/Nav';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { getPlanLimits } from '@/lib/plans';

export default async function BillingPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login?next=/account/billing');
  const profile = await getUserProfile(user.id);
  const plan = (profile?.plan || 'free') as 'free' | 'pro' | 'team';
  const limits = getPlanLimits(plan);
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-black">Billing</h1>
        <div className="card p-5 text-sm text-slate-300 space-y-2">
          <p><span className="text-slate-500">Current plan:</span> {plan}</p>
          <p><span className="text-slate-500">Subscription status:</span> {profile?.subscription_status || 'free'}</p>
          <p><span className="text-slate-500">Beta pricing:</span> Free / Pro ($19 placeholder) / Team ($49 placeholder)</p>
          <p><span className="text-slate-500">Plan limits:</span> playbook generation {String(limits.playbook_generation)}, active sessions {String(limits.active_sessions)}</p>
          {!stripeConfigured && <p className="text-amber-300">Stripe is not configured yet. Billing checkout is coming soon.</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" disabled>Upgrade to Pro (coming soon)</button>
            <button className="btn-secondary" disabled>Upgrade to Team (coming soon)</button>
            <button className="btn-secondary" disabled>Start Checkout (TODO)</button>
            <button className="btn-secondary" disabled>Manage Billing Portal (TODO)</button>
          </div>
        </div>
      </section>
    </main>
  );
}
