import { useState } from "react";
import Sidebar from "@/components/sidebar";
import ChatInterface from "@/components/chat-interface";
import TaskPanel from "@/components/task-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/contexts/AuthContext";
import { getAuth } from "firebase/auth";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isConnected } = useWebSocket();
  const { user: authUser, loading: authLoading } = useAuth();
  const userId = authUser?.uid;

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, this should be handled by ProtectedRoute
  if (!authUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">AI Assistant</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-gray-400'}`}></div>
                <span>{isConnected ? 'AI Online' : 'Connecting...'}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search emails, tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64"
                />
              </div>
              
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome back, {authUser.displayName || 'User'}</h1>
              
              {/* Add your main dashboard content here */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Email Inbox</h2>
                <p className="text-gray-600">Connect your Gmail account to get started.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
