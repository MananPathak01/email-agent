"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveEmailAnalysis = saveEmailAnalysis;
exports.saveDraftResponse = saveDraftResponse;
exports.getEmailAnalysis = getEmailAnalysis;
exports.getDraftResponse = getDraftResponse;
exports.updateDraftStatus = updateDraftStatus;
const firebase_js_1 = require("../../firebase.js");
const firestore_1 = require("firebase/firestore");
async function saveEmailAnalysis(emailId, userId, analysis) {
    try {
        const analysisDoc = {
            emailId,
            userId,
            analysis,
            processedAt: new Date(),
            processingTime: Date.now() // This would be calculated properly in real implementation
        };
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_js_1.db, 'email_analysis', `${userId}_${emailId}`), analysisDoc);
        console.log(`💾 Saved analysis for email ${emailId}`);
    }
    catch (error) {
        console.error('Error saving email analysis:', error);
        throw error;
    }
}
async function saveDraftResponse(emailId, userId, draftData) {
    try {
        const draftDoc = {
            emailId,
            userId,
            draft: draftData,
            createdAt: new Date(),
            status: 'pending'
        };
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_js_1.db, 'draft_responses', `${userId}_${emailId}`), draftDoc);
        console.log(`💾 Saved draft response for email ${emailId}`);
    }
    catch (error) {
        console.error('Error saving draft response:', error);
        throw error;
    }
}
async function getEmailAnalysis(emailId, userId) {
    try {
        const docRef = (0, firestore_1.doc)(firebase_js_1.db, 'email_analysis', `${userId}_${emailId}`);
        const docSnap = await (0, firestore_1.getDoc)(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    }
    catch (error) {
        console.error('Error getting email analysis:', error);
        throw error;
    }
}
async function getDraftResponse(emailId, userId) {
    try {
        const docRef = (0, firestore_1.doc)(firebase_js_1.db, 'draft_responses', `${userId}_${emailId}`);
        const docSnap = await (0, firestore_1.getDoc)(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    }
    catch (error) {
        console.error('Error getting draft response:', error);
        throw error;
    }
}
async function updateDraftStatus(emailId, userId, status, feedback) {
    try {
        const docRef = (0, firestore_1.doc)(firebase_js_1.db, 'draft_responses', `${userId}_${emailId}`);
        const updateData = {
            status,
            updatedAt: new Date()
        };
        if (feedback) {
            updateData.userFeedback = feedback;
        }
        await (0, firestore_1.updateDoc)(docRef, updateData);
        console.log(`📝 Updated draft status for email ${emailId}: ${status}`);
    }
    catch (error) {
        console.error('Error updating draft status:', error);
        throw error;
    }
}
