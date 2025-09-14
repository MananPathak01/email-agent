import {google} from "googleapis";
import {OAuth2Client} from "google-auth-library";

const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'https://www.mailwise.dev/oauth/callback');

export interface GmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string;
    content: string;
    htmlContent?: string;
    receivedAt: Date;
    snippet: string;
}

export function getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify'];

    return oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes, prompt: 'consent'});
}

export async function getTokensFromCode(code: string) {
    const {tokens} = await oauth2Client.getToken(code);
    return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
    oauth2Client.setCredentials({refresh_token: refreshToken});
    const {credentials} = await oauth2Client.refreshAccessToken();
    return credentials;
}

export class GmailService {
    private gmail : any;
    private oauth2Client: OAuth2Client;

    constructor(accessToken : string, refreshToken : string) {
        this.oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

        this.oauth2Client.setCredentials({access_token: accessToken, refresh_token: refreshToken});

        this.gmail = google.gmail({version: 'v1', auth: this.oauth2Client});
    }

    async getRecentEmails(maxResults : number = 50): Promise < GmailMessage[] > {
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me', maxResults, q: 'is:unread OR newer_than:7d' // Get unread emails or emails from last 7 days
            });

            const messages = response.data.messages || [];
            const emailPromises = messages.map((message : any) => this.getEmailDetails(message.id));

            const emails = await Promise.all(emailPromises);
            return emails.filter(email => email !== null)as GmailMessage[];
        } catch (error) {
            console.error('Error fetching emails:', error);
            throw new Error('Failed to fetch emails from Gmail');
        }
    }

    async getEmailDetails(messageId : string): Promise < GmailMessage | null > {
        try {
            const response = await this.gmail.users.messages.get({userId: 'me', id: messageId, format: 'full'});

            const message = response.data;
            const headers = message.payload.headers;

            const getHeader = (name : string) => {
                const header = headers.find((h : any) => h.name.toLowerCase() === name.toLowerCase());
                return header ? header.value : '';
            };

            // Extract email content
            let content = '';
            let htmlContent = '';

            const extractContent = (payload : any) => {
                if (payload.body && payload.body.data) {
                    const decodedContent = Buffer.from(payload.body.data, 'base64').toString('utf-8');
                    if (payload.mimeType === 'text/plain') {
                        content = decodedContent;
                    } else if (payload.mimeType === 'text/html') {
                        htmlContent = decodedContent;
                    }
                }

                if (payload.parts) {
                    payload.parts.forEach((part : any) => extractContent(part));
                }
            };

            extractContent(message.payload);

            return {
                id: message.id,
                threadId: message.threadId,
                subject: getHeader('Subject'),
                from: getHeader('From'),
                to: getHeader('To'),
                content: content || this.stripHtml(htmlContent) || message.snippet || '',
                htmlContent,
                receivedAt: new Date(parseInt(message.internalDate)),
                snippet: message.snippet || ''
            };
        } catch (error) {
            console.error(`Error fetching email details for ${messageId}:`, error);
            return null;
        }
    }

    async sendEmail(to : string, subject : string, content : string, inReplyTo? : string): Promise < boolean > {
        try {
            const email = [
                `To: ${to}`,
                `Subject: ${subject}`,
                inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
                `Content-Type: text/html; charset="UTF-8"`,
                '',
                content
            ].filter(line => line !== '').join('\n');

            const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

            await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedEmail
                }
            });

            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }
    }

    async markAsRead(messageId : string): Promise < void > {
        try {
            await this.gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    removeLabelIds: ['UNREAD']
                }
            });
        } catch (error) {
            console.error('Error marking email as read:', error);
        }
    }

    private stripHtml(html : string): string {
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    }

    async getUserEmail(): Promise < string > {
        try {
            const response = await this.gmail.users.getProfile({userId: 'me'});
            return response.data.emailAddress;
        } catch (error) {
            console.error('Error getting user email:', error);
            throw new Error('Failed to get user email');
        }
    }
}
