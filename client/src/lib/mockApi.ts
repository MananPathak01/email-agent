import { mockData } from '../data/mockData';
import {
  User,
  ConnectedAccount,
  EmailThread,
  DraftResponse,
  WorkflowTemplate,
  ChatMessage,
  AnalyticsData,
  ApiResponse,
  PaginatedResponse,
  ProcessingJob,
  SystemStatus
} from '../types';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export const mockApi = {
  // User and Account Management
  async getUser(): Promise<ApiResponse<User>> {
    await delay(300);
    return {
      success: true,
      data: { ...mockData.user, connectedAccounts: mockData.connectedAccounts }
    };
  },

  async getConnectedAccounts(): Promise<ApiResponse<ConnectedAccount[]>> {
    await delay(200);
    return {
      success: true,
      data: mockData.connectedAccounts
    };
  },

  async connectAccount(provider: 'gmail' | 'outlook'): Promise<ApiResponse<{ authUrl: string }>> {
    await delay(500);
    return {
      success: true,
      data: {
        authUrl: `https://accounts.${provider}.com/oauth/authorize?client_id=mock&redirect_uri=mock`
      }
    };
  },

  async disconnectAccount(accountId: string): Promise<ApiResponse<void>> {
    await delay(400);
    return {
      success: true,
      message: 'Account disconnected successfully'
    };
  },

  // Email and Thread Management
  async getEmailThreads(page = 1, pageSize = 10): Promise<ApiResponse<PaginatedResponse<EmailThread>>> {
    await delay(400);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedThreads = mockData.emailThreads.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        items: paginatedThreads,
        total: mockData.emailThreads.length,
        page,
        pageSize,
        hasMore: endIndex < mockData.emailThreads.length
      }
    };
  },

  async getEmailThread(threadId: string): Promise<ApiResponse<EmailThread>> {
    await delay(300);
    const thread = mockData.emailThreads.find(t => t.id === threadId);
    
    if (!thread) {
      return {
        success: false,
        error: 'Thread not found'
      };
    }

    return {
      success: true,
      data: thread
    };
  },

  // Draft Management
  async getDraftResponse(emailId: string): Promise<ApiResponse<DraftResponse>> {
    await delay(250);
    const draft = mockData.draftResponses.find(d => d.emailId === emailId);
    
    if (!draft) {
      return {
        success: false,
        error: 'Draft not found'
      };
    }

    return {
      success: true,
      data: draft
    };
  },

  async approveDraft(draftId: string): Promise<ApiResponse<void>> {
    await delay(600);
    return {
      success: true,
      message: 'Draft approved and sent successfully'
    };
  },

  async rejectDraft(draftId: string, feedback?: string): Promise<ApiResponse<void>> {
    await delay(400);
    return {
      success: true,
      message: 'Draft rejected. AI will learn from this feedback.'
    };
  },

  async updateDraft(draftId: string, content: string): Promise<ApiResponse<DraftResponse>> {
    await delay(500);
    const draft = mockData.draftResponses.find(d => d.id === draftId);
    
    if (!draft) {
      return {
        success: false,
        error: 'Draft not found'
      };
    }

    const updatedDraft = {
      ...draft,
      content,
      status: 'edited' as const,
      confidence: Math.max(0.6, draft.confidence - 0.1) // Slightly lower confidence for edited drafts
    };

    return {
      success: true,
      data: updatedDraft
    };
  },

  // Workflow Management
  async getWorkflowTemplates(): Promise<ApiResponse<WorkflowTemplate[]>> {
    await delay(350);
    return {
      success: true,
      data: mockData.workflowTemplates
    };
  },

  async getWorkflowTemplate(workflowId: string): Promise<ApiResponse<WorkflowTemplate>> {
    await delay(200);
    const workflow = mockData.workflowTemplates.find(w => w.id === workflowId);
    
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }

    return {
      success: true,
      data: workflow
    };
  },

  async updateWorkflowTemplate(workflowId: string, updates: Partial<WorkflowTemplate>): Promise<ApiResponse<WorkflowTemplate>> {
    await delay(600);
    const workflow = mockData.workflowTemplates.find(w => w.id === workflowId);
    
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }

    const updatedWorkflow = { ...workflow, ...updates };
    return {
      success: true,
      data: updatedWorkflow
    };
  },

  async createWorkflowTemplate(workflow: Omit<WorkflowTemplate, 'id' | 'usageCount' | 'lastUsed'>): Promise<ApiResponse<WorkflowTemplate>> {
    await delay(800);
    const newWorkflow: WorkflowTemplate = {
      ...workflow,
      id: `workflow_${Date.now()}`,
      usageCount: 0,
      lastUsed: undefined
    };

    return {
      success: true,
      data: newWorkflow
    };
  },

  async deleteWorkflowTemplate(workflowId: string): Promise<ApiResponse<void>> {
    await delay(400);
    return {
      success: true,
      message: 'Workflow deleted successfully'
    };
  },

  // Chat Interface
  async getChatHistory(): Promise<ApiResponse<ChatMessage[]>> {
    await delay(200);
    return {
      success: true,
      data: mockData.chatMessages
    };
  },

  async sendChatMessage(message: string): Promise<ApiResponse<ChatMessage>> {
    await delay(1200); // Simulate AI processing time
    
    // Simple mock responses based on message content
    let responseContent = "I understand your request. Let me help you with that.";
    let actions: any[] = [];

    if (message.toLowerCase().includes('email') && message.toLowerCase().includes('pattern')) {
      responseContent = `Based on your recent email activity, I can see you have strong patterns in client onboarding and technical support responses. Your AI acceptance rate is 82% with an average confidence score of 0.84.

Would you like me to show you specific insights about any particular workflow?`;
      actions = [
        {
          type: 'view_email',
          label: 'View Email Patterns',
          data: { category: 'all' }
        }
      ];
    } else if (message.toLowerCase().includes('workflow')) {
      responseContent = `I can help you manage your workflows. You currently have 3 active workflows with success rates ranging from 75% to 91%. 

What would you like to do with your workflows?`;
      actions = [
        {
          type: 'edit_workflow',
          label: 'Edit Workflows',
          data: {}
        }
      ];
    } else if (message.toLowerCase().includes('analytics') || message.toLowerCase().includes('report')) {
      responseContent = `Here's a quick summary of your email performance:

📊 This week: 47 emails processed, 8 drafts generated, 6 accepted
⏱️ Time saved: 2.3 hours
📈 AI accuracy improving by 15% over last month

Would you like a detailed report?`;
      actions = [
        {
          type: 'generate_report',
          label: 'Generate Full Report',
          data: { timeframe: 'week' }
        }
      ];
    }

    const assistantMessage: ChatMessage = {
      id: `chat_${Date.now()}`,
      type: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      actions: actions.length > 0 ? actions : undefined
    };

    return {
      success: true,
      data: assistantMessage
    };
  },

  // Analytics
  async getAnalytics(timeframe: 'day' | 'week' | 'month' | 'quarter' = 'week'): Promise<ApiResponse<AnalyticsData>> {
    await delay(500);
    return {
      success: true,
      data: { ...mockData.analyticsData, timeframe }
    };
  },

  // System Status
  async getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
    await delay(100);
    return {
      success: true,
      data: {
        ...mockData.systemStatus,
        lastUpdated: new Date() // Always current time
      }
    };
  },

  async getProcessingJobs(): Promise<ApiResponse<ProcessingJob[]>> {
    await delay(200);
    return {
      success: true,
      data: mockData.processingJobs
    };
  },

  // Learning and Feedback
  async submitFeedback(draftId: string, rating: number, feedback?: string): Promise<ApiResponse<void>> {
    await delay(300);
    return {
      success: true,
      message: 'Thank you for your feedback! This will help improve AI responses.'
    };
  },

  async triggerLearning(accountId: string): Promise<ApiResponse<void>> {
    await delay(2000); // Simulate learning process
    return {
      success: true,
      message: 'Learning process initiated. This may take a few minutes to complete.'
    };
  }
};

