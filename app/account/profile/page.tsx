'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

export default function AccountProfilePage() {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void fetch('/api/auth/profile').then((res) => res.json()).then((data) => {
      if (data?.ok && data?.profile) {
        setFullName(data.profile.full_name || '');
        setAvatarUrl(data.profile.avatar_url || '');
        setXHandle(data.profile.x_handle || '');
      }
    }).catch(() => null);
  }, []);

  async function save() {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl, x_handle: xHandle })
    });
    const data = await res.json();
    setStatus(data?.ok ? 'Profile updated.' : data?.error || 'Update failed.');
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-black">Edit Profile</h1>
        <div className="card p-5">
          <input className="input mb-2" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="input mb-2" placeholder="Avatar URL (optional)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          <input className="input mb-2" placeholder="X handle (optional)" value={xHandle} onChange={(e) => setXHandle(e.target.value.replace(/^@/, ''))} />
          {status && <p className="mb-2 text-sm text-slate-300">{status}</p>}
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </section>
    </main>
  );
}
