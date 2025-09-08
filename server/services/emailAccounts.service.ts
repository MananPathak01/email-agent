import { Timestamp, DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { encrypt, decrypt } from '../utils/crypto.js';

class EmailAccountError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'EmailAccountError';
    }
}

interface EmailAccount extends DocumentData {
    userId: string;
    email: string;
    provider: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Timestamp;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastConnectedAt: Timestamp;
    autoDraftEnabled?: boolean;
    autoDraftSettings?: {
        tone?: 'professional' | 'casual' | 'friendly' | 'formal';
        customInstructions?: string;
    };
}

const db = adminDb;

const getAccountsCollection = (userId: string) =>
    db.collection('users').doc(userId).collection('email_accounts');

export class EmailAccountsService {
    /**
     * Add a new email account for a user (subcollection)
     */
    async addEmailAccount(
        userId: string,
        accountData: Omit<EmailAccount, 'userId' | 'createdAt' | 'updatedAt'>
    ) {
        try {
            const accountRef = await getAccountsCollection(userId).add({
                ...accountData,
                accessToken: encrypt(accountData.accessToken),
                refreshToken: encrypt(accountData.refreshToken),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                lastConnectedAt: Timestamp.now(),
                isActive: true
            });
            return {
                id: accountRef.id,
                ...accountData
            };
        } catch (error) {
            console.error('Error adding email account:', error);
            throw new EmailAccountError('Failed to add email account');
        }
    }