// WebSocket simulation for real-time updates
export class MockWebSocket {
  private listeners: { [event: string]: Function[] } = {};
  private isConnected = false;

  connect() {
    setTimeout(() => {
      this.isConnected = true;
      this.emit('connected', { status: 'connected' });
      
      // Simulate periodic updates
      this.startPeriodicUpdates();
    }, 1000);
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  private startPeriodicUpdates() {
    // Simulate new email notifications
    setInterval(() => {
      if (this.isConnected && Math.random() > 0.8) {
        this.emit('email_received', {
          type: 'email_received',
          data: {
            id: `email_${Date.now()}`,
            from: 'new.sender@example.com',
            subject: 'New Email Received',
            requiresResponse: true
          },
          timestamp: new Date()
        });
      }
    }, 30000); // Every 30 seconds

    // Simulate draft generation updates
    setInterval(() => {
      if (this.isConnected && Math.random() > 0.9) {
        this.emit('draft_generated', {
          type: 'draft_generated',
          data: {
            emailId: `email_${Date.now()}`,
            confidence: 0.85,
            workflowUsed: 'client_onboarding'
          },
          timestamp: new Date()
        });
      }
    }, 45000); // Every 45 seconds
  }

  disconnect() {
    this.isConnected = false;
    this.emit('disconnected', { status: 'disconnected' });
  }
}

export const mockWebSocket = new MockWebSocket();