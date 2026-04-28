'use client';

import { readAttribution } from '@/lib/attribution';

const THROTTLE_MS = 2500;
let lastSentAt = 0;

export async function trackEvent(event_type: string, metadata: Record<string, unknown> = {}) {
  const now = Date.now();
  if (now - lastSentAt < THROTTLE_MS && event_type === 'page_view') return;
  lastSentAt = now;
  const payload = {
    event_type,
    route: typeof window !== 'undefined' ? window.location.pathname : '',
    metadata: {
      ...metadata,
      attribution: readAttribution(),
      client_ts: new Date().toISOString()
    },
    created_at: new Date().toISOString()
  };
  try {
    await fetch('/api/db/product-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    // best effort analytics
  }
}
