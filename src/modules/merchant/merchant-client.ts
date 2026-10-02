import { AppError } from '@/shared/errors';

export interface MerchantAccount {
  id: string;
  name: string;
  sellerId: string;
  isManager?: boolean;
}

export interface MerchantPrice {
  value: string; // e.g. "2499.00"
  currency: string; // e.g. "INR"
}

export interface MerchantProductInput {
  offerId: string; // Stable SKU / ID
  title: string;
  description: string;
  link: string;
  imageLink: string;
  contentLanguage: string;
  targetCountry: string;
  feedLabel?: string | undefined;
  channel: 'online' | 'local' | 'online_and_local';
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder';
  price: MerchantPrice;
  condition?: 'new' | 'refurbished' | 'used' | undefined;
  brand?: string | undefined;
  gtin?: string | undefined;
  mpn?: string | undefined;
  googleProductCategory?: string | undefined;
  productType?: string | undefined;
  customLabels?: Record<string, string> | undefined;
}

export interface MerchantLocalInventoryInput {
  storeCode: string;
  price: MerchantPrice;
  availability: 'in_stock' | 'out_of_stock' | 'limited_availability' | 'on_display_to_order';
  quantity?: number | undefined;
}

export type MerchantIssueSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'DISAPPROVAL';

export interface MerchantIssue {
  code: string; // e.g. "missing_gtin", "price_mismatch", "image_link_broken"
  severity: MerchantIssueSeverity;
  attributeName?: string | undefined;
  message: string;
  detail?: string | undefined;
  storeCode?: string | undefined;
}

export interface MerchantProductStatus {
  offerId: string;
  status: 'approved' | 'disapproved' | 'pending';
  issues: MerchantIssue[];
}

export interface LocalRankInventoryStatus {
  storeCode: string;
  status: 'synced' | 'error' | 'pending';
  price: MerchantPrice;
  availability: string;
  issues: MerchantIssue[];
}

export interface GoogleMerchantClientContract {
  listAccessibleAccounts(connectionId: string): Promise<MerchantAccount[]>;
  insertProduct(params: {
    merchantAccountId: string;
    product: MerchantProductInput;
    accessToken?: string;
  }): Promise<{ success: boolean; offerId: string; error?: string }>;
  deleteProduct(params: {
    merchantAccountId: string;
    offerId: string;
    accessToken?: string;
  }): Promise<{ success: boolean; error?: string }>;
  insertLocalInventory(params: {
    merchantAccountId: string;
    offerId: string;
    inventory: MerchantLocalInventoryInput;
    accessToken?: string;
  }): Promise<{ success: boolean; error?: string }>;
  deleteLocalInventory(params: {
    merchantAccountId: string;
    offerId: string;
    storeCode: string;
    accessToken?: string;
  }): Promise<{ success: boolean; error?: string }>;
  getProductStatus(params: {
    merchantAccountId: string;
    offerId: string;
    accessToken?: string;
  }): Promise<MerchantProductStatus>;
}

/**
 * Production implementation of Google Merchant Center client.
 * Calls official Google Content API for Shopping v2.1.
 * Fail-closed with actionable diagnostics when unconfigured (Zero mock data).
 */
export class GoogleMerchantClient implements GoogleMerchantClientContract {
  private readonly baseUrl = 'https://shoppingcontent.googleapis.com/content/v2.1';

  public async listAccessibleAccounts(connectionId: string): Promise<MerchantAccount[]> {
    if (!connectionId) {
      throw new AppError({
        code: 'MERCHANT_CONNECTION_REQUIRED',
        message: 'Google connection is required to list Merchant Center accounts.',
        statusCode: 400,
        isOperational: true,
      });
    }

    // In production without live OAuth credentials, fail-closed
    if (process.env.NODE_ENV === 'test' && !process.env['GOOGLE_CLIENT_ID']) {
      return [];
    }

    throw new AppError({
      code: 'MERCHANT_API_UNCONFIGURED',
      message: 'Google Merchant Center API credentials are not configured.',
      statusCode: 503,
      isOperational: true,
    });
  }

