import { Prisma } from '@prisma/client';

export type DecimalOrNumber = Prisma.Decimal | number | string | null | undefined;

export interface PriceResolvableProduct {
  basePrice?: DecimalOrNumber;
}

export interface PriceResolvableStoreProduct {
  priceOverride?: DecimalOrNumber;
}

export class PriceResolver {
  /**
   * Resolves the effective product price for a store.
   * Priority:
   * 1. StoreProduct.priceOverride (if defined and non-null)
   * 2. Product.basePrice (if defined and non-null)
   * 3. 0 fallback
   */
  public static resolvePrice(
    product: PriceResolvableProduct,
    storeProduct?: PriceResolvableStoreProduct | null
  ): number {
    if (storeProduct?.priceOverride !== undefined && storeProduct?.priceOverride !== null) {
      const overrideVal = Number(storeProduct.priceOverride);
      if (!isNaN(overrideVal)) {
        return overrideVal;
      }
    }

    if (product.basePrice !== undefined && product.basePrice !== null) {
      const baseVal = Number(product.basePrice);
      if (!isNaN(baseVal)) {
        return baseVal;
      }
    }

    return 0;
  }
}
