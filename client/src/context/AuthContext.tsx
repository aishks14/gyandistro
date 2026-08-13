import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { api, setAccessToken, roleRank } from '../lib/api';
import type { User, UserRole } from '../types';

interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (minimum: UserRole) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On a page load there is no access token in memory, but the refresh
  // cookie may still be valid — so try once and restore the session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{ user: User; accessToken: string }>('/auth/refresh');
        if (!cancelled && res.data) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.user);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User; accessToken: string }>('/auth/login', {
      email,
      password
    });
    setAccessToken(res.data!.accessToken);
    setUser(res.data!.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<{ user: User; accessToken: string }>('/auth/register', {
      name,
      email,
      password
    });
    setAccessToken(res.data!.accessToken);
    setUser(res.data!.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get<User>('/auth/me');
    if (res.data) setUser(res.data);
  }, []);

  const can = useCallback(
    (minimum: UserRole) => Boolean(user) && roleRank(user!.role) >= roleRank(minimum),
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refreshUser, can }),
    [user, loading, signIn, signUp, signOut, refreshUser, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
