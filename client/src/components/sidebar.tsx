import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogOverlay
} from "@/components/ui/dialog";
import { ConnectEmailDialog } from "./dialogs/ConnectEmailDialog";
import { 
  Mail, Plus, Loader2, Send, Inbox, 
  SendHorizonal, Trash, FileText, Settings, 
  LogOut, ChevronDown, ChevronUp, Check, X, Bot, ChevronRight, ChevronLeft 
} from "lucide-react";


type GmailAccount = {
  id: string;
  email: string;
  isActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastConnectedAt: string;
};

type NavigationItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
};

type NewEmailData = {
  subject: string;
  fromEmail: string;
  fromName: string;
  content: string;
  toEmail: string;
};

interface SidebarProps {
  defaultCollapsed?: boolean;
}

export default function Sidebar({ defaultCollapsed = false }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isAddEmailOpen, setIsAddEmailOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState<NewEmailData>({
    subject: "",
    fromEmail: "",
    fromName: "",
    content: "",
    toEmail: ""
  });
  const userId = user?.uid;

  // Navigation items - moved to useMemo or constant to prevent re-creation
  const navigationItems: NavigationItem[] = [
    {
      id: "chat",
      icon: Bot,
      label: "Chat",
      path: "/dashboard"
    },
    {
      id: "emails",
      icon: Inbox,
      label: "Emails",
      path: "/emails"
    },
    {
      id: "tasks",
      icon: FileText,
      label: "Tasks",
      path: "/tasks"
    }
  ];

  // Check if current path is active
  const isActivePath = useCallback((path: string) => {
    return String(location) === path;
  }, [location]);

  // Fetch connected Gmail accounts with proper type safety
  const { 
    data: gmailAccounts = [], 
    isLoading: isLoadingAccounts,
    error: accountsError,
    refetch: refetchAccounts
  } = useQuery<GmailAccount[]>({
    queryKey: ['gmailAccounts'],
    queryFn: async (): Promise<GmailAccount[]> => {
      if (!user) return [];
      
      const idToken = await user.getIdToken();
      const response = await fetch('/api/gmail/accounts', {
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to fetch accounts:', errorData);
        throw new Error(`Failed to fetch accounts: ${response.status} ${errorData}`);
      }
      
      return response.json();
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    meta: {
      errorMessage: 'Failed to load connected accounts'
    }
  });

  // Improved Gmail OAuth mutation with better error handling
  const connectGmailMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user) throw new Error('User not authenticated');
      
      // Get the auth URL
      const idToken = await user.getIdToken();
      const response = await fetch('/api/gmail/auth', {
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to get auth URL: ${response.status} ${errorData}`);
      }
      
      const { authUrl } = await response.json();
      
      if (!authUrl) {
        throw new Error('No auth URL received from server');
      }
      
      window.open(authUrl, '_blank');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmailAccounts'] });
      toast.success('Successfully connected Gmail account');
      setIsConnectDialogOpen(false);
    },
    onError: (error: Error) => {
      console.error('Gmail connection error:', error);
      toast.error(error.message || 'Failed to connect Gmail account');
    },
  });

  // Add email mutation
  const addEmailMutation = useMutation({
    mutationFn: async (emailData: NewEmailData) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await user.getIdToken();
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ...emailData,
          toEmail: emailData.toEmail || 'admin@example.com'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsAddEmailOpen(false);
      toast.success('Email added successfully');
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (error: Error) => {
      console.error('Add email error:', error);
      toast.error(error.message || 'Failed to add email');
    },
  });

  // Memoized handlers to prevent unnecessary re-renders
  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);

  const handleAddEmail = useCallback(() => {
    if (!newEmail.subject || !newEmail.fromEmail || !newEmail.content) {
      toast.error('Please fill in all required fields (subject, from email, and content)');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.fromEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    addEmailMutation.mutate(newEmail);
  }, [newEmail, addEmailMutation, toast]);

  const handleConnectGmail = useCallback(async () => {
    try {
      await connectGmailMutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Connect Gmail error:', error);
    }
  }, [connectGmailMutation]);

  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
      setLocation('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  }, [auth, setLocation, toast]);

  const handleCloseAddEmail = useCallback(() => {
    setIsAddEmailOpen(false);
    // Reset form when closing
    setNewEmail({
      subject: "",
      fromEmail: "",
      fromName: "",
      content: "",
      toEmail: "admin@example.com"
    });
  }, []);

  

  // Get user initials safely
  const getUserInitials = useCallback(() => {
    if (!user?.displayName) return 'U';
    return user.displayName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  }, [user?.displayName]);

  return (
    <div className={`bg-white border-r border-border flex flex-col h-screen shadow-sm transition-all duration-300 ${
      isCollapsed ? "w-20" : "w-72"
    }`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-border bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Bot className="text-gray-700 h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI Email Agent</h1>
              <p className="text-xs text-gray-500">Workflow Automation</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 flex-1">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.path)}
                className={`flex items-center w-full px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                } ${isCollapsed ? 'flex-col justify-center items-center' : ''}`}
                title={isCollapsed ? undefined : item.label}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-50 flex-shrink-0">
                  <Icon className="h-4 w-4 text-gray-500" />
                </span>
                {isCollapsed ? (
                  <span className="text-[10px] mt-1 text-center">{item.label}</span>
                ) : (
                  <>
                    <span className="ml-3">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant={isActive ? "secondary" : "default"}
                        className="ml-auto text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toggle Collapse Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="mx-4 mb-2"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Connected Accounts Section - Only show when expanded */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest">Connected Accounts {gmailAccounts.length > 0 ? `(${gmailAccounts.length})` : ''}</h3>
            {isLoadingAccounts && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          <div className="space-y-2">
            {accountsError ? (
              <div className="text-xs text-red-600 p-2 bg-red-100 rounded-md">
                Failed to load accounts. Please try refreshing the page.
                <button 
                  onClick={() => queryClient.refetchQueries({ queryKey: ['/api/gmail/accounts', userId] })}
                  className="ml-2 text-gray-700 underline hover:no-underline font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : gmailAccounts.length > 0 ? (
              gmailAccounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-base">
                    {account.email?.[0]?.toUpperCase() || <Mail className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{account.email}</p>
                    <p className="text-xs text-gray-500">Gmail</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400 p-2 text-center">No connected accounts</div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-md mt-2"
              onClick={() => setIsConnectDialogOpen(true)}
              disabled={connectGmailMutation.isPending || isLoadingAccounts}
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Email
            </Button>
          </div>
        </div>
      )}

      {/* User Profile - Simplified when collapsed */}
      <div className="p-3 border-t border-border bg-white">
        {isCollapsed ? (
          <Avatar className="w-9 h-9 border border-gray-200 mx-auto">
            <AvatarImage 
              src={user?.photoURL || ''} 
              alt={user?.displayName || 'User'} 
            />
            <AvatarFallback className="bg-gray-300 text-gray-700 text-base">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <>
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-9 h-9 border border-gray-200">
                <AvatarImage 
                  src={user?.photoURL || ''} 
                  alt={user?.displayName || 'User'} 
                />
                <AvatarFallback className="bg-gray-300 text-gray-700 text-base">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center">
                <p className="text-xs font-medium text-gray-900 truncate">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-1 mt-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                onClick={() => handleNavigate("/settings")}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Dialogs - Keep these unchanged */}
      <ConnectEmailDialog
        open={isConnectDialogOpen}
        onOpenChange={setIsConnectDialogOpen}
        onConnectGmail={handleConnectGmail}
        isConnecting={connectGmailMutation.isPending}
      />

      <Dialog open={isAddEmailOpen} onOpenChange={setIsAddEmailOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-foreground">Subject *</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={newEmail.subject}
                onChange={(e) =>
                  setNewEmail(prev => ({ ...prev, subject: e.target.value }))
                }
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail" className="text-foreground">From Email *</Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="from@example.com"
                value={newEmail.fromEmail}
                onChange={(e) =>
                  setNewEmail(prev => ({ ...prev, fromEmail: e.target.value }))
                }
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName" className="text-foreground">From Name</Label>
              <Input
                id="fromName"
                placeholder="John Doe"
                value={newEmail.fromName}
                onChange={(e) =>
                  setNewEmail(prev => ({ ...prev, fromName: e.target.value }))
                }
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="text-foreground">Email Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your email content here..."
                rows={4}
                value={newEmail.content}
                onChange={(e) =>
                  setNewEmail(prev => ({ ...prev, content: e.target.value }))
                }
                className="bg-background border-input"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCloseAddEmail}
                disabled={addEmailMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEmail}
                disabled={addEmailMutation.isPending}
              >
                {addEmailMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}