    /**
     * List all email accounts for a user (subcollection)
     */
    async listEmailAccounts(userId: string): Promise<Array<EmailAccount & { id: string }>> {
        if (!userId) {
            throw new EmailAccountError('User ID is required', 'auth/user-id-required');
        }
        try {
            const snapshot = await getAccountsCollection(userId).get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as EmailAccount & { id: string }));
        } catch (error: any) {
            console.error('Error listing email accounts:', {
                error: error.message,
                code: error.code,
                stack: error.stack,
                userId
            });
            if (error && typeof error === 'object' && 'code' in error) {
                throw new EmailAccountError(
                    `Database error: ${error.message}`,
                    `firestore/${error.code}`
                );
            }
            throw new EmailAccountError(
                error.message || 'Failed to list email accounts',
                'unknown-error'
            );
        }
    }

    /**
     * Get a single email account by ID (subcollection)
     */
    async getEmailAccount(accountId: string, userId: string): Promise<(EmailAccount & { id: string }) | null> {
        try {
            const accountRef = getAccountsCollection(userId).doc(accountId);
            const doc = await accountRef.get();

            if (!doc.exists) {
                return null;
            }

            return {
                id: doc.id,
                ...doc.data()
            } as EmailAccount & { id: string };
        } catch (error: any) {
            console.error('Error getting email account:', error);
            throw new EmailAccountError('Failed to get email account');
        }
    }

    /**
     * Update an email account
     */
    async updateEmailAccount(
        accountId: string,
        userId: string,
        updates: Partial<EmailAccount>
    ) {
        try {
            const accountRef = getAccountsCollection(userId).doc(accountId);

            // Encrypt tokens if they're being updated
            const updateData: any = {
                ...updates,
                updatedAt: Timestamp.now()
            };

            if (updates.accessToken) {
                updateData.accessToken = encrypt(updates.accessToken);
            }
            if (updates.refreshToken) {
                updateData.refreshToken = encrypt(updates.refreshToken);
            }

            await accountRef.update(updateData);
            return { success: true };
        } catch (error: any) {
            console.error('Error updating email account:', error);
            throw new EmailAccountError('Failed to update email account');
        }
    }

    /**
     * Delete an email account
     */
    async deleteEmailAccount(accountId: string, userId: string) {
        try {
            const accountRef = getAccountsCollection(userId).doc(accountId);
            await accountRef.delete();
            return { success: true };
        } catch (error: any) {
            console.error('Error deleting email account:', error);
            throw new EmailAccountError('Failed to delete email account');
        }
    }

    /**
     * Check if user has any connected email accounts
     */
    async hasConnectedEmails(userId: string): Promise<boolean> {
        try {
            const accounts = await this.listEmailAccounts(userId);
            return accounts.length > 0;
        } catch (error) {
            console.error('Error checking connected emails:', error);
            return false;
        }
    }

    /**
     * Upsert an email account (insert or update)
     */
    async upsertEmailAccount(
        userId: string,
        accountData: Omit<EmailAccount, 'userId' | 'createdAt' | 'updatedAt'>
    ) {
        try {
            // First, try to find an existing account with the same email and provider
            const existingAccounts = await this.listEmailAccounts(userId);
            const existingAccount = existingAccounts.find(
                account => account.email === accountData.email && account.provider === accountData.provider
            );

            if (existingAccount) {
                // Update existing account
                return await this.updateEmailAccount(existingAccount.id, userId, {
                    ...accountData,
                    accessToken: encrypt(accountData.accessToken),
                    refreshToken: encrypt(accountData.refreshToken),
                    updatedAt: Timestamp.now(),
                    lastConnectedAt: Timestamp.now(),
                    isActive: true
                });
            } else {
                // Add new account
                return await this.addEmailAccount(userId, accountData);
            }
        } catch (error: any) {
            console.error('Error upserting email account:', error);
            throw new EmailAccountError('Failed to upsert email account');
        }
    }

    /**
     * Update auto-draft settings for a specific email account
     */
    async updateAutoDraftSettings(
        accountId: string,
        userId: string,
        settings: {
            tone?: 'professional' | 'casual' | 'friendly' | 'formal';
            customInstructions?: string;
        }
    ) {
        try {
            const accountRef = getAccountsCollection(userId).doc(accountId);
            await accountRef.update({
                autoDraftSettings: settings,
                updatedAt: Timestamp.now()
            });
            return { success: true };
        } catch (error: any) {
            console.error('Error updating auto-draft settings:', error);
            throw new EmailAccountError('Failed to update auto-draft settings');
        }
    }

    /**
     * Update auto-draft enabled state for a specific email account
     */
    async updateAutoDraftEnabled(
        accountId: string,
        userId: string,
        enabled: boolean
    ) {
        try {
            const accountRef = getAccountsCollection(userId).doc(accountId);

            // Check if document exists first
            const doc = await accountRef.get();
            if (!doc.exists) {
                throw new EmailAccountError('Email account not found');
            }

            await accountRef.update({
                autoDraftEnabled: enabled,
                updatedAt: Timestamp.now()
            });
            return { success: true };
        } catch (error: any) {
            console.error('Error updating auto-draft enabled state:', error);
            throw new EmailAccountError('Failed to update auto-draft enabled state');
        }
    }
}

// Export both the class and the legacy functions for backward compatibility
export const emailAccountsService = new EmailAccountsService();

// Legacy function exports
export const addEmailAccount = emailAccountsService.addEmailAccount.bind(emailAccountsService);
export const listEmailAccounts = emailAccountsService.listEmailAccounts.bind(emailAccountsService);
export const getEmailAccount = emailAccountsService.getEmailAccount.bind(emailAccountsService);
export const updateEmailAccount = emailAccountsService.updateEmailAccount.bind(emailAccountsService);
export const deleteEmailAccount = emailAccountsService.deleteEmailAccount.bind(emailAccountsService);
export const hasConnectedEmails = emailAccountsService.hasConnectedEmails.bind(emailAccountsService);
export const upsertEmailAccount = emailAccountsService.upsertEmailAccount.bind(emailAccountsService);
export const updateAutoDraftSettings = emailAccountsService.updateAutoDraftSettings.bind(emailAccountsService);
export const updateAutoDraftEnabled = emailAccountsService.updateAutoDraftEnabled.bind(emailAccountsService);