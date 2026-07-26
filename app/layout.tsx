import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Thuna — your patient companion',
  description: 'A patient, safety-governed voice companion for elders.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Thuna',
  appleWebApp: {
    capable: true,
    title: 'Thuna',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Elders may need to zoom. Never lock scaling.
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0F4C4A',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
