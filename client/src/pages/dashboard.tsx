import { useState } from "react";
import Sidebar from "@/components/sidebar";
import ChatInterface from "@/components/chat-interface";
import TaskPanel from "@/components/task-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, Search, Mail, Plus, CheckCircle, Clock, AlertCircle, TrendingUp, Users, Zap } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectedAccounts, useEmailThreads, useAnalytics } from "@/hooks/useMockApi";
import { connectGmailAccount } from "@/lib/api";
import { getAuth } from "firebase/auth";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isConnected } = useWebSocket();
  const { user: authUser, loading: authLoading } = useAuth();
  const { accounts, loading: accountsLoading, connectAccount } = useConnectedAccounts();
  const { threads, loading: threadsLoading } = useEmailThreads(1, 5);
  const { analytics, loading: analyticsLoading } = useAnalytics('week');
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

  const handleConnectAccount = async (provider: 'gmail' | 'outlook') => {
    if (provider === 'gmail') {
      try {
        await connectGmailAccount(); // Will use authenticated user
        // Refresh the page after successful connection
        window.location.reload();
      } catch (error) {
        console.error('Failed to connect Gmail:', error);
      }
    } else {
      await connectAccount(provider);
    }
  };

  const getProviderIcon = (provider: 'gmail' | 'outlook') => {
    return provider === 'gmail' ? '📧' : '📮';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'learning': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {authUser.displayName || 'User'}</h1>
                <Button onClick={() => handleConnectAccount('gmail')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Connect Email Account
                </Button>
              </div>

              {/* Quick Stats */}
              {analytics && !analyticsLoading && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Emails This Week</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.emailMetrics.totalEmails}</p>
                        </div>
                        <Mail className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">AI Drafts Generated</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.aiPerformance.draftsGenerated}</p>
                        </div>
                        <Zap className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Time Saved</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.aiPerformance.timeSaved}h</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">AI Accuracy</p>
                          <p className="text-2xl font-bold text-gray-900">{Math.round(analytics.aiPerformance.averageConfidence * 100)}%</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Connected Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Connected Email Accounts
                  </CardTitle>
                  <CardDescription>
                    Manage your connected email accounts and their AI learning status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
                      <p className="text-gray-600 mb-4">Connect your Gmail or Outlook account to get started with AI email assistance.</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => handleConnectAccount('gmail')} variant="outline">
                          📧 Connect Gmail
                        </Button>
                        <Button onClick={() => handleConnectAccount('outlook')} variant="outline">
                          📮 Connect Outlook
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {accounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">{getProviderIcon(account.provider)}</div>
                            <div>
                              <h4 className="font-medium text-gray-900">{account.displayName}</h4>
                              <p className="text-sm text-gray-600">{account.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getStatusColor(account.learningStatus)}>
                                  {account.learningStatus === 'complete' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {account.learningStatus === 'learning' && <Clock className="h-3 w-3 mr-1" />}
                                  {account.learningStatus === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                                  {account.learningStatus.charAt(0).toUpperCase() + account.learningStatus.slice(1)}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {account.emailCount.toLocaleString()} emails
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">AI Performance</div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">
                                  {account.processingStats.draftsGenerated}
                                </div>
                                <div className="text-xs text-gray-500">Drafts</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-green-600">
                                  {account.processingStats.draftsAccepted}
                                </div>
                                <div className="text-xs text-gray-500">Accepted</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-600">
                                  {Math.round(account.processingStats.averageConfidence * 100)}%
                                </div>
                                <div className="text-xs text-gray-500">Accuracy</div>
                              </div>
                            </div>
                            
                            {account.learningStatus === 'learning' && (
                              <div className="mt-2">
                                <Progress value={65} className="w-24" />
                                <div className="text-xs text-gray-500 mt-1">Learning in progress...</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-2 pt-4 border-t">
                        <Button onClick={() => handleConnectAccount('gmail')} variant="outline" size="sm">
                          📧 Add Gmail
                        </Button>
                        <Button onClick={() => handleConnectAccount('outlook')} variant="outline" size="sm">
                          📮 Add Outlook
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent AI Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Recent AI Activity
                  </CardTitle>
                  <CardDescription>
                    Latest AI-generated drafts and email processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {threadsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No AI activity yet</h3>
                      <p className="text-gray-600 mb-4">Connect your email accounts to start seeing AI-generated drafts.</p>
                      <Button onClick={() => handleConnectAccount('gmail')} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Connect Email Account
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {threads.map((thread) => (
                        <div key={thread.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              thread.status === 'draft_ready' ? 'bg-green-500' :
                              thread.status === 'unread' ? 'bg-blue-500' :
                              thread.status === 'responded' ? 'bg-gray-400' : 'bg-yellow-500'
                            }`} />
                            <div>
                              <h4 className="font-medium text-gray-900">{thread.subject}</h4>
                              <p className="text-sm text-gray-600">
                                From: {thread.participants.filter(p => p !== authUser.email).join(', ')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {thread.hasAIDraft && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <Zap className="h-3 w-3 mr-1" />
                                Draft Created
                              </Badge>
                            )}
                            {thread.workflowDetected && (
                              <Badge variant="outline">
                                {thread.workflowDetected.replace('_', ' ')}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(thread.lastActivity).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-4 border-t">
                        <p className="text-sm text-gray-600 text-center">
                          AI drafts are automatically saved to your email provider's draft folder.
                          <br />
                          Check your Gmail or Outlook drafts to review and send.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
