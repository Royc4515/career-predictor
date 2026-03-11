import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p>Checking authentication...</p>;
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h1>AI Career Predictor</h1>
        <p>Discover your true career destiny.</p>
        <a
          href="/auth/google"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#4285F4',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '1rem',
          }}
        >
          Login with Google
        </a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1>Welcome, {user.name}!</h1>
      <img
        src={user.avatar_url}
        alt="avatar"
        style={{ borderRadius: '50%', width: '80px', height: '80px' }}
      />
      <p>{user.email}</p>
      <a href="/auth/logout">Logout</a>
    </div>
  );
}

export default App;
