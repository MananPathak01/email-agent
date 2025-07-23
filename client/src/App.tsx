import { Route, Switch, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import { useEffect } from "react";

// Pages
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import EmailsPage from "@/pages/emails";
import TasksPage from "@/pages/tasks";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OAuthCallback from "@/pages/OAuthCallback";
import PricingPage from "@/pages/pricing";
import HelpPage from "@/pages/help";
import TermsPage from "@/pages/terms";
import DocsPage from "@/pages/docs";

// Initialize React Query
const queryClient = new QueryClient();

// Root component that handles the root route
const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show the landing page to all users, regardless of auth status
  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={RootRoute} />
          
          {/* Public routes */}
          <Route path="/login">
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          </Route>
          
          <Route path="/signup">
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          </Route>
          <Route path="/pricing" component={PricingPage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/docs" component={DocsPage} />
          
          {/* OAuth Callback Route */}
          <Route path="/oauth/callback" component={OAuthCallback} />
          
          {/* Protected routes */}
          <Route path="/dashboard">
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/emails">
            <ProtectedRoute>
              <EmailsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/tasks">
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          </Route>
          <Route path="/analytics">
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          </Route>
<Route path="/settings">
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </Route>
        </Switch>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