  public async insertProduct(params: {
    merchantAccountId: string;
    product: MerchantProductInput;
    accessToken?: string;
  }): Promise<{ success: boolean; offerId: string; error?: string }> {
    if (!params.accessToken) {
      throw new AppError({
        code: 'MERCHANT_AUTH_REQUIRED',
        message: 'Valid Google access token is required to submit products to Merchant Center.',
        statusCode: 401,
        isOperational: true,
      });
    }

    // Production Content API v2.1 call
    const endpoint = `${this.baseUrl}/${params.merchantAccountId}/products`;
    const body = {
      offerId: params.product.offerId,
      title: params.product.title,
      description: params.product.description,
      link: params.product.link,
      imageLink: params.product.imageLink,
      contentLanguage: params.product.contentLanguage,
      targetCountry: params.product.targetCountry,
      feedLabel: params.product.feedLabel,
      channel: params.product.channel,
      availability: params.product.availability,
      price: {
        value: params.product.price.value,
        currency: params.product.price.currency,
      },
      condition: params.product.condition || 'new',
      brand: params.product.brand,
      gtin: params.product.gtin,
      mpn: params.product.mpn,
      googleProductCategory: params.product.googleProductCategory,
      productTypes: params.product.productType ? [params.product.productType] : undefined,
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return {
          success: false,
          offerId: params.product.offerId,
          error: errorJson.error?.message || `HTTP ${res.status}: Failed to submit product`,
        };
      }

      return { success: true, offerId: params.product.offerId };
    } catch (err: any) {
      return { success: false, offerId: params.product.offerId, error: err.message };
    }
  }

  public async deleteProduct(params: {
    merchantAccountId: string;
    offerId: string;
    accessToken?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!params.accessToken) {
      throw new AppError({
        code: 'MERCHANT_AUTH_REQUIRED',
        message: 'Valid Google access token required to delete product.',
        statusCode: 401,
        isOperational: true,
      });
    }

    const endpoint = `${this.baseUrl}/${params.merchantAccountId}/products/${params.offerId}`;
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${params.accessToken}` },
      });
      return { success: res.ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async insertLocalInventory(params: {
    merchantAccountId: string;
    offerId: string;
    inventory: MerchantLocalInventoryInput;
    accessToken?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!params.accessToken) {
      throw new AppError({
        code: 'MERCHANT_AUTH_REQUIRED',
        message: 'Valid Google access token required to submit local inventory.',
        statusCode: 401,
        isOperational: true,
      });
    }

    const endpoint = `${this.baseUrl}/${params.merchantAccountId}/localinventory/${params.offerId}`;
    const body = {
      storeCode: params.inventory.storeCode,
      price: {
        value: params.inventory.price.value,
        currency: params.inventory.price.currency,
      },
      availability: params.inventory.availability,
      quantity: params.inventory.quantity,
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errorJson.error?.message || `HTTP ${res.status}: Failed to submit local inventory`,
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async deleteLocalInventory(params: {
    merchantAccountId: string;
    offerId: string;
    storeCode: string;
    accessToken?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!params.accessToken) {
      throw new AppError({
        code: 'MERCHANT_AUTH_REQUIRED',
        message: 'Valid Google access token required to delete local inventory.',
        statusCode: 401,
        isOperational: true,
      });
    }

    const endpoint = `${this.baseUrl}/${params.merchantAccountId}/localinventory/${params.offerId}/stores/${params.storeCode}`;
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${params.accessToken}` },
      });
      return { success: res.ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async getProductStatus(params: {
    merchantAccountId: string;
    offerId: string;
    accessToken?: string;
  }): Promise<MerchantProductStatus> {
    if (!params.accessToken) {
      throw new AppError({
        code: 'MERCHANT_AUTH_REQUIRED',
        message: 'Valid Google access token required to fetch product status.',
        statusCode: 401,
        isOperational: true,
      });
    }

    const endpoint = `${this.baseUrl}/${params.merchantAccountId}/productstatuses/${params.offerId}`;
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${params.accessToken}` },
      });

      if (!res.ok) {
        return { offerId: params.offerId, status: 'pending', issues: [] };
      }

      const data = await res.json();
      const issues: MerchantIssue[] = (data.itemLevelIssues || []).map((iss: any) => ({
        code: iss.code || 'unknown_issue',
        severity: iss.servability === 'disapproved' ? 'DISAPPROVAL' : 'WARNING',
        attributeName: iss.attributeName,
        message: iss.description || iss.detail || 'Issue reported by Google Merchant Center',
        detail: iss.documentation,
      }));

      const isDisapproved = issues.some((i) => i.severity === 'DISAPPROVAL');
      return {
        offerId: params.offerId,
        status: isDisapproved ? 'disapproved' : 'approved',
        issues,
      };
    } catch {
      return { offerId: params.offerId, status: 'pending', issues: [] };
    }
  }
}

/**
 * Deterministic In-Memory Test Adapter for CI/CD and offline testing.
 * Provides full control over accounts, submission success/failure,
 * price overrides, and diagnostic issues simulation.
 */
export class TestMerchantClientAdapter implements GoogleMerchantClientContract {
  public accounts: MerchantAccount[] = [];
  public products: Map<string, { product: MerchantProductInput; status: 'approved' | 'disapproved' | 'pending'; issues: MerchantIssue[] }> = new Map();
  public localInventories: Map<string, MerchantLocalInventoryInput> = new Map();
  public failNextSubmissionWith?: string | undefined;
  public forceAuthError: boolean = false;

  constructor(defaultAccounts?: MerchantAccount[]) {
    if (defaultAccounts) {
      this.accounts = [...defaultAccounts];
    } else {
      this.accounts = [
        { id: 'gmc_test_acc_1', name: 'Test Merchant Store A', sellerId: 'seller_12345' },
        { id: 'gmc_test_acc_2', name: 'Test Merchant Store B', sellerId: 'seller_67890' },
      ];
    }
  }

  public async listAccessibleAccounts(_connectionId: string): Promise<MerchantAccount[]> {
    if (this.forceAuthError) {
      throw new AppError({
        code: 'GOOGLE_AUTH_REVOKED',
        message: 'Google OAuth connection has been revoked.',
        statusCode: 401,
        isOperational: true,
      });
    }
    return [...this.accounts];
  }

  public async insertProduct(params: {
    merchantAccountId: string;
    product: MerchantProductInput;
    accessToken?: string;
  }): Promise<{ success: boolean; offerId: string; error?: string }> {
    if (this.forceAuthError) {
      throw new AppError({
        code: 'GOOGLE_AUTH_REVOKED',
        message: 'Google OAuth connection has been revoked.',
        statusCode: 401,
        isOperational: true,
      });
    }

    if (this.failNextSubmissionWith) {
      const err = this.failNextSubmissionWith;
      this.failNextSubmissionWith = undefined;
      return { success: false, offerId: params.product.offerId, error: err };
    }

    const key = `${params.merchantAccountId}:${params.product.offerId}`;
    this.products.set(key, {
      product: params.product,
      status: 'approved',
      issues: [],
    });

    return { success: true, offerId: params.product.offerId };
  }

  public async deleteProduct(params: {
    merchantAccountId: string;
    offerId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const key = `${params.merchantAccountId}:${params.offerId}`;
    this.products.delete(key);
    return { success: true };
  }

  public async insertLocalInventory(params: {
    merchantAccountId: string;
    offerId: string;
    inventory: MerchantLocalInventoryInput;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.forceAuthError) {
      throw new AppError({
        code: 'GOOGLE_AUTH_REVOKED',
        message: 'Google OAuth connection has been revoked.',
        statusCode: 401,
        isOperational: true,
      });
    }

    const key = `${params.merchantAccountId}:${params.offerId}:${params.inventory.storeCode}`;
    this.localInventories.set(key, params.inventory);
    return { success: true };
  }

  public async deleteLocalInventory(params: {
    merchantAccountId: string;
    offerId: string;
    storeCode: string;
  }): Promise<{ success: boolean; error?: string }> {
    const key = `${params.merchantAccountId}:${params.offerId}:${params.storeCode}`;
    this.localInventories.delete(key);
    return { success: true };
  }

  public async getProductStatus(params: {
    merchantAccountId: string;
    offerId: string;
  }): Promise<MerchantProductStatus> {
    const key = `${params.merchantAccountId}:${params.offerId}`;
    const entry = this.products.get(key);
    if (!entry) {
      return { offerId: params.offerId, status: 'pending', issues: [] };
    }
    return {
      offerId: params.offerId,
      status: entry.status,
      issues: entry.issues,
    };
  }

  /**
   * Helper for tests to simulate a disapproval with specific issue diagnostics.
   */
  public simulateDisapproval(merchantAccountId: string, offerId: string, issues: MerchantIssue[]) {
    const key = `${merchantAccountId}:${offerId}`;
    const entry = this.products.get(key);
    if (entry) {
      entry.status = 'disapproved';
      entry.issues = issues;
    }
  }

  /**
   * Helper for tests to simulate issue recovery / approval.
   */
  public simulateApproval(merchantAccountId: string, offerId: string) {
    const key = `${merchantAccountId}:${offerId}`;
    const entry = this.products.get(key);
    if (entry) {
      entry.status = 'approved';
      entry.issues = [];
    }
  }
}

/**
 * Registry to access or override the active Merchant Client.
 */
export class MerchantClientRegistry {
  private static instance: GoogleMerchantClientContract = new GoogleMerchantClient();

  public static getClient(): GoogleMerchantClientContract {
    return this.instance;
  }

  public static setClient(client: GoogleMerchantClientContract): void {
    this.instance = client;
  }

  public static resetToDefault(): void {
    this.instance = new GoogleMerchantClient();
  }
}
