import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Tracker } from './pages/Tracker';

export function App() {
  const { user } = useAuth();
  return user ? <Tracker key={user.id} /> : <Login />;
}
