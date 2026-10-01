export interface AvailabilityResolvableProduct {
  status: string; // ACTIVE, INACTIVE, RETIRED
  publishStatus?: string; // DRAFT, PUBLISHED, UNPUBLISHED
}

export interface AvailabilityResolvableStoreProduct {
  isAvailable: boolean;
  status?: string; // ACTIVE, INACTIVE
}

export class AvailabilityResolver {
  /**
   * Resolves whether a product is available for sale at a specific store.
   * Product must be globally ACTIVE and PUBLISHED (if publishStatus is tracked),
   * and the store mapping must have isAvailable = true and status = ACTIVE.
   */
  public static isAvailableAtStore(
    product: AvailabilityResolvableProduct,
    storeProduct?: AvailabilityResolvableStoreProduct | null
  ): boolean {
    // 1. Global product active check
    if (product.status !== 'ACTIVE') {
      return false;
    }

    // 2. Global publish status check (if present, must not be UNPUBLISHED or DRAFT for consumer availability)
    if (product.publishStatus && product.publishStatus !== 'PUBLISHED') {
      return false;
    }

    // 3. Store mapping check
    if (!storeProduct) {
      return false;
    }

    if (!storeProduct.isAvailable) {
      return false;
    }

    if (storeProduct.status && storeProduct.status !== 'ACTIVE') {
      return false;
    }

    return true;
  }
}
