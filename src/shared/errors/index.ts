export const ErrorCode = {
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',
  BRAND_ACCESS_DENIED: 'BRAND_ACCESS_DENIED',
  LOCATION_ACCESS_DENIED: 'LOCATION_ACCESS_DENIED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  GOOGLE_AUTH_REVOKED: 'GOOGLE_AUTH_REVOKED',
  GOOGLE_RATE_LIMITED: 'GOOGLE_RATE_LIMITED',
  SYNC_ALREADY_RUNNING: 'SYNC_ALREADY_RUNNING',
  SYNC_PARTIALLY_COMPLETED: 'SYNC_PARTIALLY_COMPLETED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  POLICY_GATE_LOCKED: 'POLICY_GATE_LOCKED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export interface AppErrorOptions {
  code: ErrorCodeType;
  message: string;
  statusCode: number;
  cause?: unknown;
  requestId?: string | undefined;
  details?: Record<string, unknown> | undefined;
  isOperational?: boolean | undefined;
}

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly requestId?: string | undefined;
  public readonly details?: Record<string, unknown> | undefined;
  public readonly isOperational: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.requestId = options.requestId;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    // Preserve clean stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Sanitizes the error for public client response (never leaks internal causes or stack traces).
   */
  public toClientResponse(): {
    error: {
      code: ErrorCodeType;
      message: string;
      requestId?: string;
      details?: Record<string, unknown>;
    };
  } {
    return {
      error: {
        code: this.code,
        message: this.isOperational ? this.message : 'An unexpected internal error occurred.',
        ...(this.requestId ? { requestId: this.requestId } : {}),
        ...(this.details && this.isOperational ? { details: this.details } : {}),
      },
    };
  }
}

// Concrete Factory Helpers for Standard Scenarios
export function createAuthenticationRequiredError(requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.AUTHENTICATION_REQUIRED,
    message: 'Authentication is required to access this resource.',
    statusCode: 401,
    requestId,
  });
}

export function createTenantAccessDeniedError(tenantId: string, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.TENANT_ACCESS_DENIED,
    message: 'Access to the specified tenant is denied.',
    statusCode: 403,
    requestId,
    details: { tenantId },
  });
}

export function createBrandAccessDeniedError(brandId: string, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.BRAND_ACCESS_DENIED,
    message: 'Access to the specified brand is denied.',
    statusCode: 403,
    requestId,
    details: { brandId },
  });
}

export function createLocationAccessDeniedError(locationId: string, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.LOCATION_ACCESS_DENIED,
    message: 'Access to the specified location is denied.',
    statusCode: 403,
    requestId,
    details: { locationId },
  });
}

export function createValidationError(message: string, details?: Record<string, unknown>, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.VALIDATION_FAILED,
    message,
    statusCode: 400,
    requestId,
    details,
  });
}

export function createResourceNotFoundError(resourceType: string, resourceId: string, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.RESOURCE_NOT_FOUND,
    message: `${resourceType} not found.`,
    statusCode: 404,
    requestId,
    details: { resourceType, resourceId },
  });
}

export function createPolicyGateLockedError(message: string, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.POLICY_GATE_LOCKED,
    message,
    statusCode: 403,
    requestId,
  });
}
