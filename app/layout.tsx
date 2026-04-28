import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';

export const metadata: Metadata = {
  applicationName: 'TaskPilot',
  title: 'TaskPilot — Finish the day with proof',
  description: 'Write your goal. TaskPilot turns it into missions, focus blocks, proof checklists, and a daily debrief.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'TaskPilot',
    statusBarStyle: 'black-translucent'
  },
  icons: {
    apple: '/apple-touch-icon.png'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f59e0b'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AnalyticsTracker />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
