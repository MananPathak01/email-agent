// Environment variables check utility
export const checkEnvironmentVariables = () => {
    const requiredVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
        'VITE_FIREBASE_MEASUREMENT_ID'
    ];

    const missing = requiredVars.filter(varName => !import.meta.env[varName]);

    if (missing.length > 0) {
        console.error('❌ Missing environment variables:', missing);
        console.log('Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
        return false;
    }

    console.log('✅ All Firebase environment variables are present');
    return true;
};

// Log environment status on import
if (import.meta.env.DEV) {
    checkEnvironmentVariables();
}
