import { Route, Switch } from "wouter";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import EmailsPage from "@/pages/emails";
import TasksPage from "@/pages/tasks";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import OAuthCallback from "@/pages/oauth-callback";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Clerk Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your environment variables.");
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey} appearance={{
      elements: {
        formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
        card: "bg-white shadow-lg",
      }
    }}>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/">
            <LandingPage />
          </Route>
          <Route path="/dashboard">
            <SignedIn>
              <Dashboard />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </Route>
          <Route path="/emails">
            <SignedIn>
              <EmailsPage />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </Route>
          <Route path="/tasks">
            <SignedIn>
              <TasksPage />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </Route>
          <Route path="/analytics">
            <SignedIn>
              <AnalyticsPage />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </Route>
          <Route path="/settings">
            <SignedIn>
              <SettingsPage />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </Route>
          <Route path="/oauth/callback">
            <SignedIn>
              <OAuthCallback />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
