import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/sidebar";
import { 
  Bot, 
  Send, 
  Mic, 
  Wand2, 
  CheckSquare, 
  BarChart3,
  Mail,
  Calendar,
  Check,
  Clock,
  ArrowRight,
  MessageCircle,
  Zap,
  TrendingUp,
  Users,
  FileText,
  Settings,
  Eye,
  Edit3,
  Workflow
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, useAnalytics, useEmailThreads, useWorkflowTemplates } from "@/hooks/useMockApi";
import { ChatMessage, ChatAction } from "@/types";

export default function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { messages, loading, sending, error, sendMessage } = useChat();
  const { analytics } = useAnalytics('week');
  const { threads } = useEmailThreads(1, 5);
  const { workflows } = useWorkflowTemplates();

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    await sendMessage(userMessage);
  };

  const handleQuickAction = async (action: string) => {
    const actionMessages = {
      'email_patterns': 'Show me my email patterns from this week',
      'workflow_performance': 'How are my workflows performing?',
      'time_saved': 'How much time has AI saved me?',
      'recent_activity': 'What\'s my recent email activity?',
      'improve_workflows': 'How can I improve my workflows?',
      'analytics_summary': 'Give me an analytics summary'
    };

    const message = actionMessages[action as keyof typeof actionMessages] || action;
    await sendMessage(message);
  };

  const handleChatAction = (action: ChatAction) => {
    switch (action.type) {
      case 'view_email':
        // Suggest user to check their Gmail/Outlook drafts
        sendMessage("You can find your AI-generated drafts in your Gmail or Outlook draft folder. The AI automatically saves responses there for you to review and send.");
        break;
      case 'edit_workflow':
        // In a real app, this would open workflow editing in the chat
        sendMessage("I can help you customize your email workflows. What specific changes would you like to make to how I handle your emails?");
        break;
      case 'generate_report':
        // In a real app, this would generate and download a report
        sendMessage("I'll generate a detailed report for you. This would include your email patterns, time saved, and AI performance metrics.");
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getQuickInsights = () => {
    if (!analytics) return null;

    return {
      emailsThisWeek: analytics.emailMetrics.totalEmails,
      draftsGenerated: analytics.aiPerformance.draftsGenerated,
      timeSaved: analytics.aiPerformance.timeSaved,
      accuracy: Math.round(analytics.aiPerformance.averageConfidence * 100),
      activeWorkflows: workflows.filter(w => w.isActive).length,
      pendingEmails: threads.filter(t => t.status === 'unread' || t.status === 'draft_ready').length
    };
  };

  const insights = getQuickInsights();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
                <p className="text-sm text-gray-600">Ask me about your email patterns and workflows</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Online</span>
            </div>
          </div>
        </div>

        {/* Quick Insights Bar */}
        {insights && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-4">
            <div className="grid grid-cols-6 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">{insights.emailsThisWeek}</div>
                <div className="text-xs text-gray-600">Emails This Week</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">{insights.draftsGenerated}</div>
                <div className="text-xs text-gray-600">AI Drafts</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">{insights.timeSaved}h</div>
                <div className="text-xs text-gray-600">Time Saved</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-600">{insights.accuracy}%</div>
                <div className="text-xs text-gray-600">AI Accuracy</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-orange-600">{insights.activeWorkflows}</div>
                <div className="text-xs text-gray-600">Active Workflows</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">{insights.pendingEmails}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to your AI Email Assistant!</h3>
                <p className="text-gray-600 mb-6">I can help you understand your email patterns, manage workflows, and optimize your communication.</p>
                
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => handleQuickAction('email_patterns')}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Email Patterns
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleQuickAction('workflow_performance')}
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Workflow Performance
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleQuickAction('time_saved')}
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Time Saved
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleQuickAction('recent_activity')}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Recent Activity
                  </Button>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="chat-message">
                  {message.type === 'assistant' ? (
                    <div className="flex items-start gap-4">
                      <Avatar className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600">
                        <AvatarFallback>
                          <Bot className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-3xl">
                        <Card>
                          <CardContent className="p-4">
                            <div className="prose prose-sm max-w-none">
                              <div className="whitespace-pre-wrap text-gray-700">
                                {message.content}
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            {message.actions && message.actions.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                                {message.actions.map((action, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleChatAction(action)}
                                    className="flex items-center gap-2"
                                  >
                                    {action.type === 'view_email' && <Eye className="h-3 w-3" />}
                                    {action.type === 'edit_workflow' && <Edit3 className="h-3 w-3" />}
                                    {action.type === 'generate_report' && <FileText className="h-3 w-3" />}
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 flex-row-reverse">
                      <Avatar className="h-8 w-8 bg-blue-600">
                        <AvatarFallback className="text-white">
                          {user?.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-2xl">
                        <div className="bg-blue-600 text-white rounded-lg p-4 ml-auto">
                          <p>{message.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-right">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {sending && (
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600">
                  <AvatarFallback>
                    <Bot className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Ask me about your email patterns, workflows, or performance..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="pr-12"
                  disabled={sending}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" disabled>
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Quick actions:</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickAction('email_patterns')}
                disabled={sending}
                className="flex items-center gap-1"
              >
                <BarChart3 className="h-3 w-3" />
                Email Patterns
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickAction('workflow_performance')}
                disabled={sending}
                className="flex items-center gap-1"
              >
                <Workflow className="h-3 w-3" />
                Workflows
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickAction('analytics_summary')}
                disabled={sending}
                className="flex items-center gap-1"
              >
                <TrendingUp className="h-3 w-3" />
                Analytics
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickAction('improve_workflows')}
                disabled={sending}
                className="flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                Improve
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}