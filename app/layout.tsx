import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'TaskPilot',
  title: 'TaskPilot — GPS for getting things done',
  description: 'AI workflow copilot for physical and digital tasks.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
