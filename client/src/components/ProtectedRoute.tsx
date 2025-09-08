import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // After the first render, we're no longer in the initial load
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Handle redirect when user is not authenticated
  useEffect(() => {
    if (!loading && !user && !isInitialLoad) {
      setLocation(`/login?redirect=${encodeURIComponent(location)}`);
    }
  }, [user, loading, isInitialLoad, location, setLocation]);

  // Show loading state only on initial load or when auth is being checked
  if (loading || isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, we'll redirect in the useEffect
  if (!user) {
    return null;
  }

  // If authenticated, render the children
  return <>{children}</>;
};

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect') || '/chat';
  const isLandingPage = window.location.pathname === '/';

  useEffect(() => {
    // After the first render, we're no longer in the initial load
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Handle redirect when user becomes authenticated
  useEffect(() => {
    // Don't redirect if it's the landing page
    if (!loading && user && !isInitialLoad && !isLandingPage) {
      setLocation(redirect);
    }
  }, [user, loading, isInitialLoad, redirect, setLocation, isLandingPage]);

  // Show loading state only on initial load or when auth is being checked
  if (loading || isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated or it's the landing page, render the children
  return <>{children}</>;
};
