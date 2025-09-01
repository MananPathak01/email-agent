import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  Plus,
  Zap,
  CheckCircle,
  XCircle,
  Edit3,
  Send,
  Paperclip,
  TrendingUp,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGmailEmails, useGmailDraft, GmailEmail } from "@/hooks/useGmailApi";

export default function EmailsPage() {
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const { user } = useAuth();
  const { emails, loading: emailsLoading, error: emailsError, refetch } = useGmailEmails(20, true); // Only new emails for AI processing
  const { draft, loading: draftLoading, approveDraft, rejectDraft } = useGmailDraft(selectedEmail?.id || null);

  const handleEmailSelect = (email: GmailEmail) => {
    setSelectedEmail(email);
  };

  const handleApproveDraft = async () => {
    try {
      await approveDraft();
      setSelectedEmail(null);
    } catch (error) {
      console.error('Failed to approve draft:', error);
    }
  };

  const handleRejectDraft = async () => {
    try {
      await rejectDraft("User rejected draft");
      setSelectedEmail(null);
    } catch (error) {
      console.error('Failed to reject draft:', error);
    }
  };

  const handleEditDraft = () => {
    if (draft) {
      setDraftContent(draft.content);
      setEditingDraft(true);
    }
  };

  const handleSaveDraft = async () => {
    // This would need to be implemented in the API
    setEditingDraft(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft_ready': return 'bg-green-100 text-green-800';
      case 'unread': return 'bg-blue-100 text-blue-800';
      case 'responded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (emailsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Gmail emails...</p>
          </div>
        </div>
      </div>
    );
  }

  if (emailsError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading emails</h3>
            <p className="text-gray-600 mb-4">{emailsError}</p>
            <Button onClick={refetch}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Email List */}
      <div className="w-1/3 bg-white border-r border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Gmail Emails</h1>
              <p className="text-sm text-gray-600 mt-1">
                {emails.length} emails loaded
              </p>
            </div>
            <Button onClick={refetch} variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {emails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                <p className="text-gray-500">Your Gmail emails will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailSelect(email)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedEmail?.id === email.id 
                        ? 'bg-blue-50 border-blue-200 border' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {email.subject || '(No Subject)'}
                      </h3>
                      <div className="flex items-center gap-1 ml-2">
                        {email.hasDraft && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="AI Draft Ready" />
                        )}
                        {email.labels.includes('UNREAD') && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">From: {email.from}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{email.snippet}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                      {email.analysis && (
                        <Badge variant="outline" className={getUrgencyColor(email.analysis.urgency)}>
                          {email.analysis.urgency}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Email Detail View */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <>
            {/* Email Header */}
            <div className="border-b border-gray-200 p-6 bg-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedEmail.subject || '(No Subject)'}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>From: {selectedEmail.from}</span>
                    <span>To: {selectedEmail.to}</span>
                    <span>{new Date(selectedEmail.date).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEmail.analysis && (
                    <>
                      <Badge variant="outline" className={getUrgencyColor(selectedEmail.analysis.urgency)}>
                        {selectedEmail.analysis.urgency}
                      </Badge>
                      <Badge variant="outline">
                        {selectedEmail.analysis.intent}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Email Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      {selectedEmail.body ? (
                        <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                      ) : (
                        <p className="text-gray-600">{selectedEmail.snippet}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Analysis */}
                {selectedEmail.analysis && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        AI Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Intent:</span>
                          <p className="text-sm text-gray-600">{selectedEmail.analysis.intent}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Sentiment:</span>
                          <p className="text-sm text-gray-600">{selectedEmail.analysis.sentiment}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Requires Response:</span>
                          <p className="text-sm text-gray-600">
                            {selectedEmail.analysis.requiresResponse ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Confidence:</span>
                          <p className="text-sm text-gray-600">
                            {Math.round(selectedEmail.analysis.confidence * 100)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Draft */}
                {draft && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-blue-500" />
                        AI Generated Draft
                        <Badge variant="outline" className="ml-2">
                          {Math.round(draft.confidence * 100)}% confidence
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {draft.reasoning}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {editingDraft ? (
                        <div className="space-y-4">
                          <Textarea
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            rows={8}
                            className="w-full"
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleSaveDraft}>
                              <Send className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                            <Button variant="outline" onClick={() => setEditingDraft(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="prose max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: draft.content.replace(/\n/g, '<br>') }} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleApproveDraft} className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve & Send
                            </Button>
                            <Button variant="outline" onClick={handleEditDraft}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Draft
                            </Button>
                            <Button variant="outline" onClick={handleRejectDraft}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {draftLoading && (
                  <Card className="mt-4">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                        <span className="text-gray-600">Loading AI draft...</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an email</h3>
              <p className="text-gray-600">Choose an email from the list to view details and AI analysis</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}