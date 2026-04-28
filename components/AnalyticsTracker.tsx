'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttributionFromUrl, readAttribution } from '@/lib/attribution';
import { trackEvent } from '@/lib/trackEvent';

const ACTIVITY_KEY = 'taskpilot-last-activity-ping-at';
const PROFILE_SYNC_KEY = 'taskpilot-attribution-profile-sync';
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string>('');

  useEffect(() => {
    captureAttributionFromUrl();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    void trackEvent('page_view', { path: pathname });

    const now = Date.now();
    const lastPing = Number(sessionStorage.getItem(ACTIVITY_KEY) || 0);
    if (!Number.isFinite(lastPing) || now - lastPing > ACTIVITY_THROTTLE_MS) {
      sessionStorage.setItem(ACTIVITY_KEY, String(now));
      void fetch('/api/auth/activity', { method: 'POST' }).catch(() => null);
    }

    const synced = sessionStorage.getItem(PROFILE_SYNC_KEY) === '1';
    if (!synced) {
      sessionStorage.setItem(PROFILE_SYNC_KEY, '1');
      const attribution = readAttribution();
      if (attribution) {
        void fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attribution)
        }).catch(() => null);
      }
    }
  }, [pathname]);

  return null;
}
