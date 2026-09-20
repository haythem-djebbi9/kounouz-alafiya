import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import i18n from '../i18n';
import { isSupportedLanguage, persistLanguage, type SupportedLanguage } from '../i18n';
import { api, ApiError } from './api';
import { tokenStorage } from './tokenStorage';
import { queryClient } from './query-client';
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

export interface UpdateProfileInput {
  name?: string;
  language?: SupportedLanguage;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Si la 2FA est activée, la connexion s'arrête après le mot de passe et
// renvoie un jeton intermédiaire à échanger contre le code TOTP.
export type LoginResult = { user: AuthUser; twoFactorToken?: undefined } | { user?: undefined; twoFactorToken: string };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorLogin: (twoFactorToken: string, code: string) => Promise<AuthUser>;
  registerProducer: (input: RegisterProducerInput) => Promise<AuthUser>;
  registerConsumer: (input: RegisterConsumerInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
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

  // Synchronise la langue de l'interface avec le compte connecté ; à la
  // déconnexion, revient à la préférence stockée localement (visiteur).
  useEffect(() => {
    const target =
      user && isSupportedLanguage(user.language)
        ? user.language
        : (window.localStorage.getItem('kz_lang') as SupportedLanguage | null) ?? 'ar';
    if (i18n.language !== target) {
      void i18n.changeLanguage(target);
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const res = await api.post<AuthResponse | { twoFactorRequired: true; twoFactorToken: string }>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    );
    if ('twoFactorRequired' in res) {
      return { twoFactorToken: res.twoFactorToken };
    }
    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return { user: res.user };
  }, []);

  const completeTwoFactorLogin = useCallback(async (twoFactorToken: string, code: string) => {
    const res = await api.post<AuthResponse>('/auth/2fa/login', { twoFactorToken, code }, { skipAuth: true });
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

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const updated = await api.patch<AuthUser>('/auth/me', input);
    setUser(updated);
    if (input.language) {
      persistLanguage(input.language);
    }
    return updated;
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    await api.patch('/auth/change-password', input);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort : on déconnecte localement même si l'appel échoue
    }
    tokenStorage.clear();
    // Les données en cache appartiennent au compte qui se déconnecte : le
    // compte suivant, sur le même navigateur, ne doit jamais les apercevoir.
    queryClient.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        completeTwoFactorLogin,
        registerProducer,
        registerConsumer,
        logout,
        refreshMe: loadMe,
        updateProfile,
        changePassword,
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
