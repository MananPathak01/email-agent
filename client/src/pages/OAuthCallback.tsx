import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state'); // This should be userId
    const error = urlParams.get('error');

    if (error) {
      setLocation('/dashboard');
      return;
    }

    if (code && state) {
      console.log('OAuth callback state:', state, 'code:', code);
      fetch(`${API_BASE_URL}/api/gmail/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId: state }),
      })
        .then(res => res.json())
        .then(() => {
          setLocation('/dashboard');
        })
        .catch(() => setLocation('/dashboard'));
    } else {
      setLocation('/dashboard');
    }
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing OAuth...</h1>
        <p>Please wait while we connect your account.</p>
      </div>
    </div>
  );
}
