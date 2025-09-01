import {apiRequest} from "./queryClient";

// Re-export apiRequest for direct use
export {
    apiRequest
};

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

export async function syncEmails(userId : number) {
    const response = await apiRequest('POST', '/api/emails/sync', {userId});
    return response.json();
}

export async function sendEmailResponse(emailId : number, customMessage? : string) {
    const response = await apiRequest('POST', `/api/emails/${emailId}/respond`, {customMessage});
    return response.json();
}

export async function createTask(taskData : any) {
    const response = await apiRequest('POST', '/api/tasks', taskData);
    return response.json();
}

export async function updateTaskStatus(taskId : number, status : string) {
    const response = await apiRequest('PATCH', `/api/tasks/${taskId}/status`, {status});
    return response.json();
}

export async function processAllEmails(userId : number) {
    const response = await apiRequest('POST', '/api/chat/process-emails', {userId});
    return response.json();
}

export async function summarizeConversation(emailIds : number[]) {
    const response = await apiRequest('POST', '/api/chat/summarize', {emailIds});
    return response.json();
}

export async function getEmailAnalytics(userId : number): Promise < EmailAnalytics > {
    const response = await apiRequest('GET', `/api/analytics/emails?userId=${userId}`);
    return response.json();
}

export async function getTaskAnalytics(userId : number): Promise < TaskAnalytics > {
    const response = await apiRequest('GET', `/api/analytics/tasks?userId=${userId}`);
    return response.json();
}

export async function connectGmailAccount(userId? : number) {
    const response = await apiRequest('GET', '/api/gmail/auth');
    const data = await response.json();

    // Open OAuth popup with better dimensions and positioning
    const popup = window.open(data.authUrl, 'gmail-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes,left=' + (
        window.screen.width / 2 - 250
    ) + ',top=' + (
        window.screen.height / 2 - 300
    ));

    return new Promise((resolve, reject) => { // Listen for messages from the popup
        const messageListener = (event : MessageEvent) => {
            if (event.origin !== window.location.origin) 
                return;
            


            if (event.data.type === 'oauth_success') {
                window.removeEventListener('message', messageListener);
                if (popup && ! popup.closed) {
                    popup.close();
                }
                resolve(event.data.data);
            } else if (event.data.type === 'oauth_error') {
                window.removeEventListener('message', messageListener);
                if (popup && ! popup.closed) {
                    popup.close();
                }
                reject(new Error(event.data.error || 'OAuth failed'));
            }
        };

        window.addEventListener('message', messageListener);

        // Fallback: check if popup is closed manually
        const checkClosed = setInterval(() => {
            if (popup ?. closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', messageListener);
                resolve(true);
            }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            if (popup && ! popup.closed) {
                popup.close();
            }
            reject(new Error('OAuth timeout'));
        }, 300000);
    });
}
