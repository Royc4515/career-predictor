import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('ready');
      })
      .catch(() => {
        // Server unreachable is not the same as signed out, but the public
        // pages still work, so render them and let sign-in retry naturally.
        if (cancelled) return;
        setUser(null);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ user, loading: status === 'loading', status }), [user, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
