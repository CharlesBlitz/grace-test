'use client';

import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/authContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Grace Companion</title>
        <meta name="description" content="Senior care companion with voice reminders and family connection" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#A7D8F0" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Grace" />
      </head>
      <body style={{ fontFamily: 'var(--font-nunito), sans-serif' }} className="flex flex-col min-h-screen">
        <AuthProvider>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
