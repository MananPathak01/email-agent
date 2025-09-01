import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';

export interface WebSocketMessage {
  type: 'email_received' | 'draft_generated' | 'workflow_detected' | 'processing_status' | 'learning_updated';
  data: any;
  timestamp: Date;
  userId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, request) => {
      const { query } = parse(request.url || '', true);
      const userId = query.userId as string;

      if (!userId) {
        ws.close(1008, 'User ID required');
        return;
      }

      // Add client to user's connection set
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(ws);

      console.log(`WebSocket client connected for user ${userId}`);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'processing_status',
        data: { status: 'connected', message: 'WebSocket connection established' },
        timestamp: new Date()
      });

      // Handle client disconnect
      ws.on('close', () => {
        const userClients = this.clients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            this.clients.delete(userId);
          }
        }
        console.log(`WebSocket client disconnected for user ${userId}`);
      });

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(userId, message, ws);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
      });
    });

    console.log('WebSocket server initialized');
  }

  private handleClientMessage(userId: string, message: any, ws: WebSocket) {
    // Handle different types of client messages
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, {
          type: 'processing_status',
          data: { status: 'pong' },
          timestamp: new Date()
        });
        break;
      
      case 'subscribe':
        // Client wants to subscribe to specific events
        console.log(`User ${userId} subscribed to events:`, message.events);
        break;
      
      default:
        console.log(`Unknown message type from user ${userId}:`, message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Public methods for sending messages to users
  sendToUser(userId: string, message: Omit<WebSocketMessage, 'timestamp'>) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      return; // User not connected
    }

    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date(),
      userId
    };

    userClients.forEach(ws => {
      this.sendToClient(ws, fullMessage);
    });
  }

  broadcast(message: Omit<WebSocketMessage, 'timestamp'>) {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date()
    };

    this.clients.forEach((userClients) => {
      userClients.forEach(ws => {
        this.sendToClient(ws, fullMessage);
      });
    });
  }

  // Notify about new email received
  notifyEmailReceived(userId: string, emailData: any) {
    this.sendToUser(userId, {
      type: 'email_received',
      data: {
        id: emailData.id,
        from: emailData.from,
        subject: emailData.subject,
        provider: emailData.provider,
        requiresResponse: emailData.requiresResponse
      }
    });
  }

  // Notify about draft generated
  notifyDraftGenerated(userId: string, emailId: string, draftData: any) {
    this.sendToUser(userId, {
      type: 'draft_generated',
      data: {
        emailId,
        confidence: draftData.confidence,
        workflowUsed: draftData.workflowUsed,
        estimatedTimeToWrite: draftData.estimatedTimeToWrite
      }
    });
  }

  // Notify about workflow detected
  notifyWorkflowDetected(userId: string, emailId: string, workflowName: string) {
    this.sendToUser(userId, {
      type: 'workflow_detected',
      data: {
        emailId,
        workflowName,
        message: `Detected ${workflowName} workflow pattern`
      }
    });
  }

  // Notify about processing status
  notifyProcessingStatus(userId: string, status: any) {
    this.sendToUser(userId, {
      type: 'processing_status',
      data: status
    });
  }

  // Notify about learning updates
  notifyLearningUpdated(userId: string, learningData: any) {
    this.sendToUser(userId, {
      type: 'learning_updated',
      data: learningData
    });
  }

  // Get connection stats
  getStats() {
    const totalConnections = Array.from(this.clients.values())
      .reduce((sum, userClients) => sum + userClients.size, 0);
    
    return {
      totalUsers: this.clients.size,
      totalConnections,
      userConnections: Array.from(this.clients.entries()).map(([userId, clients]) => ({
        userId,
        connections: clients.size
      }))
    };
  }

  // Close all connections
  close() {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      console.log('WebSocket server closed');
    }
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();