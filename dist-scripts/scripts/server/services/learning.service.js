"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserCommunicationStyle = getUserCommunicationStyle;
exports.getSimilarResponses = getSimilarResponses;
exports.getWorkflowTemplate = getWorkflowTemplate;
exports.processHistoricalEmails = processHistoricalEmails;
exports.updateLearningFromFeedback = updateLearningFromFeedback;
const firebase_js_1 = require("../../firebase.js");
const firestore_1 = require("firebase/firestore");
async function getUserCommunicationStyle(userId) {
    try {
        const docRef = (0, firestore_1.doc)(firebase_js_1.db, 'user_communication_styles', userId);
        const docSnap = await (0, firestore_1.getDoc)(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        // Return default style if none exists
        return {
            tone: 'professional',
            formality: 'medium',
            responseLength: 'medium',
            commonPhrases: [],
            signatureStyle: 'Best regards'
        };
    }
    catch (error) {
        console.error('Error getting communication style:', error);
        return null;
    }
}
async function getSimilarResponses(userId, emailAnalysis) {
    try {
        // Query for similar emails based on category
        const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_js_1.db, 'email_analysis'), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.where)('analysis.category', '==', emailAnalysis.category), (0, firestore_1.orderBy)('processedAt', 'desc'), (0, firestore_1.limit)(3));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        const similarResponses = [];
        querySnapshot.forEach((doc) => {
            similarResponses.push(doc.data());
        });
        return similarResponses;
    }
    catch (error) {
        console.error('Error getting similar responses:', error);
        return [];
    }
}
async function getWorkflowTemplate(userId, category) {
    try {
        const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_js_1.db, 'workflow_templates'), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.where)('category', '==', category), (0, firestore_1.where)('isActive', '==', true), (0, firestore_1.limit)(1));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data();
        }
        return null;
    }
    catch (error) {
        console.error('Error getting workflow template:', error);
        return null;
    }
}
async function processHistoricalEmails(userId, accountId, emailData) {
    try {
        console.log(`🧠 Processing ${emailData.length} historical emails for learning...`);
        // Analyze communication patterns
        const patterns = {
            averageLength: 0,
            commonWords: new Map(),
            responsePatterns: [],
            signaturePatterns: []
        };
        let totalLength = 0;
        for (const email of emailData) {
            if (email.body) {
                totalLength += email.body.length;
                // Extract common words (simple implementation)
                const words = email.body.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length > 3) {
                        patterns.commonWords.set(word, (patterns.commonWords.get(word) || 0) + 1);
                    }
                });
            }
        }
        patterns.averageLength = totalLength / emailData.length;
        // Save communication style
        const communicationStyle = {
            userId,
            accountId,
            averageResponseLength: patterns.averageLength,
            commonPhrases: Array.from(patterns.commonWords.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([word]) => word),
            lastUpdated: new Date(),
            emailCount: emailData.length
        };
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_js_1.db, 'user_communication_styles', userId), communicationStyle);
        console.log(`✅ Completed learning for user ${userId}`);
        return communicationStyle;
    }
    catch (error) {
        console.error('Error processing historical emails:', error);
        throw error;
    }
}
async function updateLearningFromFeedback(userId, emailId, originalDraft, userEdit) {
    try {
        // Analyze the differences between original and edited draft
        const feedback = {
            emailId,
            userId,
            originalDraft,
            userEdit,
            timestamp: new Date(),
            // Simple diff analysis - in production, this would be more sophisticated
            lengthDifference: userEdit.length - originalDraft.length,
            editType: userEdit.length > originalDraft.length ? 'expanded' : 'shortened'
        };
        // Save feedback for future learning
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_js_1.db, 'user_feedback', `${userId}_${emailId}_${Date.now()}`), feedback);
        console.log(`📚 Saved learning feedback for user ${userId}`);
    }
    catch (error) {
        console.error('Error updating learning from feedback:', error);
        throw error;
    }
}
