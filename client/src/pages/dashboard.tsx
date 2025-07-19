import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import ChatInterface from "@/components/chat-interface";
import TaskPanel from "@/components/task-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useUser } from "@clerk/clerk-react";
import { apiRequest } from "@/lib/api";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isConnected, lastMessage } = useWebSocket();
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  // Create user in database if not exists
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('POST', '/api/user', userData);
      return response.json();
    },
  });

  // Create user in database on first load
  useEffect(() => {
    if (clerkUser && !createUserMutation.data) {
      createUserMutation.mutate({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
      });
    }
  }, [clerkUser]);

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/user', userId],
    enabled: !!userId,
  });

  // Fetch dashboard analytics
  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (lastMessage) {
      // Handle real-time updates
      console.log('Received WebSocket message:', lastMessage);
      // You could invalidate queries here based on message type
    }
  }, [lastMessage]);

  if (!userId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
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
                {analytics?.pendingNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-xs rounded-full flex items-center justify-center">
                    {analytics.pendingNotifications}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* AI Chat Interface */}
          <ChatInterface userId={userId} />

          {/* Right Sidebar - Task Management */}
          <TaskPanel userId={userId} />
        </div>
      </div>
    </div>
  );
}
