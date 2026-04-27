import { getStorageUserKey } from '@/lib/storage';

type ProductEvent = {
  id: string;
  user_id: string;
  event_type: string;
  route: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const LOCAL_EVENTS_KEY = 'taskpilot-product-events';

export async function trackProductEvent(eventType: string, route: string, metadata: Record<string, unknown> = {}) {
  const event: ProductEvent = {
    id: crypto.randomUUID(),
    user_id: getStorageUserKey(),
    event_type: eventType,
    route,
    metadata,
    created_at: new Date().toISOString()
  };
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(list) ? [event, ...list].slice(0, 300) : [event];
      localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(next));
    } catch {
      // ignore local tracking failures
    }
  }
  try {
    await fetch('/api/db/product-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  } catch {
    // ignore network failures for lightweight analytics
  }
}

