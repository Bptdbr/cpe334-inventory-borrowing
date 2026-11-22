export type UserRole = "BORROWER" | "CUSTODIAN";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface AuthSuccessResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
