import { NextResponse } from 'next/server';

export async function POST() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({
      ok: false,
      error: 'Stripe webhook not configured.',
      todo: 'Implement Stripe webhook signature validation and profile subscription updates.'
    }, { status: 501 });
  }
  return NextResponse.json({ ok: false, error: 'TODO: Stripe webhook handling not implemented yet.' }, { status: 501 });
}
