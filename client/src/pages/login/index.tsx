import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Header from "@/components/ui/Header";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const [_, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // Store the redirect URL before login
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/chat';
      sessionStorage.setItem('redirectAfterLogin', redirect);

      await login(email, password);
      // The actual redirect will be handled by the AuthProvider's onAuthStateChanged
    } catch (err) {
      const error = err as Error;
      console.error('Login error:', error);
      setError(error.message || 'Failed to log in. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);

      // Store the redirect URL before starting the sign-in flow
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/chat';
      sessionStorage.setItem('redirectAfterLogin', redirect);

      await signInWithGoogle();
      // The actual redirect will be handled by the AuthProvider's onAuthStateChanged
    } catch (err) {
      const error = err as Error;
      console.error('Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                create a new account
              </Link>
            </p>
          </div>

          {error && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  disabled={loading}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-blue-600 hover:underline"
                  onClick={(e) => loading && e.preventDefault()}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${loading ? 'opacity-70' : ''}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>

              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.28426 53.749 C -8.52426 55.059 -9.224 56.159 -10.144 56.859 L -10.144 60.329 L -6.464 60.329 C -4.564 58.639 -3.264 55.509 -3.264 51.509 Z" />
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.864 60.329 L -10.544 56.859 C -11.554 57.589 -12.924 57.979 -14.754 57.979 C -17.884 57.979 -20.534 55.949 -21.464 53.119 L -25.274 53.119 L -25.274 56.589 C -23.294 60.539 -19.444 63.239 -14.754 63.239 Z" />
                    <path fill="#FBBC05" d="M -21.464 53.119 C -21.734 52.299 -21.864 51.429 -21.864 50.529 C -21.864 49.629 -21.724 48.759 -21.464 47.939 L -21.464 44.469 L -25.254 44.469 C -26.294 46.559 -26.754 48.899 -26.254 51.119 C -25.754 53.339 -24.254 55.239 -21.884 56.419 L -21.884 56.469 L -18.024 56.469 C -18.304 55.799 -18.494 55.059 -18.494 54.279 C -18.494 53.499 -18.304 52.759 -18.024 52.089 L -21.464 53.119 Z" />
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.564 40.699 -11.474 39.739 -14.754 39.739 C -19.444 39.739 -23.294 42.439 -25.274 46.389 L -21.464 47.939 C -20.534 45.109 -17.884 43.989 -14.754 43.989 Z" />
                  </g>
                </svg>
                {loading ? 'Signing in...' : 'Google'}
              </button>
            </div>

            <div className="text-sm text-center text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="font-medium text-blue-600 hover:underline"
                onClick={(e) => loading && e.preventDefault()}
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
