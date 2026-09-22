import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
});

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
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans text-foreground antialiased selection:bg-indigo-100 selection:text-indigo-900" suppressHydrationWarning>
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
