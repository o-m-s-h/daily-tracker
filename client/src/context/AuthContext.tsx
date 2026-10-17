import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';

interface User { id: string; email: string; name: string; timeZone: string }
interface Auth {
  user: User | null;
  authenticate: (mode: 'login' | 'register', input: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start at the login screen on every page load, even with a saved cookie.
  // Authentication is entered only after an explicit login or signup succeeds.
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  const authenticate: Auth['authenticate'] = async (mode, input) => {
    const result = await api<{ user: User }>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(input) });
    setUser(result.user);
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST', body: '{}' }); setUser(null); };
  return <AuthContext.Provider value={{ user, authenticate, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is missing'); return value; }
