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
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  LAST_OWNER_PROTECTION: 'LAST_OWNER_PROTECTION',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  GA4_AUTH_REQUIRED: 'GA4_AUTH_REQUIRED',
  GA4_PERMISSION_REQUIRED: 'GA4_PERMISSION_REQUIRED',
  GA4_PROPERTY_ACCESS_DENIED: 'GA4_PROPERTY_ACCESS_DENIED',
  GA4_PROPERTY_NOT_FOUND: 'GA4_PROPERTY_NOT_FOUND',
  GA4_RATE_LIMITED: 'GA4_RATE_LIMITED',
  GA4_PROVIDER_ERROR: 'GA4_PROVIDER_ERROR',
  GA4_NOT_CONFIGURED: 'GA4_NOT_CONFIGURED',
  GA4_REPORT_FAILED: 'GA4_REPORT_FAILED',
  GOOGLE_AUTH_REQUIRED: 'GOOGLE_AUTH_REQUIRED',
  GBP_PERMISSION_REQUIRED: 'GBP_PERMISSION_REQUIRED',
  GBP_API_QUOTA_REQUIRED: 'GBP_API_QUOTA_REQUIRED',
  GBP_LOCATION_NOT_FOUND: 'GBP_LOCATION_NOT_FOUND',
  GBP_CONNECTION_REVOKED: 'GBP_CONNECTION_REVOKED',
  GBP_NOT_CONFIGURED: 'GBP_NOT_CONFIGURED',
  STORE_CODE_REQUIRED: 'STORE_CODE_REQUIRED',
  MERCHANT_NOT_CONFIGURED: 'MERCHANT_NOT_CONFIGURED',
  MERCHANT_CONNECTION_REQUIRED: 'MERCHANT_CONNECTION_REQUIRED',
  MERCHANT_API_UNCONFIGURED: 'MERCHANT_API_UNCONFIGURED',
  MERCHANT_AUTH_REQUIRED: 'MERCHANT_AUTH_REQUIRED',
  MERCHANT_MAPPING_NOT_FOUND: 'MERCHANT_MAPPING_NOT_FOUND',
  SKU_REQUIRED: 'SKU_REQUIRED',
  VIRTUAL_NUMBER_NOT_FOUND: 'VIRTUAL_NUMBER_NOT_FOUND',
  VIRTUAL_NUMBER_ALREADY_ASSIGNED: 'VIRTUAL_NUMBER_ALREADY_ASSIGNED',
  FORWARDING_UPDATE_FAILED: 'FORWARDING_UPDATE_FAILED',
  CALL_NOT_FOUND: 'CALL_NOT_FOUND',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  TELEPHONY_PROVIDER_ERROR: 'TELEPHONY_PROVIDER_ERROR',
  CALL_RECORDING_ACCESS_DENIED: 'CALL_RECORDING_ACCESS_DENIED',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  OPPORTUNITY_NOT_FOUND: 'OPPORTUNITY_NOT_FOUND',
  OPPORTUNITY_ALREADY_RESOLVED: 'OPPORTUNITY_ALREADY_RESOLVED',
  INVALID_OPPORTUNITY_STATUS: 'INVALID_OPPORTUNITY_STATUS',
  DISMISSAL_REASON_REQUIRED: 'DISMISSAL_REASON_REQUIRED',
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
        message: this.message, // Expose exact error message
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

export function createRateLimitedError(message = 'Too many requests, please try again later.', retryAfterSeconds?: number, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.RATE_LIMITED,
    message,
    statusCode: 429,
    requestId,
    details: retryAfterSeconds ? { retryAfterSeconds } : undefined,
  });
}

export function createConflictError(message: string, details?: Record<string, unknown>, requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.CONFLICT,
    message,
    statusCode: 409,
    requestId,
    details,
  });
}

export function createAccountSuspendedError(requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.ACCOUNT_SUSPENDED,
    message: 'This account or membership has been suspended.',
    statusCode: 403,
    requestId,
  });
}

export function createInvalidCredentialsError(requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.INVALID_CREDENTIALS,
    message: 'Invalid email or password.',
    statusCode: 401,
    requestId,
  });
}

export function createInvalidTokenError(message = 'Invalid, expired, or previously used token.', requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.INVALID_TOKEN,
    message,
    statusCode: 400,
    requestId,
  });
}

export function createLastOwnerProtectionError(message = 'Cannot remove, demote, or suspend the last active owner of this organization.', requestId?: string): AppError {
  return new AppError({
    code: ErrorCode.LAST_OWNER_PROTECTION,
    message,
    statusCode: 409,
    requestId,
  });
}

export function createGoogleRateLimitedError(
  message = 'Google is temporarily limiting requests. Please wait a moment and try again.',
  requestId?: string
): AppError {
  return new AppError({
    code: ErrorCode.GOOGLE_RATE_LIMITED,
    message,
    statusCode: 429,
    requestId,
  });
}

export function createGa4Error(
  code: ErrorCodeType,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>,
  requestId?: string
): AppError {
  return new AppError({
    code,
    message,
    statusCode,
    details,
    requestId,
  });
}

export function createOpportunityNotFoundError(
  opportunityId: string,
  requestId?: string
): AppError {
  return new AppError({
    code: ErrorCode.OPPORTUNITY_NOT_FOUND,
    message: `Opportunity '${opportunityId}' not found.`,
    statusCode: 404,
    requestId,
  });
}

export function createOpportunityWorkflowError(
  message: string,
  code: ErrorCodeType = ErrorCode.INVALID_OPPORTUNITY_STATUS,
  statusCode = 400,
  requestId?: string
): AppError {
  return new AppError({
    code,
    message,
    statusCode,
    requestId,
  });
}

import { logger } from '../observability/logger';

export function handleRouteError(
  error: unknown,
  fallbackMessage = 'An unexpected internal server error occurred.',
  context?: Record<string, unknown>
): Response {
  const isAppError = error instanceof AppError || (error && typeof error === 'object' && 'name' in error && error.name === 'AppError');

  if (isAppError) {
    const appErr = error as any;
    const statusCode = appErr.statusCode || 500;
    const isOperational = appErr.isOperational ?? true;
    
    if (statusCode >= 500) {
      logger.error({ err: appErr, code: appErr.code, ...context }, appErr.message);
    } else {
      logger.warn({ err: appErr, code: appErr.code, ...context }, appErr.message);
    }
    
    return Response.json({
      error: {
        code: appErr.code || ErrorCode.INTERNAL_SERVER_ERROR,
        message: appErr.message, // Expose exact error message
        requestId: appErr.requestId,
        details: isOperational ? appErr.details : undefined,
      }
    }, { status: statusCode });
  }

  const actualError = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(
    {
      err: error,
      actualError,
      stack,
      ...context,
    },
    fallbackMessage
  );

  // Detect Google / upstream rate limiting (429) and give a friendly message
  const isRateLimit =
    (error instanceof Error &&
      /too many requests|rate.?limit/i.test(error.message));

  if (isRateLimit) {
    logger.warn({ err: error, ...context }, 'Google API rate limit hit');
    return Response.json(
      {
        error: {
          code: ErrorCode.GOOGLE_RATE_LIMITED,
          message:
            'Google is temporarily limiting requests. Please wait a moment and try again.',
        },
      },
      { status: 429 }
    );
  }

  return Response.json(
    {
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: actualError, // Expose exact error message globally
      },
    },
    { status: 500 }
  );
}


