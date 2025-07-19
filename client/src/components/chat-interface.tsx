import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  ArrowRight
} from "lucide-react";
import EmailCard from "@/components/email-card";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  userId: number;
}

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  emails?: any[];
  generatedResponse?: {
    to: string;
    subject: string;
    content: string;
    originalEmailId: number;
  };
}

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch emails
  const { data: emails = [], isLoading: emailsLoading } = useQuery({
    queryKey: ['/api/emails'],
    queryFn: async () => {
      const response = await fetch(`/api/emails?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch emails');
      return response.json();
    }
  });

  // Email sync mutation
  const syncEmailsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to sync emails');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      if (data.processedCount > 0) {
        addAIMessage(
          `I've analyzed ${data.processedCount} new emails and found ${data.emails.filter((e: any) => e.isOnboardingRelated).length} onboarding-related messages.`,
          data.emails.filter((e: any) => e.isOnboardingRelated)
        );
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync emails",
        variant: "destructive",
      });
    }
  });

  // Send email response mutation
  const sendResponseMutation = useMutation({
    mutationFn: async ({ emailId, customMessage }: { emailId: number; customMessage?: string }) => {
      const response = await fetch(`/api/emails/${emailId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customMessage })
      });
      if (!response.ok) throw new Error('Failed to send response');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      toast({
        title: "Success",
        description: "Email sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    }
  });

  // Process all emails mutation
  const processAllEmailsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/chat/process-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to process emails');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      addAIMessage(`I've processed ${data.processedCount} emails and generated appropriate responses.`);
    }
  });

  const addAIMessage = (content: string, emails?: any[], generatedResponse?: any) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'ai',
      content,
      timestamp: new Date(),
      emails,
      generatedResponse
    }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    addUserMessage(userMessage);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      setIsTyping(false);
      
      // Handle different types of user queries
      if (userMessage.toLowerCase().includes('sync') || userMessage.toLowerCase().includes('check emails')) {
        syncEmailsMutation.mutate();
      } else if (userMessage.toLowerCase().includes('process all')) {
        processAllEmailsMutation.mutate();
      } else {
        addAIMessage("I understand you want to manage your emails. I can help you sync emails, process onboarding requests, or generate responses. What would you like me to do?");
      }
    }, 1000);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'process_all':
        processAllEmailsMutation.mutate();
        break;
      case 'sync_emails':
        syncEmailsMutation.mutate();
        break;
      default:
        addAIMessage(`I'll help you with ${action}. What specific action would you like me to take?`);
    }
  };

  const handleEmailAction = (emailId: number, action: string) => {
    if (action === 'reply') {
      sendResponseMutation.mutate({ emailId });
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial AI welcome message
  useEffect(() => {
    if (messages.length === 0 && !emailsLoading) {
      const onboardingEmails = emails.filter((email: any) => email.isOnboardingRelated && email.status === 'pending');
      
      if (onboardingEmails.length > 0) {
        addAIMessage(
          `Hi! I've analyzed your recent emails and found ${onboardingEmails.length} onboarding-related messages that need attention. Here's what I can help you with:`,
          onboardingEmails
        );
      } else {
        addAIMessage("Hi! I'm here to help you manage your onboarding emails. You can ask me to sync emails, process requests, or generate responses.");
      }
    }
  }, [emails, emailsLoading]);

  const pendingOnboardingEmails = emails.filter((email: any) => 
    email.isOnboardingRelated && email.status === 'pending'
  );

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* AI Suggestions Bar */}
      {pendingOnboardingEmails.length > 0 && (
        <div className="gradient-primary text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium">AI Insights</h3>
                <p className="text-sm opacity-90">
                  You have {pendingOnboardingEmails.length} onboarding emails waiting for response
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => handleQuickAction('process_all')}
              disabled={processAllEmailsMutation.isPending}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-0"
            >
              {processAllEmailsMutation.isPending ? 'Processing...' : 'Process All'}
            </Button>
          </div>
        </div>
      )}

      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="chat-message">
              {message.type === 'ai' ? (
                <div className="flex items-start space-x-4">
                  <Avatar className="h-8 w-8 bg-secondary">
                    <AvatarFallback>
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900 mb-3">{message.content}</p>
                      
                      {/* Email Cards */}
                      {message.emails && message.emails.length > 0 && (
                        <div className="space-y-3 mt-4">
                          {message.emails.map((email: any) => (
                            <EmailCard 
                              key={email.id} 
                              email={email} 
                              onAction={(action) => handleEmailAction(email.id, action)}
                              isLoading={sendResponseMutation.isPending}
                            />
                          ))}
                        </div>
                      )}

                      {/* Generated Email Response */}
                      {message.generatedResponse && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-3">
                          <div className="border-b border-gray-100 pb-3 mb-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-900">
                                To: <span className="font-normal">{message.generatedResponse.to}</span>
                              </span>
                              <Badge variant="secondary">Draft</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Subject: {message.generatedResponse.subject}
                            </p>
                          </div>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: message.generatedResponse.content }}
                          />
                          
                          <div className="flex items-center space-x-3 mt-4">
                            <Button 
                              size="sm"
                              onClick={() => sendResponseMutation.mutate({ 
                                emailId: message.generatedResponse!.originalEmailId 
                              })}
                              disabled={sendResponseMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {sendResponseMutation.isPending ? 'Sending...' : 'Send Email'}
                            </Button>
                            <Button variant="outline" size="sm">
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Edit Draft
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-4 flex-row-reverse">
                  <Avatar className="h-8 w-8 bg-primary">
                    <AvatarFallback className="text-white">JA</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-primary text-white rounded-lg p-4 max-w-md ml-auto">
                      <p>{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-4">
              <Avatar className="h-8 w-8 bg-secondary">
                <AvatarFallback>
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Ask me to process emails, create tasks, or draft responses..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="pr-12"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-primary hover:text-primary-dark"
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm">
            <Mic className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-2 mt-3">
          <span className="text-xs text-gray-500">Quick actions:</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQuickAction('process_all')}
            disabled={processAllEmailsMutation.isPending}
          >
            <Wand2 className="h-3 w-3 mr-1" />
            Process All Emails
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQuickAction('sync_emails')}
            disabled={syncEmailsMutation.isPending}
          >
            <Mail className="h-3 w-3 mr-1" />
            Sync Emails
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-3 w-3 mr-1" />
            Show Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
