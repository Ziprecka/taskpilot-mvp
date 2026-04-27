import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaskPilot',
    short_name: 'TaskPilot',
    description: 'Plan the day. Execute the next move. Prove progress.',
    start_url: '/daily',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  };
}
