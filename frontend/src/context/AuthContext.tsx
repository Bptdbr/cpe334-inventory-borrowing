import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, AuthSuccessResponse } from "../types/auth";
import {
  apiClient,
  getStoredToken,
  setStoredToken,
  onSessionExpired,
} from "../api/client";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearSessionExpiredMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  // Initialize: verify token and load current user profile
  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await apiClient<User>("/api/auth/me");
        if (isMounted) {
          setUser(currentUser);
          setTokenState(storedToken);
        }
      } catch {
        // Token invalid or expired
        if (isMounted) {
          setStoredToken(null);
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCurrentUser();

    // Listen to session expiry events triggered by 401s on any API calls
    const unsubscribe = onSessionExpired((msg) => {
      if (isMounted) {
        setUser(null);
        setTokenState(null);
        setSessionExpiredMessage(msg);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    setSessionExpiredMessage(null);
    const data = await apiClient<AuthSuccessResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setStoredToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (token) {
        await apiClient<void>("/api/auth/logout", {
          method: "POST",
        });
      }
    } catch {
      // Ignore network / token error on logout
    } finally {
      setStoredToken(null);
      setTokenState(null);
      setUser(null);
    }
  }, [token]);

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sessionExpiredMessage,
        login,
        logout,
        clearSessionExpiredMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
