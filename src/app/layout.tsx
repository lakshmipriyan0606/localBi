import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'localBi — Enterprise Local SEO Analytics',
  description: 'Multi-tenant, multi-brand local business analytics platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
