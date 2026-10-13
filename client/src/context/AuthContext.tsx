import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
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
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setUser((await api<{ user: User }>('/auth/me')).user); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) setError((error as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const expired = () => setUser(null); window.addEventListener('session-expired', expired); return () => window.removeEventListener('session-expired', expired); }, [refresh]);
  const authenticate: Auth['authenticate'] = async (mode, input) => {
    const result = await api<{ user: User }>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(input) });
    setUser(result.user);
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST', body: '{}' }); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, error, refresh, authenticate, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is missing'); return value; }
