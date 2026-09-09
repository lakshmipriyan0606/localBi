import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationClient } from '../api/location-client';
import { LocationFormInput } from '../schemas/location-schema';
import { tenantQueryKeys, NormalizedLocationFilters } from '@/lib/query/query-keys';

export function useLocationsQuery(tenantSlug: string, filters?: NormalizedLocationFilters) {
  return useQuery({
    queryKey: tenantQueryKeys.locations.list(tenantSlug, filters),
    queryFn: ({ signal }) => locationClient.listLocations(tenantSlug, filters, signal),
  });
}

export function useCreateLocationMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LocationFormInput) => locationClient.createLocation(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.locations.all(tenantSlug),
      });
    },
  });
}

export function useUpdateLocationMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      locationId,
      data,
    }: {
      locationId: string;
      data: Omit<LocationFormInput, 'brandId'> & { version: number };
    }) => locationClient.updateLocation(tenantSlug, locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.locations.all(tenantSlug),
      });
    },
  });
}

export function useArchiveLocationMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, version }: { locationId: string; version: number }) =>
      locationClient.archiveLocation(tenantSlug, locationId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.locations.all(tenantSlug),
      });
    },
  });
}
