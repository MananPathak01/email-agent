import { apiRequest } from "./queryClient";

// Re-export apiRequest for direct use
export { apiRequest };

export interface EmailAnalytics {
  totalEmails: number;
  onboardingEmails: number;
  pendingEmails: number;
  processedToday: number;
  averageResponseTime: number;
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completedToday: number;
  averageCompletionTime: number;
}

export async function syncEmails(userId: number) {
  const response = await apiRequest('POST', '/api/emails/sync', { userId });
  return response.json();
}

export async function sendEmailResponse(emailId: number, customMessage?: string) {
  const response = await apiRequest('POST', `/api/emails/${emailId}/respond`, {
    customMessage,
  });
  return response.json();
}

export async function createTask(taskData: any) {
  const response = await apiRequest('POST', '/api/tasks', taskData);
  return response.json();
}

export async function updateTaskStatus(taskId: number, status: string) {
  const response = await apiRequest('PATCH', `/api/tasks/${taskId}/status`, {
    status,
  });
  return response.json();
}

export async function processAllEmails(userId: number) {
  const response = await apiRequest('POST', '/api/chat/process-emails', {
    userId,
  });
  return response.json();
}

export async function summarizeConversation(emailIds: number[]) {
  const response = await apiRequest('POST', '/api/chat/summarize', {
    emailIds,
  });
  return response.json();
}

export async function getEmailAnalytics(userId: number): Promise<EmailAnalytics> {
  const response = await apiRequest('GET', `/api/analytics/emails?userId=${userId}`);
  return response.json();
}

export async function getTaskAnalytics(userId: number): Promise<TaskAnalytics> {
  const response = await apiRequest('GET', `/api/analytics/tasks?userId=${userId}`);
  return response.json();
}

export async function connectGmailAccount(userId: number) {
  const response = await apiRequest('GET', '/api/auth/gmail');
  const data = await response.json();
  
  // Open OAuth popup
  const popup = window.open(
    data.authUrl,
    'gmail-oauth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  );

  return new Promise((resolve, reject) => {
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        resolve(true);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(checkClosed);
      if (popup && !popup.closed) {
        popup.close();
      }
      reject(new Error('OAuth timeout'));
    }, 300000);
  });
}
