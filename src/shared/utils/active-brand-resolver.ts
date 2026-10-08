/**
 * Resolves the active brand ID across Server Components and API layers.
 * Priority: URL SearchParam > Cookie > Fallback to first brand
 */
export function resolveActiveBrandId(
  brands: Array<{ id: string }>,
  tenantSlug: string,
  cookieStore?: { get: (name: string) => { value: string } | undefined } | null,
  searchParamBrandId?: string | null
): string {
  if (searchParamBrandId && brands.some((b) => b.id === searchParamBrandId)) {
    return searchParamBrandId;
  }
  if (cookieStore) {
    const cookieVal = cookieStore.get(`localbi_active_brand_${tenantSlug}`)?.value;
    if (cookieVal && brands.some((b) => b.id === cookieVal)) {
      return cookieVal;
    }
  }
  return brands[0]?.id || '';
}
