import { redirect } from 'next/navigation';

/**
 * /reports/gsc has no standalone page — the GSC overview lives on the
 * shared /reports page under the "gsc" tab. Redirect seamlessly.
 */
export default async function GscIndexPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  redirect(`/client/${tenantSlug}/reports?tab=gsc`);
}
