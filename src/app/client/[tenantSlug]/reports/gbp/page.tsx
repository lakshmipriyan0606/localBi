import { redirect } from 'next/navigation';

export default async function GbpReportsRootPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  redirect(`/client/${tenantSlug}/reports/gbp/locations`);
}
