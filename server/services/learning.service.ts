import {db} from '../../firebase';
import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    limit,
    orderBy,
    addDoc
} from 'firebase/firestore';
import {generateEmbedding} from '../lib/openai';

export async function getUserCommunicationStyle(userId: string) {
    try {
        const docRef = doc(db, 'user_communication_styles', userId);
        const docSnap = await getDoc(docRef);
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
    } catch (error) {
        console.error('Error getting communication style:', error);
        return null;
    }
}

export async function getSimilarResponses(userId: string, emailAnalysis: any) {
    try { // Query for similar emails based on category
        const q = query(collection(db, 'email_analysis'), where('userId', '==', userId), where('analysis.category', '==', emailAnalysis.category), orderBy('processedAt', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);
        const similarResponses: any[] = [];
        querySnapshot.forEach((doc) => {
            similarResponses.push(doc.data());
        });
        return similarResponses;
    } catch (error) {
        console.error('Error getting similar responses:', error);
        return [];
    }
}

export async function getWorkflowTemplate(userId: string, category: string) {
    try {
        const q = query(collection(db, 'workflow_templates'), where('userId', '==', userId), where('category', '==', category), where('isActive', '==', true), limit(1));
        const querySnapshot = await getDocs(q);
        if (! querySnapshot.empty) {
            return querySnapshot.docs[0].data();
        }
        return null;
    } catch (error) {
        console.error('Error getting workflow template:', error);
        return null;
    }
}

export async function processHistoricalEmails(userId: string, accountId: string, emailData: any[]) {
    try {
        console.log(`🧠 Processing ${
            emailData.length
        } historical emails for learning...`);
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
                words.forEach((word : string) => {
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
            commonPhrases: Array.from(patterns.commonWords.entries()).sort(
                (a, b) => b[1] - a[1]
            ).slice(0, 20).map(
                ([word]) => word
            ),
            lastUpdated: new Date(),
            emailCount: emailData.length
        };
        await setDoc(doc(db, 'user_communication_styles', userId), communicationStyle);
        console.log(`✅ Completed learning for user ${userId}`);
        return communicationStyle;
    } catch (error) {
        console.error('Error processing historical emails:', error);
        throw error;
    }
}

export async function updateLearningFromFeedback(userId: string, emailId: string, originalDraft: string, userEdit: string) {
    try { // Analyze the differences between original and edited draft
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
        await setDoc(doc(db, 'user_feedback', `${userId}_${emailId}_${
            Date.now()
        }`), feedback);
        console.log(`📚 Saved learning feedback for user ${userId}`);
    } catch (error) {
        console.error('Error updating learning from feedback:', error);
        throw error;
    }
}
