import { NextResponse } from 'next/server';

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      ok: false,
      error: 'Stripe not configured. Set STRIPE_SECRET_KEY to enable billing portal.',
      todo: 'Implement Stripe billing portal session creation.'
    }, { status: 501 });
  }
  return NextResponse.json({ ok: false, error: 'TODO: Stripe billing portal not implemented yet.' }, { status: 501 });
}
