import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Sidebar from "@/components/sidebar";
import { useGmail } from "@/hooks/use-gmail";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { EmailMessage, GmailLabel, EmailListResponse, GmailAccount } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/components/ui/link";
import { useQueryClient } from "@tanstack/react-query";
import { gmailApi } from "@/lib/api";
import {
  Inbox,
  Send,
  FileText,
  Star,
  Trash2,
  Archive,
  Search,
  MoreHorizontal,
  Reply,
  ReplyAll,
  Forward,
  Loader2,
  Mail,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Menu,
  Users,
  Bell,
  MessageSquare,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

function SimpleEmailCard({ email, isSelected, onClick }: { 
  email: EmailMessage; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const date = new Date(email.parsedPayload?.date || email.internalDate);
  const timeString = date.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: '2-digit'
  });

  const isUnread = email.labelIds?.includes('UNREAD');
  const from = email.parsedPayload?.from || '';
  const subject = email.parsedPayload?.subject || email.snippet || '';
  const snippet = email.snippet || '';

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50/50' : ''
      } ${isUnread ? 'font-medium' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isUnread ? 'bg-blue-500' : 'bg-transparent'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm truncate">
              {from.split('<')[0].trim() || from}
            </span>
            <span className="text-xs text-gray-500 flex-shrink-0">{timeString}</span>
          </div>
          <div className="text-sm truncate">{subject}</div>
          <div className="text-xs text-gray-500 truncate">{snippet}</div>
        </div>
      </div>
    </div>
  );
}

const MAIN_FOLDERS = [
  { key: "INBOX", label: "Inbox", icon: Inbox },
  { key: "STARRED", label: "Starred", icon: Star },
  { key: "IMPORTANT", label: "Important", icon: Star },
  { key: "SENT", label: "Sent", icon: Send },
  { key: "DRAFT", label: "Drafts", icon: FileText },
  { key: "TRASH", label: "Trash", icon: Trash2 },
  { key: "SPAM", label: "Spam", icon: AlertCircle },
];

const CATEGORIES = [
  { key: "CATEGORY_PRIMARY", label: "Primary", icon: Inbox },
  { key: "CATEGORY_SOCIAL", label: "Social", icon: Users },
  { key: "CATEGORY_PROMOTIONS", label: "Promotions", icon: Tag },
  { key: "CATEGORY_UPDATES", label: "Updates", icon: Bell },
  { key: "CATEGORY_FORUMS", label: "Forums", icon: MessageSquare },
];

