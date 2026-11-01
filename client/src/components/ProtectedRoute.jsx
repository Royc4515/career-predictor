import { Navigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  // RootLayout already shows the splash while auth resolves; render nothing
  // here so the two never stack.
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
