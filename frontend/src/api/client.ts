import type { ApiErrorPayload } from "../types/auth";

export const SESSION_TOKEN_KEY = "token";

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type SessionExpiredListener = (message: string) => void;
const sessionExpiredListeners: Set<SessionExpiredListener> = new Set();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function notifySessionExpired(
  message = "Your session has expired, please log in again."
): void {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  for (const listener of sessionExpiredListeners) {
    try {
      listener(message);
    } catch {
      // Ignore listener error
    }
  }
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch {
    // Network failure
    throw new ApiClientError(0, "NETWORK_ERROR", "Something went wrong, please try again.");
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    let errorCode = "HTTP_ERROR";
    let errorMessage = "Something went wrong, please try again.";
    let errorDetails: Record<string, string[]> | undefined;

    try {
      const data = (await response.json()) as ApiErrorPayload;
      if (data && data.error) {
        errorCode = data.error.code || errorCode;
        errorMessage = data.error.message || errorMessage;
        errorDetails = data.error.details;
      }
    } catch {
      // Body not JSON
      if (response.status === 401) {
        errorMessage = "Your session has expired, please log in again.";
      } else if (response.status === 403) {
        errorMessage = "You are not allowed to do this.";
      } else if (response.status === 404) {
        errorMessage = "This record was not found.";
      }
    }

    if (response.status === 401 && !endpoint.includes("/api/auth/login")) {
      notifySessionExpired();
    }

    throw new ApiClientError(response.status, errorCode, errorMessage, errorDetails);
  }

  return (await response.json()) as T;
}
