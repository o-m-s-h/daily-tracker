import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '../services/api';

interface User { id: string; email: string; name: string; timeZone: string }
interface Auth {
  user: User | null; loading: boolean; error: string;
  refresh: () => Promise<void>;
  authenticate: (mode: 'login' | 'register', input: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeCheck = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    activeCheck.current?.abort();
    const controller = new AbortController();
    activeCheck.current = controller;
    setLoading(true); setError('');
    try {
      const result = await api<{ user: User }>('/auth/me', { signal: controller.signal });
      if (!controller.signal.aborted) setUser(result.user);
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof ApiError && error.status === 401) setUser(null);
        else setError((error as Error).message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => { activeCheck.current?.abort(); window.removeEventListener('session-expired', expired); };
  }, [refresh]);
  const authenticate: Auth['authenticate'] = async (mode, input) => {
    // The form is usable during the background session check. Cancel that check
    // so a late response cannot overwrite a successful sign-in.
    activeCheck.current?.abort();
    setLoading(false); setError('');
    const result = await api<{ user: User }>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(input) });
    setUser(result.user);
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST', body: '{}' }); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, error, refresh, authenticate, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is missing'); return value; }
