import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, ApiError } from './api';
import { tokenStorage } from './tokenStorage';
import type { AuthResponse, AuthUser } from './api-types';

export interface RegisterProducerInput {
  name: string;
  email: string;
  password: string;
  farmName: string;
  location: string;
}

export interface RegisterConsumerInput {
  name: string;
  email: string;
  password: string;
  country?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  registerProducer: (input: RegisterProducerInput) => Promise<AuthUser>;
  registerConsumer: (input: RegisterConsumerInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Garde contre la course entre le chargement initial (jeton potentiellement
  // périmé d'une session précédente) et une connexion fraîche : on n'applique
  // la réponse que si le jeton utilisé pour la requête est toujours celui en
  // cours au moment où elle se termine.
  const loadMe = useCallback(async () => {
    const tokenAtStart = tokenStorage.getAccessToken();
    if (!tokenAtStart) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await api.get<AuthUser>('/auth/me');
      if (tokenStorage.getAccessToken() === tokenAtStart) {
        setUser(me);
      }
    } catch (err) {
      if (tokenStorage.getAccessToken() === tokenAtStart) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          tokenStorage.clear();
        }
        setUser(null);
      }
    } finally {
      if (tokenStorage.getAccessToken() === tokenAtStart) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password }, { skipAuth: true });
    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const registerProducer = useCallback(async (input: RegisterProducerInput) => {
    const res = await api.post<AuthResponse>(
      '/auth/register',
      { ...input, role: 'PRODUCER' },
      { skipAuth: true },
    );
    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const registerConsumer = useCallback(async (input: RegisterConsumerInput) => {
    const res = await api.post<AuthResponse>(
      '/auth/register',
      { ...input, role: 'CONSUMER' },
      { skipAuth: true },
    );
    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort : on déconnecte localement même si l'appel échoue
    }
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        registerProducer,
        registerConsumer,
        logout,
        refreshMe: loadMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  }
  return ctx;
}
