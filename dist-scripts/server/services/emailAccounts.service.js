"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertEmailAccount = exports.deleteEmailAccount = exports.updateEmailAccount = exports.getEmailAccount = exports.listEmailAccounts = exports.addEmailAccount = void 0;
const firestore_1 = require("firebase-admin/firestore");
// No need to import FirebaseError, we'll use type checking
const firebase_admin_1 = require("../firebase-admin");
const crypto_1 = require("../utils/crypto");
class EmailAccountError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'EmailAccountError';
    }
}
const db = firebase_admin_1.adminDb;
const getAccountsCollection = (userId) => db.collection('users').doc(userId).collection('email_accounts');
/**
 * Add a new email account for a user (subcollection)
 */
const addEmailAccount = async (userId, accountData) => {
    try {
        const accountRef = await getAccountsCollection(userId).add({
            ...accountData,
            accessToken: (0, crypto_1.encrypt)(accountData.accessToken),
            refreshToken: (0, crypto_1.encrypt)(accountData.refreshToken),
            createdAt: firestore_1.Timestamp.now(),
            updatedAt: firestore_1.Timestamp.now(),
            lastConnectedAt: firestore_1.Timestamp.now(),
            isActive: true
        });
        return {
            id: accountRef.id,
            ...accountData
        };
    }
    catch (error) {
        console.error('Error adding email account:', error);
        throw new Error('Failed to add email account');
    }
};
exports.addEmailAccount = addEmailAccount;
/**
 * List all email accounts for a user (subcollection)
 */
const listEmailAccounts = async (userId) => {
    if (!userId) {
        throw new EmailAccountError('User ID is required', 'auth/user-id-required');
    }
    try {
        const snapshot = await getAccountsCollection(userId).get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }
    catch (error) {
        console.error('Error listing email accounts:', {
            error: error.message,
            code: error.code,
            stack: error.stack,
            userId
        });
        if (error && typeof error === 'object' && 'code' in error) {
            throw new EmailAccountError(`Database error: ${error.message}`, `firestore/${error.code}`);
        }
        throw new EmailAccountError(error.message || 'Failed to list email accounts', 'unknown-error');
    }
};
exports.listEmailAccounts = listEmailAccounts;
/**
 * Get a single email account by ID (subcollection)
 */
const getEmailAccount = async (accountId, userId) => {
    try {
        const accountRef = getAccountsCollection(userId).doc(accountId);
        const doc = await accountRef.get();
        if (!doc.exists) {
            return null;
        }
        return {
            id: doc.id,
            ...doc.data()
        };
    }
    catch (error) {
        console.error('Error getting email account:', error);
        throw new Error('Failed to get email account');
    }
};
exports.getEmailAccount = getEmailAccount;
/**
 * Update an email account (subcollection)
 */
const updateEmailAccount = async (accountId, userId, updates) => {
    try {
        const accountRef = getAccountsCollection(userId).doc(accountId);
        const doc = await accountRef.get();
        if (!doc.exists) {
            throw new Error('Email account not found');
        }
        const accountData = doc.data();
        await accountRef.update({
            ...updates,
            updatedAt: firestore_1.Timestamp.now()
        });
        return {
            id: doc.id,
            ...accountData,
            ...updates
        };
    }
    catch (error) {
        console.error('Error updating email account:', error);
        throw new Error('Failed to update email account');
    }
};
exports.updateEmailAccount = updateEmailAccount;
/**
 * Delete an email account (subcollection)
 */
const deleteEmailAccount = async (accountId, userId) => {
    try {
        const accountRef = getAccountsCollection(userId).doc(accountId);
        const doc = await accountRef.get();
        if (!doc.exists) {
            throw new Error('Email account not found');
        }
        await accountRef.delete();
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting email account:', error);
        throw new Error('Failed to delete email account');
    }
};
exports.deleteEmailAccount = deleteEmailAccount;
/**
 * Upsert (add or update) an email account for a user by email (subcollection)
 */
const upsertEmailAccount = async (userId, accountData) => {
    try {
        const accountsRef = getAccountsCollection(userId);
        const existingQuery = await accountsRef.where('email', '==', accountData.email).get();
        const encryptedAccessToken = (0, crypto_1.encrypt)(accountData.accessToken);
        const encryptedRefreshToken = (0, crypto_1.encrypt)(accountData.refreshToken);
        const now = firestore_1.Timestamp.now();
        if (!existingQuery.empty) { // Update the first matching document
            const docRef = existingQuery.docs[0].ref;
            await docRef.update({
                ...accountData,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                updatedAt: now,
                lastConnectedAt: now,
                isActive: true
            });
            return {
                id: docRef.id,
                ...accountData
            };
        }
        else { // Create new document
            const docRef = await accountsRef.add({
                ...accountData,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                createdAt: now,
                updatedAt: now,
                lastConnectedAt: now,
                isActive: true
            });
            return {
                id: docRef.id,
                ...accountData
            };
        }
    }
    catch (error) {
        console.error('Error upserting email account:', error);
        throw new Error('Failed to upsert email account');
    }
};
exports.upsertEmailAccount = upsertEmailAccount;
