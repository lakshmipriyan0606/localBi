import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'localBi — Enterprise Local SEO Platform',
  description: 'Enterprise multi-tenant Local SEO analytics and multi-location management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans text-foreground antialiased selection:bg-indigo-100 selection:text-indigo-900" suppressHydrationWarning>
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
