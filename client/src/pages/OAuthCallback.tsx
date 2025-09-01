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
    const success = urlParams.get('success');
    const email = urlParams.get('email');
    const error = urlParams.get('error');
    
    console.log('📧 OAuth callback URL params:', { success, email, error });
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
        setLocation(user ? '/dashboard' : '/login');
      }, 3000);
      return;
    }

    if (success === 'true') {
      console.log('OAuth success! Email:', email);
      setStatus('success');
      setMessage(`Successfully connected ${email || 'Gmail account'}!`);
      
      // Notify parent window if this is a popup
      if (window.opener) {
        console.log('📤 Sending OAuth success message with email:', email);
        window.opener.postMessage({ 
          type: 'oauth_success', 
          data: { email, success: true } 
        }, '*');
        
        // Close popup after a short delay to show success message
        setTimeout(() => {
          window.close();
        }, 1500);
        return;
      }
      
      // If not a popup, redirect normally
      const redirectTimer = setTimeout(() => {
        if (!loading) {
          if (user) {
            setLocation('/dashboard');
          } else {
            setLocation('/login');
          }
        }
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }

    // If no success or error params, redirect based on auth state
    const fallbackTimer = setTimeout(() => {
      if (!loading) {
        setLocation(user ? '/dashboard' : '/login');
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
            <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
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
            <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
          </>
        )}
      </div>
    </div>
  );
}
