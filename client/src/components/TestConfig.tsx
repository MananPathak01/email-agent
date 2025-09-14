import { useEffect } from 'react';
import { firebaseConfig } from '../firebase';

export const TestConfig = () => {
  useEffect(() => {
    console.log('Firebase Config:', {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '***' : 'MISSING',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'MISSING',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'MISSING',
      // Don't log the full config for security
      configLoaded: !!import.meta.env.VITE_FIREBASE_API_KEY
    });

    console.log('API Configuration:', {
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'MISSING',
      isUsingRender: import.meta.env.VITE_API_BASE_URL?.includes('onrender.com') || false,
      allEnvVars: import.meta.env
    });
  }, []);

  return null;
};
