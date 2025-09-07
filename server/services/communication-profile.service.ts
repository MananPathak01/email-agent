import * as fs from 'fs';
import * as path from 'path';
import Groq from 'groq-sdk';
import {z} from 'zod';
import {adminDb} from '../firebase-admin.js';

// Zod schema for the LLM response
const communicationProfileSchema = z.object({
    communicationStyle: z.object(
        {tone: z.string(), formality: z.string(), structure: z.string()}
    ),
    commonThemes: z.array(z.string()),
    responsePatterns: z.object(
        {responseTime: z.string(), responseLength: z.string()}
    ),
    overallConfidence: z.number().min(0).max(1),
    recommendations: z.array(z.string())
});

type CommunicationProfileLLMResponse = z.infer<typeof communicationProfileSchema>;

interface CommunicationProfile extends CommunicationProfileLLMResponse {
    userId: string;
    email: string;
    generatedAt: string;
    sampleSize: number;
    confidence: number;
    updatedAt?: string;
}

interface EmailData {
    id: string;
    subject: string;
    body: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    date: string;
    labels?: string[];
    threadId?: string;
    isSent: boolean;
}

export class CommunicationProfileService {
    private groq : Groq;
    // ... constructor ...

    constructor() {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY environment variable is required');
        }
        this.groq = new Groq({apiKey: process.env.GROQ_API_KEY});
    }

    async analyzeEmails(emailData : EmailData[], userId : string, userContext? : any): Promise < CommunicationProfile > { // ... same analysis logic ...
        const prompt = this.createAnalysisPrompt(emailData, userContext);
        const completion = await this.groq.chat.completions.create(
            {
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt()
                    }, {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
                // Lower the response budget to stay within limits
                max_tokens: 1500
            }
        );
        const response = completion.choices[0] ?. message ?. content;
        if (! response) 
            throw new Error('No response from Groq API');
        
        const analysisResult = JSON.parse(response);
        const validation = communicationProfileSchema.safeParse(analysisResult);
        if (! validation.success) {
            console.error("❌ LLM response failed Zod validation:", validation.error.errors);
            throw new Error("LLM returned data in an invalid format.");
        }

        // Derive the primary email. If no emails provided, use writingStyleData.email if available.
        let mostFrequentEmail = '';
        if (emailData.length > 0) {
            const emailCounts: Record < string,
                number > = {};
            emailData.forEach(email => {
                const emailAddress = email.from.toLowerCase();
                emailCounts[emailAddress] = (emailCounts[emailAddress] || 0) + 1;
            });
            mostFrequentEmail = Object.entries(emailCounts).reduce((a, b) => (a[1] > b[1] ? a : b), ['', 0])[0];
        } else if (userContext ?. writingStyleData ?. email) {
            mostFrequentEmail = String(userContext.writingStyleData.email).toLowerCase();
        }

        return this.createCommunicationProfile(validation.data, userId, emailData.length, mostFrequentEmail);
    }

    private getSystemPrompt(): string {
        return `You are an expert communication pattern analyst. Your task is to analyze email communication patterns and return your analysis as a json response.

Analyze the provided emails and extract:
1. Communication style (tone, formality, structure)
2. Common themes and topics
3. Response patterns (timing, length)
4. Overall confidence in the analysis
5. Recommendations for improvement

IMPORTANT: You must respond with a valid json object that matches this exact structure:
{
  "communicationStyle": {
    "tone": "professional/casual/friendly/formal",
    "formality": "high/medium/low",
    "structure": "detailed/concise/bullet-points/narrative"
  },
  "commonThemes": ["theme1", "theme2", "theme3"],
  "responsePatterns": {
    "responseTime": "immediate/within-hours/within-days/delayed",
    "responseLength": "brief/moderate/detailed/verbose"
  },
  "overallConfidence": 0.85,
  "recommendations": ["recommendation1", "recommendation2"]
}

Return only the json object, no other text.`;
    }

    private createAnalysisPrompt(emailData : EmailData[], userContext? : any): string { // If compact writing-style data is provided, build a minimal prompt from it
        const ws = userContext ?. writingStyleData;
        if (ws) {
            const samples: any[] = Array.isArray(ws.samples) ? ws.samples.slice(0, 5) : [];
            const sampleLines = samples.map(
                (s, i) => `Sample ${
                    i + 1
                }: subject="${
                    s.subject
                }" | to=${
                    Array.isArray(s.to) ? s.to.join(', ') : s.to
                } | words=${
                    s.wordCount
                }`
            ).join('\n');
            let finalPrompt = `Using the compact writing-style data below, produce a json communication profile as specified in the system prompt. Keep analysis concise and grounded in the summary, not raw bodies.

Writing-Style Summary:
- userId: ${
                ws.userId
            }
- email: ${
                ws.email
            }
- collectedAt: ${
                ws.collectedAt
            }
- counts: ${
                JSON.stringify(ws.summary)
            }

Representative Samples (metadata only):
${sampleLines}

Return only valid json.`;
            const MAX_PROMPT_CHARS = 12000;
            if (finalPrompt.length > MAX_PROMPT_CHARS) 
                finalPrompt = finalPrompt.slice(0, MAX_PROMPT_CHARS);
            
            return finalPrompt;
        }

        // Fallback to emails if writing-style data is not present
        const MAX_EMAILS = 10;
        const emailsSample = emailData.slice(0, MAX_EMAILS);
        const emailSummaries = emailsSample.map((email, index) => {
            const recipients = Array.isArray(email.to) ? email.to : (email.to ? [email.to as unknown as string] : []);
            return `Email ${
                index + 1
            }:
Subject: ${
                email.subject
            }
From: ${
                email.from
            }
To: ${
                recipients.join(', ')
            }
Date: ${
                email.date
            }
Body: ${
                email.body.substring(0, 300)
            }${
                email.body.length > 300 ? '...' : ''
            }
`;
        }).join('\n---\n');

        let finalPrompt = `Please analyze the following ${
            emailsSample.length
        } emails and provide a communication profile as a json response.

${
            userContext ? `Additional Context: ${
                JSON.stringify(userContext)
            }\n\n` : ''
        }Email Data:
${emailSummaries}

Based on these emails, analyze the communication patterns and provide your response as a json object with the communication profile structure specified in the system prompt. Remember to return only valid json.`;
        const MAX_PROMPT_CHARS = 18000;
        if (finalPrompt.length > MAX_PROMPT_CHARS) 
            finalPrompt = finalPrompt.slice(0, MAX_PROMPT_CHARS);
        
        return finalPrompt;
    }

    private createCommunicationProfile(validatedData : CommunicationProfileLLMResponse, userId : string, sampleSize : number, email : string): CommunicationProfile {
        const now = new Date();
        return {
            ...validatedData,
            userId,
            email,
            generatedAt: now.toISOString(),
            sampleSize,
            confidence: validatedData.overallConfidence,
            updatedAt: now.toISOString()
        };
    }

    async saveProfile(userId : string, email : string, profile : CommunicationProfile): Promise < void > {
        console.log(`💾 Saving communication profile to Firestore for ${email}...`);

        if (!adminDb) {
            throw new Error('Firestore database is not initialized');
        }

        try { // Get a reference to the user's email accounts subcollection using Admin SDK
            const accountsCollectionRef = adminDb.collection('users').doc(userId).collection('email_accounts');

            // Query for the specific email account
            const snapshot = await accountsCollectionRef.where('email', '==', email).get();

            if (snapshot.empty) {
                throw new Error(`No email account document found for ${email} under user ${userId}`);
            }

            // Get the document reference and update it
            const accountDocRef = snapshot.docs[0].ref;
            const summary = this.generateProfileSummary(profile);

            console.log(`📝 Updating document at path: users/${userId}/email_accounts/${
                snapshot.docs[0].id
            }`);

            await accountDocRef.update({
                communicationProfile: profile,
                communicationSummary: summary,
                learningStatus: 'complete',
                profileGeneratedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log(`✅ Successfully saved profile and summary to Firestore for ${email}`);
        } catch (error) {
            console.error('❌ Error saving profile to Firestore:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
            }
            throw error;
        }
    }

    private generateProfileSummary(profile : CommunicationProfile): any {
        return { /* ... same summary logic ... */
        };
    }
}

export {
    CommunicationProfile,
    EmailData
};
