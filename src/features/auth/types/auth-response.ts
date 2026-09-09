export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  fullName: string;
  status: string;
}

export interface LoginSuccessResponse {
  success: true;
  user: AuthenticatedUserDto;
}

export interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export type LoginResult =
  | { success: true; user: AuthenticatedUserDto }
  | { success: false; errorMessage: string; errorCode?: string };
