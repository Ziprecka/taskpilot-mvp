import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata: Metadata = {
  applicationName: 'TaskPilot',
  title: 'TaskPilot — Turn goals into completed work',
  description: 'Daily execution system for proof-backed outcomes, focus blocks, workflows, and reports.',
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
