'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

export default function AccountProfilePage() {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [workUse, setWorkUse] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [offer, setOffer] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [commonTools, setCommonTools] = useState('');
  const [preferredTone, setPreferredTone] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void fetch('/api/auth/profile').then((res) => res.json()).then((data) => {
      if (data?.ok && data?.profile) {
        setFullName(data.profile.full_name || '');
        setAvatarUrl(data.profile.avatar_url || '');
        setXHandle(data.profile.x_handle || '');
        setWorkUse(data.profile.work_use || '');
        setBusinessName(data.profile.business_name || '');
        setIndustry(data.profile.industry || '');
        setServiceArea(data.profile.service_area || '');
        setOffer(data.profile.offer || '');
        setTargetCustomer(data.profile.target_customer || '');
        setCommonTools(Array.isArray(data.profile.common_tools) ? data.profile.common_tools.join(', ') : '');
        setPreferredTone(data.profile.preferred_tone || '');
      }
    }).catch(() => null);
  }, []);

  async function save() {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        avatar_url: avatarUrl,
        x_handle: xHandle,
        work_use: workUse || null,
        business_name: businessName || null,
        industry: industry || null,
        service_area: serviceArea || null,
        offer: offer || null,
        target_customer: targetCustomer || null,
        common_tools: commonTools
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        preferred_tone: preferredTone || null
      })
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
          <select className="input mb-2" value={workUse} onChange={(e) => setWorkUse(e.target.value)}>
            <option value="">What do you mostly use TaskPilot for?</option>
            <option value="service business">Service business</option>
            <option value="sales/outreach">Sales/outreach</option>
            <option value="building apps">Building apps</option>
            <option value="school">School</option>
            <option value="admin">Admin</option>
            <option value="hardware projects">Hardware projects</option>
            <option value="personal">Personal</option>
          </select>
          <input className="input mb-2" placeholder="Business/project name (optional)" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <input className="input mb-2" placeholder="Industry (optional)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <input className="input mb-2" placeholder="Service area / market (optional)" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} />
          <input className="input mb-2" placeholder="Main offer / project (optional)" value={offer} onChange={(e) => setOffer(e.target.value)} />
          <input className="input mb-2" placeholder="Target customer/audience (optional)" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} />
          <input className="input mb-2" placeholder="Common tools (comma separated)" value={commonTools} onChange={(e) => setCommonTools(e.target.value)} />
          <input className="input mb-2" placeholder="Preferred tone (optional)" value={preferredTone} onChange={(e) => setPreferredTone(e.target.value)} />
          {status && <p className="mb-2 text-sm text-slate-300">{status}</p>}
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </section>
    </main>
  );
}
