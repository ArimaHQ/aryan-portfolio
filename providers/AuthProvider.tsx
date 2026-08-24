'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthState, AuthStep, User } from '@/types';
import {
  authApi,
  AuthApiError,
  clearAuthSession,
  type RegistrationResult,
} from '@/lib/auth-api';

type AuthContextValue = AuthState & {
  login: (email: string, password: string, rememberMe: boolean, otp?: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<RegistrationResult | null>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  verifyEmail: (token: string, purpose?: 'verification' | 'email_change') => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<boolean>;
  resetStep: () => void;
};

const INITIAL_AUTH_STATE: AuthState = {
  isInitialized: false,
  isAuthenticated: false,
  user: null,
  step: 'initializing',
  error: null,
  errorCode: undefined,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof AuthApiError ? error.message : fallback
);

const splitName = (name: string) => {
  const [firstName = '', ...lastName] = name.trim().split(/\s+/);
  return { firstName, lastName: lastName.join(' ') };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [refreshAt, setRefreshAt] = useState<number | null>(null);
  const sessionEpoch = useRef(0);

  const invalidateSessionOperations = useCallback(() => {
    sessionEpoch.current += 1;
    return sessionEpoch.current;
  }, []);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    const lifetimeMs = Math.max(1_000, expiresIn * 1_000);
    setRefreshAt(Date.now() + Math.max(1_000, lifetimeMs - 60_000));
  }, []);

  const clearSession = useCallback(() => {
    invalidateSessionOperations();
    clearAuthSession();
    setRefreshAt(null);
  }, [invalidateSessionOperations]);

  const refreshActiveSession = useCallback(async () => {
    const operationEpoch = sessionEpoch.current;
    try {
      const session = await authApi.refresh();
      const user = session.user ?? await authApi.me();
      if (operationEpoch !== sessionEpoch.current) return;
      if (!user.emailVerified) {
        clearSession();
        setState({
          isInitialized: true,
          isAuthenticated: false,
          user: null,
          step: 'idle',
          error: 'Please verify your email before signing in.',
        });
        return;
      }
      scheduleRefresh(session.expiresIn);
      setState((previous) => ({
        ...previous,
        isInitialized: true,
        isAuthenticated: true,
        user,
        step: 'idle',
        error: null,
      }));
    } catch {
      if (operationEpoch !== sessionEpoch.current) return;
      clearSession();
      setState({
        ...INITIAL_AUTH_STATE,
        isInitialized: true,
        step: 'idle',
      });
    }
  }, [clearSession, scheduleRefresh]);

  const setStep = useCallback((step: AuthStep) => {
    setState((previous) => ({
      ...previous,
      step,
      error: step === 'loading' ? null : previous.error,
    }));
  }, []);

  const setError = useCallback((error: string, errorCode?: string) => {
    setState((previous) => ({
      ...previous,
      isInitialized: true,
      step: 'error',
      error,
      errorCode,
    }));
  }, []);

  useEffect(() => {
    let active = true;
    const operationEpoch = invalidateSessionOperations();

    const bootstrap = async () => {
      try {
        const session = await authApi.refresh();
        const user = session.user ?? await authApi.me();
        if (!active || operationEpoch !== sessionEpoch.current) return;
        setState({
          isInitialized: true,
          isAuthenticated: user.emailVerified,
          user: user.emailVerified ? user : null,
          step: 'idle',
          error: user.emailVerified ? null : 'Please verify your email before signing in.',
        });
        if (!user.emailVerified) {
          clearSession();
        } else {
          scheduleRefresh(session.expiresIn);
        }
      } catch {
        if (!active || operationEpoch !== sessionEpoch.current) return;
        clearSession();
        setState({
          ...INITIAL_AUTH_STATE,
          isInitialized: true,
          step: 'idle',
        });
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [clearSession, invalidateSessionOperations, scheduleRefresh]);

  useEffect(() => {
    if (!refreshAt || !state.isAuthenticated) return;
    const timer = window.setTimeout(() => {
      void refreshActiveSession();
    }, Math.max(0, refreshAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [refreshActiveSession, refreshAt, state.isAuthenticated]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean, otp?: string): Promise<User | null> => {
    const operationEpoch = invalidateSessionOperations();
    setStep('loading');
    try {
      const session = await authApi.login({ email, password, rememberMe, otp });
      const user = session.user ?? await authApi.me();
      if (operationEpoch !== sessionEpoch.current) return null;
      if (!user.emailVerified) {
        clearSession();
        setError('Please verify your email before signing in.');
        return null;
      }
      setState({
        isInitialized: true,
        isAuthenticated: true,
        user,
        step: 'success',
        error: null,
        errorCode: undefined,
      });
      scheduleRefresh(session.expiresIn);
      return user;
    } catch (error) {
      if (operationEpoch !== sessionEpoch.current) return null;
      clearSession();
      setError(
        errorMessage(error, 'Authentication failed. Please try again.'),
        error instanceof AuthApiError ? error.code : undefined,
      );
      return null;
    }
  }, [clearSession, invalidateSessionOperations, scheduleRefresh, setError, setStep]);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
  ): Promise<RegistrationResult | null> => {
    setStep('loading');
    try {
      const { firstName, lastName } = splitName(name);
      const result = await authApi.register({ email, password, firstName, lastName });
      setState({
        isInitialized: true,
        isAuthenticated: false,
        user: null,
        step: 'success',
        error: null,
      });
      return result;
    } catch (error) {
      setError(errorMessage(error, 'Registration failed. Please try again.'));
      return null;
    }
  }, [setError, setStep]);

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    setStep('loading');
    try {
      await authApi.forgotPassword(email);
      setState((previous) => ({ ...previous, step: 'success', error: null }));
      return true;
    } catch (error) {
      setError(errorMessage(error, 'Password reset request failed.'));
      return false;
    }
  }, [setError, setStep]);

  const resetPassword = useCallback(async (token: string, password: string): Promise<boolean> => {
    setStep('loading');
    try {
      await authApi.resetPassword(token, password);
      setState((previous) => ({ ...previous, step: 'success', error: null }));
      return true;
    } catch (error) {
      setError(errorMessage(error, 'Password reset failed. Please request a new reset link.'));
      return false;
    }
  }, [setError, setStep]);

  const verifyEmail = useCallback(async (
    token: string,
    purpose: 'verification' | 'email_change' = 'verification',
  ): Promise<boolean> => {
    setStep('loading');
    try {
      if (purpose === 'email_change') {
        await authApi.confirmEmailChange(token);
      } else {
        await authApi.verifyEmail(token);
      }
      clearSession();
      setState({
        isInitialized: true,
        isAuthenticated: false,
        user: null,
        step: 'success',
        error: null,
      });
      return true;
    } catch (error) {
      setError(errorMessage(error, 'Verification failed. The link may be invalid or expired.'));
      return false;
    }
  }, [clearSession, setError, setStep]);

  const resendVerificationEmail = useCallback(async (email: string): Promise<boolean> => {
    setStep('loading');
    try {
      await authApi.resendVerificationEmail(email);
      setState((previous) => ({ ...previous, step: 'success', error: null }));
      return true;
    } catch (error) {
      setError(errorMessage(error, 'Unable to resend the verification email.'));
      return false;
    }
  }, [setError, setStep]);

  const logout = useCallback(async () => {
    invalidateSessionOperations();
    try {
      await authApi.logout();
    } catch {
      // The local session is always cleared, even when the server session has expired.
    } finally {
      clearSession();
      setState({
        ...INITIAL_AUTH_STATE,
        isInitialized: true,
        step: 'idle',
      });
    }
  }, [clearSession, invalidateSessionOperations]);

  const resetStep = useCallback(() => {
    setState((previous) => ({ ...previous, step: 'idle', error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerificationEmail,
        resetStep,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
