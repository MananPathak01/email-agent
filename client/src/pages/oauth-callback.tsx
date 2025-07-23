import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

export default function OAuthCallback() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth_error', error }, '*');
        }
        window.close();
        return;
      }

      if (code && user) {
        try {
          const response = await fetch('/api/auth/gmail/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              userId: user.uid,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_success', data }, '*');
            }
            window.close();
          } else {
            throw new Error('Failed to process OAuth callback');
          }
        } catch (error) {
          console.error('Callback processing error:', error);
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_error', error: error.message }, '*');
          }
          window.close();
        }
      } else {
        console.error('Missing code or user');
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth_error', error: 'Missing code or user' }, '*');
        }
        window.close();
      }
    };

    handleCallback();
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing Gmail connection...</p>
      </div>
    </div>
  );
}
