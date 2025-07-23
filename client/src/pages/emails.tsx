import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Sidebar from "@/components/sidebar";
import { 
  Mail, 
  Clock, 
  User, 
  Reply, 
  Archive, 
  Star,
  Calendar,
  ArrowRight,
  MoreHorizontal,
  Plus
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

function getHeader(headers: any[], name: string) {
  const found = headers?.find((h) => h.name === name);
  return found ? found.value : '';
}

export default function EmailsPage() {
  const [folder, setFolder] = useState<'inbox' | 'sent'>("inbox");
  const { user } = useAuth();
  const userId = user?.uid;
  
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['/api/emails', userId],
    queryFn: async () => {
      const response = await fetch(`/api/emails?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch emails');
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading emails...</div>
      </div>
    );
  }

  if (!userId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      {/* Main Content */}
      <div className="flex-1 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Email Threads</h1>
            <p className="text-gray-600 mt-1">View your Gmail {folder === 'inbox' ? 'Inbox' : 'Sent'} emails</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant={folder === 'inbox' ? 'default' : 'outline'}
              onClick={() => setFolder('inbox')}
            >
              Inbox
            </Button>
            <Button
              variant={folder === 'sent' ? 'default' : 'outline'}
              onClick={() => setFolder('sent')}
            >
              Sent
            </Button>
          </div>
        </div>
        {/* Email List */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {emails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                <p className="text-gray-500 mb-4">Try switching folders or connecting your Gmail account.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {emails.map((email: any) => (
                  <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {getHeader(email.headers, "Subject") || email.snippet}
                          </h3>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-1">
                          <span>From: {getHeader(email.headers, "From")}</span>
                          <span className="mx-2">|</span>
                          <span>To: {getHeader(email.headers, "To")}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mb-2">
                          <Clock className="h-3 w-3 mr-1" />
                          {getHeader(email.headers, "Date")}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          {email.snippet}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}