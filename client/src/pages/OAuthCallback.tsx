import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing OAuth...');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state'); // This should contain the userId

    console.log('📧 OAuth callback URL params:', { code: !!code, error, state });
    console.log('📧 Full URL:', window.location.href);

    if (error) {
      console.error('OAuth error:', error);
      setStatus('error');
      setMessage(`Authentication failed: ${error}`);

      // Notify parent window if this is a popup
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth_error', error }, '*');
        window.close();
        return;
      }

      setTimeout(() => {
        setLocation(user ? '/chat' : '/login');
      }, 3000);
      return;
    }

    if (code && state) {
      console.log('🔄 Processing OAuth callback with code and state');
      
      const processCallback = async () => {
        try {
          const baseURL = 'https://email-agent-1-4duk.onrender.com';
          const requestBody = {
            code,
            userId: state, // Use the state parameter which contains the userId
          };
          
          console.log('📤 Making OAuth callback request to:', baseURL + '/api/auth/gmail/callback');
          console.log('📤 Request body:', { code: !!code, userId: state });
          
          const response = await fetch(baseURL + '/api/auth/gmail/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          
          console.log('📥 Response status:', response.status);
          console.log('📥 Response ok:', response.ok);

          if (response.ok) {
            const data = await response.json();
            console.log('📧 OAuth callback received data:', data);

            setStatus('success');
            setMessage(`Successfully connected ${data.account?.email || 'Gmail account'}!`);

            // Notify parent window if this is a popup
            if (window.opener) {
              console.log('📤 Sending OAuth success message with email:', data.account?.email);
              window.opener.postMessage({
                type: 'oauth_success',
                data: { email: data.account?.email, success: true, account: data.account }
              }, '*');

              // Close popup after a short delay to show success message
              setTimeout(() => {
                window.close();
              }, 1500);
              return;
            }

            // If not a popup, redirect normally
            setTimeout(() => {
              setLocation('/chat');
            }, 2000);
          } else {
            const errorData = await response.text();
            throw new Error(`Failed to process OAuth callback: ${response.status} ${errorData}`);
          }
        } catch (error) {
          console.error('Callback processing error:', error);
          setStatus('error');
          setMessage(`Authentication failed: ${error.message}`);
          
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_error', error: error.message }, '*');
            setTimeout(() => {
              window.close();
            }, 3000);
            return;
          }
        }
      };

      processCallback();
      return;
    }

    // If no success or error params, redirect based on auth state
    const fallbackTimer = setTimeout(() => {
      if (!loading) {
        setLocation(user ? '/chat' : '/login');
      }
    }, 1000);

    return () => clearTimeout(fallbackTimer);
  }, [setLocation, user, loading]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold mb-2">Connecting Account</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-green-600">Success!</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to chat...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-600">Error</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to chat...</p>
          </>
        )}
      </div>
    </div>
  );
}
