import Link from 'next/link';

export function Nav() {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link href="/" className="text-xl font-black tracking-tight">Task<span className="text-amber-400">Pilot</span></Link>
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        <Link href="/daily" className="hover:text-white">Daily</Link>
        <Link href="/sessions" className="hover:text-white">Sessions</Link>
        <Link href="/workflows/saved" className="hover:text-white">Workflows</Link>
        <Link href="/workflows/generate" className="hover:text-white">Generate</Link>
        <Link href="/settings/deploy" className="hover:text-white">Deploy</Link>
        <Link href="/workflows/new" className="rounded-full bg-amber-500 px-4 py-2 font-bold text-slate-950">Start</Link>
      </div>
    </nav>
  );
}
