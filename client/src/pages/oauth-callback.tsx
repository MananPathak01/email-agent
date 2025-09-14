import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

export default function OAuthCallback() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  console.log('🔄 OAuthCallback component rendered');

  useEffect(() => {
    console.log('🔄 useEffect triggered, user:', !!user);
    
    const handleCallback = async () => {
      console.log('🔄 handleCallback function started');
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state'); // This should contain the userId

      console.log('📧 OAuth callback URL params:', { code: !!code, error, state, user: !!user });

      if (error) {
        console.error('OAuth error:', error);
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth_error', error }, '*');
        }
        window.close();
        return;
      }

      if (code && state) {
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

            if (window.opener) {
              // Extract email from the account data and format it properly
              const email = data.account?.email;
              console.log('📤 Sending OAuth success message with email:', email);

              window.opener.postMessage({
                type: 'oauth_success',
                data: { email, success: true, account: data.account }
              }, '*');
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
        console.error('Missing code or state parameter');
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth_error', error: 'Missing code or state parameter' }, '*');
        }
        window.close();
      }
    };

    handleCallback();
  }, []); // Remove user dependency since we're using state parameter

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing Gmail connection...</p>
      </div>
    </div>
  );
}
