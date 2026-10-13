import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Tracker } from './pages/Tracker';

export function App() {
  const { user, loading, error, refresh } = useAuth();
  if (loading) return <div className="screen-center" role="status"><div className="brand-mark">✓</div><p>Opening your space…</p></div>;
  if (error) return <div className="screen-center"><h1>We couldn’t connect</h1><p role="alert">{error}</p><button className="button primary" onClick={() => void refresh()}>Try again</button></div>;
  return user ? <Tracker key={user.id} /> : <Login />;
}
