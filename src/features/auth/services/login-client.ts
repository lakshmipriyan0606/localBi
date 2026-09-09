import { LoginInput } from '../schemas/login-schema';
import { LoginResult, LoginSuccessResponse, AuthErrorResponse } from '../types/auth-response';

const GENERIC_AUTH_ERROR = 'Email or password is incorrect.';
const RATE_LIMIT_ERROR = 'Too many login attempts. Please try again in a few minutes.';
const NETWORK_ERROR = 'Unable to connect to the authentication service. Please check your connection.';
const UNEXPECTED_ERROR = 'An unexpected error occurred. Please try again.';

function isAuthErrorResponse(data: unknown): data is AuthErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'object' &&
    (data as { error: unknown }).error !== null &&
    'code' in (data as { error: { code: unknown } }).error &&
    typeof (data as { error: { code: unknown } }).error.code === 'string'
  );
}

function isLoginSuccessResponse(data: unknown): data is LoginSuccessResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as { success: unknown }).success === true &&
    'user' in data &&
    typeof (data as { user: unknown }).user === 'object'
  );
}

/**
 * Client authentication service for credentials login.
 * Safely maps machine-readable status codes to user-safe, non-enumerating messages.
 */
export async function loginClient(credentials: LoginInput): Promise<LoginResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return {
        success: false,
        errorMessage: res.status >= 500 ? UNEXPECTED_ERROR : GENERIC_AUTH_ERROR,
      };
    }

    if (!res.ok) {
      if (res.status === 429) {
        return {
          success: false,
          errorMessage: RATE_LIMIT_ERROR,
          errorCode: 'RATE_LIMIT_EXCEEDED',
        };
      }

      if (res.status === 401 || res.status === 400) {
        return {
          success: false,
          errorMessage: GENERIC_AUTH_ERROR,
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      if (isAuthErrorResponse(data)) {
        if (data.error.code === 'RATE_LIMIT_EXCEEDED') {
          return { success: false, errorMessage: RATE_LIMIT_ERROR, errorCode: data.error.code };
        }
        if (data.error.code === 'INVALID_CREDENTIALS' || data.error.code === 'VALIDATION_FAILED') {
          return { success: false, errorMessage: GENERIC_AUTH_ERROR, errorCode: data.error.code };
        }
      }

      return {
        success: false,
        errorMessage: UNEXPECTED_ERROR,
      };
    }

    if (isLoginSuccessResponse(data)) {
      return {
        success: true,
        user: data.user,
      };
    }

    return {
      success: false,
      errorMessage: UNEXPECTED_ERROR,
    };
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return {
        success: false,
        errorMessage: NETWORK_ERROR,
      };
    }

    return {
      success: false,
      errorMessage: NETWORK_ERROR,
    };
  }
}
