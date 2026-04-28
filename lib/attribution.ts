export const ATTRIBUTION_KEY = 'taskpilot_attribution';

export type TaskPilotAttribution = {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  x_handle?: string;
  landing_path?: string;
  first_seen_at?: string;
};

export function readAttribution(): TaskPilotAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TaskPilotAttribution;
  } catch {
    return null;
  }
}

export function captureAttributionFromUrl(): TaskPilotAttribution | null {
  if (typeof window === 'undefined') return null;
  const existing = readAttribution();
  if (existing?.first_seen_at) return existing;
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const next: TaskPilotAttribution = {
    ref: params.get('ref') || undefined,
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    x_handle: params.get('x_handle') || undefined,
    landing_path: url.pathname,
    first_seen_at: new Date().toISOString()
  };
  if (!next.ref && !next.utm_source && !next.utm_campaign && !next.x_handle) return existing || null;
  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // noop
  }
  return next;
}
