import {db} from '../../firebase';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc
} from 'firebase/firestore';
import {analyzeEmail, generateResponse} from '../lib/openai';
import {wsManager} from '../lib/websocket';

export interface EmailAnalysisResult {
    emailId: string;
    userId: string;
    analysis: any;
    processedAt: Date;
    processingTime: number;
}

export interface DraftResponseResult {
    emailId: string;
    userId: string;
    draft: any;
    createdAt: Date;
    status: 'pending' | 'approved' | 'rejected' | 'edited';
}

export async function saveEmailAnalysis(emailId: string, userId: string, analysis: any) {
    try {
        const analysisDoc = {
            emailId,
            userId,
            analysis,
            processedAt: new Date(),
            processingTime: Date.now() // This would be calculated properly in real implementation
        };
        await setDoc(doc(db, 'email_analysis', `${userId}_${emailId}`), analysisDoc);
        console.log(`💾 Saved analysis for email ${emailId}`);
    } catch (error) {
        console.error('Error saving email analysis:', error);
        throw error;
    }
}

export async function saveDraftResponse(emailId: string, userId: string, draftData: any) {
    try {
        const draftDoc = {
            emailId,
            userId,
            draft: draftData,
            createdAt: new Date(),
            status: 'pending'
        };
        await setDoc(doc(db, 'draft_responses', `${userId}_${emailId}`), draftDoc);
        console.log(`💾 Saved draft response for email ${emailId}`);
    } catch (error) {
        console.error('Error saving draft response:', error);
        throw error;
    }
}

export async function getEmailAnalysis(emailId: string, userId: string) {
    try {
        const docRef = doc(db, 'email_analysis', `${userId}_${emailId}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting email analysis:', error);
        throw error;
    }
}

export async function getDraftResponse(emailId: string, userId: string) {
    try {
        const docRef = doc(db, 'draft_responses', `${userId}_${emailId}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting draft response:', error);
        throw error;
    }
}

export async function updateDraftStatus(emailId: string, userId: string, status: string, feedback ?:any) {
    try {
        const docRef = doc(db, 'draft_responses', `${userId}_${emailId}`);
        const updateData: any = {
            status,
            updatedAt: new Date()
        };
        if (feedback) {
            updateData.userFeedback = feedback;
        }
        await updateDoc(docRef, updateData);
        console.log(`📝 Updated draft status for email ${emailId}: ${status}`);
    } catch (error) {
        console.error('Error updating draft status:', error);
        throw error;
    }
}
