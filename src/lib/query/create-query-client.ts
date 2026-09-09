import { QueryClient } from '@tanstack/react-query';
import { AppApiError } from '../http/api-error';

/**
 * Creates an enterprise-configured TanStack Query client.
 *
 * Policies:
 * - 30s staleTime for administrative stability.
 * - 5m gcTime to prevent memory leaks while retaining warm caches.
 * - Window focus refetch disabled to avoid disrupting active form editing.
 * - Zero retries for client/authorization/conflict errors (400, 401, 403, 404, 409, 422).
 * - Max 1 retry for transient network/server failures.
 * - Mutations never auto-retry.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof AppApiError) {
            // Non-transient or client errors must not retry
            if ([400, 401, 403, 404, 409, 422].includes(error.status)) {
              return false;
            }
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