export default function EmailsPage() {
  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedCategory, setSelectedCategory] = useState("CATEGORY_PRIMARY");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [showCategories, setShowCategories] = useState(true);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [inboxExpanded, setInboxExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasPrefetched, setHasPrefetched] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    accounts,
    isLoadingAccounts,
    accountsError,
    useEmails,
    useLabels,
    useEmail,
  } = useGmail();

  // Fetch the selected email for preview
  const {
    data: selectedEmail,
    isLoading: isLoadingEmail,
    error: emailError,
  } = useEmail(
    selectedEmailId || '',
    selectedAccount === 'all' ? undefined : selectedAccount
  );

  // Get labels
  const {
    data: labels = [],
    isLoading: isLoadingLabels,
    error: labelsError,
  } = useLabels(selectedAccount === "all" ? undefined : selectedAccount);

  // Map category keys to actual Gmail label IDs for the selected account
  const categoryLabelIdMap = labels.reduce((acc: Record<string, string>, label: GmailLabel) => {
    // Gmail's built-in category labels have ids like CATEGORY_PERSONAL, CATEGORY_SOCIAL, etc.
    // The display names are 'Primary', 'Social', etc.
    if (label.id.startsWith('CATEGORY_')) {
      // Map CATEGORY_PERSONAL to CATEGORY_PRIMARY for UI consistency
      if (label.id === 'CATEGORY_PERSONAL') {
        acc['CATEGORY_PRIMARY'] = label.id;
      } else {
        acc[label.id] = label.id;
      }
    }
    return acc;
  }, {} as Record<string, string>);

  // Prefetch emails for all connected accounts and all major categories on first visit
  useEffect(() => {
    if (user && !hasPrefetched && accounts.length > 0 && labels.length > 0) {
      const prefetchEmails = async () => {
        try {
          // List of all major categories to prefetch
          const categoriesToPrefetch = [
            'CATEGORY_PRIMARY',
            'CATEGORY_SOCIAL',
            'CATEGORY_PROMOTIONS',
            'CATEGORY_UPDATES',
            'CATEGORY_FORUMS',
          ];

          // Prefetch emails for each account and each category
          const prefetchPromises = accounts.flatMap(account =>
            categoriesToPrefetch.map(catKey => {
              const labelId = categoryLabelIdMap[catKey];
              if (!labelId) return null;
              return queryClient.prefetchQuery({
                queryKey: ['gmail-emails', {
                  accountId: account.id,
                  labelIds: [labelId],
                  maxResults: 20
                }],
                queryFn: () => gmailApi.getEmails({
                  accountId: account.id,
                  labelIds: [labelId],
                  maxResults: 20
                }),
                staleTime: 5 * 60 * 1000,
              });
            }).filter(Boolean)
          );

          // Also prefetch labels for each account
          const labelPrefetchPromises = accounts.map(account =>
            queryClient.prefetchQuery({
              queryKey: ['gmail-labels', account.id],
              queryFn: () => gmailApi.getLabels(account.id),
              staleTime: 10 * 60 * 1000,
            })
          );

          // Execute all prefetch operations
          await Promise.allSettled([...prefetchPromises, ...labelPrefetchPromises]);
          console.log('Email prefetch completed for', accounts.length, 'accounts and all major categories');
          setHasPrefetched(true);
        } catch (error) {
          console.error('Error prefetching emails:', error);
        }
      };

      prefetchEmails();
    }
  }, [user, accounts, hasPrefetched, queryClient, labels, categoryLabelIdMap]);

  // Get emails for the selected folder/category
  const {
    data: emailsData,
    isLoading: isLoadingEmails,
    error: emailsError,
    isFetching: isRefetchingEmails,
    dataUpdatedAt,
    refetch: refetchEmails,
  } = useEmails({
    accountId: selectedAccount === "all" ? undefined : selectedAccount,
    labelIds:
      selectedFolder === "INBOX"
        ? categoryLabelIdMap[selectedCategory] ? [categoryLabelIdMap[selectedCategory]] : []
        : [selectedFolder],
    q: search,
  });

  // Handle manual refresh
  const handleRefresh = () => {
    refetchEmails();
    toast.success('Refreshing emails...');
  };

  // Update last updated timestamp when data changes
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // When Inbox is selected, always auto-select Primary unless user changes
  useEffect(() => {
    if (selectedFolder === "INBOX" && !CATEGORIES.some(c => c.key === selectedCategory)) {
      setSelectedCategory("CATEGORY_PRIMARY");
    }
  }, [selectedFolder]);

  // Format last updated time
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // If there's an error fetching labels
  if (labelsError) {
    console.error('Error fetching labels:', labelsError);
    toast.error('Failed to load email labels');
  }

  // If there's an error fetching emails
  if (emailsError) {
    console.error('Error fetching emails:', emailsError);
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load emails</h2>
        <p className="text-gray-500 mb-4 max-w-md text-center">
          {emailsError instanceof Error ? emailsError.message : 'Please try again later'}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Button variant="outline" asChild>
            <a href="/settings">Check Settings</a>
          </Button>
        </div>
      </div>
    );
  }

  // Handle email selection
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
    if (isMobile) {
      setShowEmailPreview(true);
    }
  };

  // Prepare UI states based on conditions - but don't return early
  let uiState = 'normal';
  let errorMessage = '';
  
  // Check authentication
  if (!user) {
    uiState = 'not-authenticated';
  }
  // Check for accounts
  else if (!isLoadingAccounts && !accountsError && accounts.length === 0) {
    uiState = 'no-accounts';
  }
  // Check for account errors
  else if (accountsError) {
    uiState = 'account-error';
    errorMessage = accountsError instanceof Error ? accountsError.message : 'Please try again later';
  }

  // Render different UI states based on conditions
  if (uiState === 'not-authenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Mail className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to access your emails</h2>
        <p className="text-gray-500 mb-4">Connect your email account to get started</p>
        <Button asChild>
          <a href="/login">Sign In</a>
        </Button>
      </div>
    );
  }

  if (uiState === 'no-accounts') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Mail className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect an email account</h2>
        <p className="text-gray-500 mb-4">Add your Gmail account to start managing emails</p>
        <Button asChild>
          <a href="/settings">Connect Account</a>
        </Button>
      </div>
    );
  }

  if (uiState === 'account-error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load accounts</h2>
        <p className="text-gray-500 mb-4 max-w-md text-center">{errorMessage}</p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Button variant="outline" asChild>
            <a href="/settings">Check Settings</a>
          </Button>
        </div>
      </div>
    );
  }

  // Normal UI state
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main App Sidebar - Collapsed by default on email page */}
      <Sidebar defaultCollapsed={true} />

      {/* Email Interface */}
      <div className="flex-1 flex">
        {/* Email Folders Sidebar */}
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden absolute top-3 left-3 z-20">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <EmailSidebar
                selectedFolder={selectedFolder}
                setSelectedFolder={setSelectedFolder}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                inboxExpanded={inboxExpanded}
                setInboxExpanded={setInboxExpanded}
                showLabels={showLabels}
                setShowLabels={setShowLabels}
                showCategories={showCategories}
                setShowCategories={setShowCategories}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                accounts={accounts}
                isLoadingAccounts={isLoadingAccounts}
                labels={labels}
                isLoadingLabels={isLoadingLabels}
                emailsData={emailsData}
                lastUpdated={lastUpdated}
                isRefetchingEmails={isRefetchingEmails}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <aside className="w-64 border-r bg-white flex flex-col lg:flex">
            <EmailSidebar
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              inboxExpanded={inboxExpanded}
              setInboxExpanded={setInboxExpanded}
              showLabels={showLabels}
              setShowLabels={setShowLabels}
              showCategories={showCategories}
              setShowCategories={setShowCategories}
              selectedAccount={selectedAccount}
              setSelectedAccount={setSelectedAccount}
              accounts={accounts}
              isLoadingAccounts={isLoadingAccounts}
              labels={labels}
              isLoadingLabels={isLoadingLabels}
              emailsData={emailsData}
              lastUpdated={lastUpdated}
              isRefetchingEmails={isRefetchingEmails}
            />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b bg-white p-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xl">
                <Input
                  className="pl-9 bg-gray-50"
                  placeholder="Search emails..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Last updated indicator */}
              {lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {isRefetchingEmails && (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  )}
                  <span>Updated {formatLastUpdated(lastUpdated)}</span>
                </div>
              )}
              {/* Manual refresh button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefetchingEmails}
                className="hidden sm:flex"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefetchingEmails ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Clock className="h-4 w-4 mr-2" />
                Latest
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <Button variant="outline" size="icon"><Archive className="h-4 w-4" /></Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (selectedEmailId) {
                    // moveToTrash.mutate({ messageId: selectedEmailId, accountId: selectedAccount }); // This line was removed
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Email List & Preview */}
          <div className="flex flex-1 min-h-0">
            {/* Email List */}
            <ScrollArea
              className={`border-r bg-white flex-shrink-0 transition-all duration-300
                ${isMobile && showEmailPreview ? 'hidden' :
                  isMobile ? 'w-full' :
                  selectedEmailId ? 'basis-[40%] min-w-[250px] max-w-[500px]' : 'max-w-[900px] w-full'}
              `}
            >
              <div className="divide-y divide-gray-100">
                {/* Show loading only on initial load, not on refetch */}
                {isLoadingEmails && !emailsData ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Loader2 className="h-10 w-10 animate-spin mb-2" />
                    <span>Loading emails...</span>
                  </div>
                ) : emailsData?.emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Mail className="h-10 w-10 mb-2" />
                    <span>No emails found</span>
                  </div>
                ) : (
                  <>
                    {/* Show cached emails instantly */}
                    {emailsData?.emails.map(email => (
                      <SimpleEmailCard
                        key={email.id}
                        email={email}
                        isSelected={selectedEmailId === email.id}
                        onClick={() => handleEmailSelect(email.id)}
                      />
                    ))}
                    {/* Show updating indicator if refetching */}
                    {isRefetchingEmails && emailsData && (
                      <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        Updating...
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Email Preview */}
            <div
              className={`flex-1 bg-white flex flex-col min-w-0 transition-all duration-300
                ${isMobile && !showEmailPreview ? 'hidden' : 'flex'}
                ${selectedEmailId ? 'basis-[60%] min-w-[200px]' : 'flex-grow'}
              `}
              style={{ minWidth: 0 }}
            >
              {isLoadingEmail ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="h-10 w-10 animate-spin mb-2" />
                  <span>Loading email...</span>
                </div>
              ) : emailError ? (
                <div className="flex flex-col items-center justify-center h-full text-red-400">
                  <AlertCircle className="h-12 w-12 mb-4" />
                  <span>Failed to load email</span>
                </div>
              ) : selectedEmail ? (
                <div className="flex flex-col h-full">
                  {/* Render email subject, from, date, and body */}
                  <div className="border-b px-8 py-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedEmail.parsedPayload?.subject || selectedEmail.snippet}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <span>From: {selectedEmail.parsedPayload?.from}</span>
                      <span>{new Date(selectedEmail.parsedPayload?.date || selectedEmail.internalDate).toLocaleString()}</span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-8">
                    <div className="max-w-3xl mx-auto">
                      <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: selectedEmail.parsedPayload?.body || selectedEmail.snippet }} />
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Mail className="h-12 w-12 mb-4" />
                  <span>Select an email to preview</span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

interface EmailSidebarProps {
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  inboxExpanded: boolean;
  setInboxExpanded: (expanded: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  showCategories: boolean;
  setShowCategories: (show: boolean) => void;
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
  accounts: GmailAccount[];
  isLoadingAccounts: boolean;
  labels: GmailLabel[];
  isLoadingLabels: boolean;
  emailsData?: EmailListResponse;
  lastUpdated?: Date | null;
  isRefetchingEmails?: boolean;
}

function EmailSidebar({ 
  selectedFolder, 
  setSelectedFolder,
  selectedCategory,
  setSelectedCategory,
  inboxExpanded,
  setInboxExpanded,
  showLabels,
  setShowLabels,
  showCategories,
  setShowCategories,
  selectedAccount,
  setSelectedAccount,
  accounts,
  isLoadingAccounts,
  labels,
  isLoadingLabels,
  emailsData,
  lastUpdated,
  isRefetchingEmails,
}: EmailSidebarProps) {
  return (
    <>
      {/* Account Selector */}
      <div className="p-4 border-b">
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                All accounts
              </div>
            </SelectItem>
            {accounts.map(account => (
              <SelectItem key={account.id} value={account.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    account.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  {account.email}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Compose Button */}
      <div className="p-4">
        <Button 
          className="w-full gap-2 text-base h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-start px-6 border border-primary/20" 
          size="lg"
        >
          <div className="bg-primary/20 rounded-full p-1.5">
            <Pencil className="h-4 w-4" />
          </div>
          <span className="font-medium ml-2">Compose</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Main Folders */}
        <div className="px-3 py-2">
          <nav className="space-y-1">
            {MAIN_FOLDERS.map((folder) => {
              const Icon = folder.icon;
              const isActive = selectedFolder === folder.key;
              const unreadCount = folder.key === "INBOX" 
                ? emailsData?.emails.filter(e => e.labelIds?.includes('UNREAD')).length 
                : undefined;

              return (
                <div key={folder.key}>
                  {folder.key === "INBOX" ? (
                    <button
                      className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg ${
                        isActive 
                          ? "bg-blue-50 text-blue-700 font-medium" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setInboxExpanded(!inboxExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {inboxExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <Icon className={`h-4 w-4 ${isActive ? "text-blue-700" : "text-gray-500"}`} />
                        <span>{folder.label}</span>
                      </div>
                      {unreadCount && (
                        <Badge variant={isActive ? "default" : "secondary"} className="ml-auto">
                          {unreadCount}
                        </Badge>
                      )}
                    </button>
                  ) : (
                    <button
                      className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg ${
                        isActive 
                          ? "bg-blue-50 text-blue-700 font-medium" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setSelectedFolder(folder.key)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? "text-blue-700" : "text-gray-500"}`} />
                        <span>{folder.label}</span>
                      </div>
                      {unreadCount && (
                        <Badge variant={isActive ? "default" : "secondary"} className="ml-auto">
                          {unreadCount}
                        </Badge>
                      )}
                    </button>
                  )}
                  {/* If Inbox is expanded, show categories below */}
                  {folder.key === "INBOX" && inboxExpanded && (
                    <div className="mt-1 space-y-1 pl-7">
                      {CATEGORIES.map((category) => {
                        const isCatActive = selectedCategory === category.key;
                        const unreadCatCount = emailsData?.emails.filter(e => 
                          e.labelIds?.includes(category.key) && 
                          (category.key === 'CATEGORY_PRIMARY' 
                            ? !e.labelIds?.some(l => l.startsWith('CATEGORY_') && l !== 'CATEGORY_PRIMARY')
                            : true) &&
                          e.labelIds?.includes('UNREAD')
                        ).length;
                        return (
                          <button
                            key={category.key}
                            className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-lg ${
                              isCatActive 
                                ? "bg-blue-100 text-blue-800 font-medium" 
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => {
                              setSelectedCategory(category.key);
                              setSelectedFolder('INBOX');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <category.icon className={`h-3.5 w-3.5 ${isCatActive ? "text-blue-800" : "text-gray-500"}`} />
                              <span>{category.label}</span>
                            </div>
                            {unreadCatCount ? (
                              <Badge variant={isCatActive ? "default" : "secondary"} className="ml-auto h-5 min-w-5 flex items-center justify-center">
                                {unreadCatCount}
                              </Badge>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <Separator className="my-2" />

        {/* User Labels */}
        <div className="px-3 py-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLabels(!showLabels);
            }}
            className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-gray-500" />
              <span>Labels</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement create label
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              {showLabels ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </button>
          {showLabels && !isLoadingLabels && (
            <div className="mt-1 space-y-1 pl-7">
              {labels
                .filter(label => label.type === 'user')
                .map((label) => {
                  const isActive = selectedFolder === label.id;
                  const unreadCount = emailsData?.emails.filter(e => 
                    e.labelIds?.includes(label.id) && 
                    e.labelIds?.includes('UNREAD')
                  ).length;

                  return (
                    <button
                      key={label.id}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-lg ${
                        isActive 
                          ? "bg-blue-50 text-blue-700 font-medium" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setSelectedFolder(label.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: label.color?.backgroundColor || '#9CA3AF',
                          }}
                        />
                        <span className="truncate">{label.name}</span>
                      </div>
                      {unreadCount ? (
                        <Badge variant={isActive ? "default" : "secondary"} className="ml-auto h-5 min-w-5 flex items-center justify-center">
                          {unreadCount}
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              {labels.filter(label => label.type === 'user').length === 0 && (
                <p className="text-xs text-gray-500 px-3 py-1.5">
                  No labels created yet
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}