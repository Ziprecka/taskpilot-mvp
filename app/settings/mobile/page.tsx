'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

export default function MobileSetupPage() {
  const [manifestDetected, setManifestDetected] = useState(false);

  useEffect(() => {
    void fetch('/manifest.webmanifest')
      .then((res) => setManifestDetected(res.ok))
      .catch(() => setManifestDetected(false));
  }, []);

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">TaskPilot Mobile Setup</h1>
        <p className="mb-5 text-slate-400">Install TaskPilot on your phone home screen as a PWA-style app.</p>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">PWA status</h2>
          <p className="text-sm text-slate-300">Manifest detected: {manifestDetected ? 'yes' : 'no'}</p>
          <p className="text-sm text-slate-300">Install type: PWA-style home screen shortcut (not App Store app).</p>
        </div>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">iPhone (Safari)</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
            <li>Open your deployed Vercel TaskPilot URL.</li>
            <li>Tap Share.</li>
            <li>Tap Add to Home Screen.</li>
            <li>Open TaskPilot from the icon.</li>
          </ol>
        </div>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Android (Chrome)</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
            <li>Open your deployed Vercel TaskPilot URL.</li>
            <li>Open browser menu.</li>
            <li>Tap Add to Home Screen or Install app.</li>
            <li>Launch from your phone home screen.</li>
          </ol>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Mobile testing checklist</h2>
          <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <p>Dashboard cards stack correctly</p>
            <p>Session page is readable</p>
            <p>AI chat input is easy to tap</p>
            <p>Daily Mode controls are reachable</p>
            <p>Workflow generator form is usable</p>
            <p>App opens in standalone mode</p>
          </div>
          <Link href="/settings/deploy" className="btn-secondary mt-3 inline-flex text-sm">Back to deploy setup</Link>
        </div>
      </section>
    </main>
  );
}
