import { Nav } from '@/components/Nav';
import { getCurrentUser } from '@/lib/auth';
import { isBetaAdminEmail } from '@/lib/admin';
import { AdminAnalyticsClient } from '@/components/admin/AdminAnalyticsClient';

export default async function AdminAnalyticsPage() {
  const { user } = await getCurrentUser();
  const allowed = Boolean(user?.email && isBetaAdminEmail(user.email));
  if (!allowed) {
    return (
      <main>
        <Nav />
        <section className="mx-auto max-w-4xl px-4 py-10">
          <div className="card p-6">
            <h1 className="text-2xl font-black">Not authorized.</h1>
            <p className="mt-2 text-slate-400">This admin analytics area is restricted to beta admin accounts.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <p className="badge mb-2">Admin</p>
        <h1 className="text-3xl font-black">Analytics</h1>
        <p className="mb-5 text-sm text-slate-400">Admin analytics tracks first-party product usage events for beta improvement.</p>
        <AdminAnalyticsClient />
      </section>
    </main>
  );
}
