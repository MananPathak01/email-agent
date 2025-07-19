import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Bot, 
  MessageSquare, 
  Inbox, 
  CheckSquare, 
  BarChart3, 
  Plus, 
  Settings,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { useUser } from "@clerk/clerk-react";

interface SidebarProps {
  userId: number;
}

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const [isAddEmailOpen, setIsAddEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({
    subject: "",
    fromEmail: "",
    fromName: "",
    content: "",
    toEmail: "admin@example.com"
  });
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  // Fetch Gmail accounts
  const { data: gmailAccounts = [] } = useQuery({
    queryKey: ['/api/gmail/accounts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/gmail/accounts?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/user', userId],
  });

  // Gmail OAuth mutation
  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/gmail');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const data = await response.json();
      
      // Open popup immediately to avoid popup blockers
      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Failed to open OAuth popup');
      }
      
      return new Promise((resolve, reject) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'oauth_success') {
            window.removeEventListener('message', messageHandler);
            resolve(event.data.data);
          } else if (event.data.type === 'oauth_error') {
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error));
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Fallback: check if popup is closed
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            reject(new Error('OAuth popup was closed'));
          }
        }, 1000);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          if (!popup.closed) {
            popup.close();
          }
          reject(new Error('OAuth timeout'));
        }, 300000);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gmail/accounts', userId] });
      toast({
        title: "Success",
        description: "Gmail account connected successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to connect Gmail account",
        variant: "destructive",
      });
    }
  });

  // Add email mutation
  const addEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await apiRequest('POST', '/api/emails', {
        ...emailData,
        gmailAccountId: gmailAccounts[0]?.id || 1,
        messageId: `manual_${Date.now()}`,
        threadId: `thread_${Date.now()}`,
        status: 'pending',
        receivedAt: new Date()
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsAddEmailOpen(false);
      setNewEmail({
        subject: "",
        fromEmail: "",
        fromName: "",
        content: "",
        toEmail: "admin@example.com"
      });
      toast({
        title: "Success",
        description: `Email added successfully! ${data.analysis?.isOnboardingRelated ? 'AI detected this as onboarding-related.' : ''}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add email",
        variant: "destructive",
      });
    }
  });

  const handleAddEmail = () => {
    if (!newEmail.subject || !newEmail.fromEmail || !newEmail.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    addEmailMutation.mutate(newEmail);
  };

  const navigationItems = [
    {
      id: "assistant",
      icon: MessageSquare,
      label: "AI Assistant",
      path: "/dashboard",
    },
    {
      id: "emails",
      icon: Inbox,
      label: "Email Threads",
      path: "/emails",
      badge: 12,
    },
    {
      id: "tasks",
      icon: CheckSquare,
      label: "Tasks",
      path: "/tasks",
      badge: 5,
    },
    {
      id: "analytics",
      icon: BarChart3,
      label: "Analytics",
      path: "/analytics",
    },
    // Removed settings item
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="text-white h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI Email Agent</h1>
              <p className="text-xs text-gray-500">Workflow Automation</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location === item.path || (item.path === '/dashboard' && location === '/dashboard')
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={
                      location === item.path || (item.path === '/dashboard' && location === '/dashboard')
                        ? 'secondary'
                        : 'default'
                    }
                    className={
                      location === item.path || (item.path === '/dashboard' && location === '/dashboard')
                        ? 'bg-white text-primary'
                        : 'bg-primary text-white'
                    }
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Connected Accounts Section */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Connected Accounts ({gmailAccounts.length})
          </h3>
          <div className="space-y-2">
            {gmailAccounts.map((account) => (
              <div key={account.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                <Mail className="h-4 w-4 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{account.email}</p>
                  <p className="text-xs text-gray-500">Gmail</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Connected
                </Badge>
              </div>
            ))}
            
            {gmailAccounts.length === 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-primary border-primary hover:bg-primary hover:text-white"
                  onClick={() => setIsConnectDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Email
                </Button>
                <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                  <DialogContent className="max-w-xs">
                    <DialogHeader>
                      <DialogTitle>Connect Email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center"
                        onClick={() => {
                          setIsConnectDialogOpen(false);
                          connectGmailMutation.mutate();
                        }}
                        disabled={connectGmailMutation.isPending}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {connectGmailMutation.isPending ? "Connecting..." : "Login with Gmail"}
                      </Button>
                      {/* Future: Add more providers here */}
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-primary border-primary hover:bg-primary hover:text-white"
                  onClick={() => setIsConnectDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another
                </Button>
                <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                  <DialogContent className="max-w-xs">
                    <DialogHeader>
                      <DialogTitle>Connect Email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center"
                        onClick={() => {
                          setIsConnectDialogOpen(false);
                          connectGmailMutation.mutate();
                        }}
                        disabled={connectGmailMutation.isPending}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {connectGmailMutation.isPending ? "Connecting..." : "Login with Gmail"}
                      </Button>
                      {/* Future: Add more providers here */}
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={isAddEmailOpen} onOpenChange={setIsAddEmailOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-1 text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Email Manually
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Email Manually</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          value={newEmail.subject}
                          onChange={(e) => setNewEmail(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Email subject"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fromEmail">From Email *</Label>
                        <Input
                          id="fromEmail"
                          type="email"
                          value={newEmail.fromEmail}
                          onChange={(e) => setNewEmail(prev => ({ ...prev, fromEmail: e.target.value }))}
                          placeholder="sender@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fromName">From Name</Label>
                        <Input
                          id="fromName"
                          value={newEmail.fromName}
                          onChange={(e) => setNewEmail(prev => ({ ...prev, fromName: e.target.value }))}
                          placeholder="Sender Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Email Content *</Label>
                        <Textarea
                          id="content"
                          value={newEmail.content}
                          onChange={(e) => setNewEmail(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Email content..."
                          rows={4}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={handleAddEmail}
                          disabled={addEmailMutation.isPending}
                          className="flex-1"
                        >
                          {addEmailMutation.isPending ? 'Adding...' : 'Add Email'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsAddEmailOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </div>

      {/* User Profile at the bottom */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={clerkUser?.imageUrl || "/placeholder-avatar.jpg"} alt="User avatar" />
            <AvatarFallback>{clerkUser?.firstName?.[0]?.toUpperCase()}{clerkUser?.lastName?.[0]?.toUpperCase() || ''}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {clerkUser ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() : 'User'}
            </p>
            <p className="text-xs text-gray-500">{clerkUser?.primaryEmailAddress?.emailAddress || 'Authenticated'}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
