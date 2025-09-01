import * as fs from 'fs';
import * as path from 'path';
import {GroqCommunicationProfileAnalyzer, EmailData} from './groq-communication-profile-analyzer';

/**
 * Script to run communication profile analysis on existing email data
 */
async function runCommunicationProfileAnalysis() {
    console.log('🚀 Starting Communication Profile Analysis...\n');

    try { // Find the most recent email data file
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            throw new Error('Data directory not found. Please run email collection first.');
        }

        const files = fs.readdirSync(dataDir).filter(file => file.startsWith('writing-style-data-') && file.endsWith('.json')).sort().reverse(); // Most recent first

        if (files.length === 0) {
            throw new Error('No email data files found. Please run email collection first.');
        }

        const latestFile = files[0];
        const filePath = path.join(dataDir, latestFile);

        console.log(`📂 Loading email data from: ${latestFile}`);

        // Load the email data
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const emailDataWrapper = JSON.parse(rawData);

        // Extract emails from the wrapper object
        const emailData = emailDataWrapper.sentEmails || emailDataWrapper || [];
        const userId = emailDataWrapper.userId || 'unknown-user';

        console.log(`👤 User ID: ${userId}`);
        console.log(`📧 Total emails loaded: ${
            emailData.length
        }`);

        // Filter for valid emails with content
        const validEmails: EmailData[] = emailData.filter((email : any) => email.body && email.body.trim().length > 10).map((email : any) => ({
            threadId: email.threadId || email.id || 'unknown',
            from: email.from || 'unknown@example.com',
            to: email.to || 'recipient@example.com',
            subject: email.subject || 'No Subject',
            body: email.body,
            wordCount: email.wordCount || email.body.split(/\s+/).length,
            threadContext: email.threadContext || []
        }));

        console.log(`✅ Valid emails for analysis: ${
            validEmails.length
        }\n`);

        if (validEmails.length === 0) {
            throw new Error('No valid emails found for analysis');
        }

        // Initialize the analyzer
        const analyzer = new GroqCommunicationProfileAnalyzer();

        // Run the analysis
        console.log('🔍 Starting Groq API analysis...');
        const profile = await analyzer.analyzeEmails(validEmails, userId);

        // Save the results
        const outputPath = await analyzer.saveProfile(profile);

        console.log('\n🎉 Communication Profile Analysis Complete!');
        console.log(`📊 Profile saved to: ${outputPath}`);
        console.log(`🔢 Overall confidence: ${
            (profile.confidence * 100).toFixed(1)
        }%`);
        console.log(`📈 Sample size: ${
            profile.sampleSize
        } emails`);

        // Display key insights
        console.log('\n📋 Key Insights:');
        console.log(`   • Formality Level: ${
            getFormalityLevel(profile)
        }`);
        console.log(`   • Personality: ${
            getPersonalityType(profile)
        }`);
        console.log(`   • Communication Style: ${
            getCommunicationStyle(profile)
        }`);
        console.log(`   • Average Email Length: ${
            getAverageEmailLength(profile)
        } words`);

        return profile;

    } catch (error) {
        console.error('❌ Error running communication profile analysis:', error);
        throw error;
    }
}

// Helper functions for displaying insights
function getFormalityLevel(profile : any): string {
    const scores = Object.values(profile.toneFormality.formalityScore);
    const avgFormality = scores.reduce((sum : number, score : any) => sum + score.value, 0) / scores.length;

    if (avgFormality >= 8) 
        return 'Very Formal';
    


    if (avgFormality >= 6) 
        return 'Moderately Formal';
    


    if (avgFormality >= 4) 
        return 'Neutral';
    


    if (avgFormality >= 2) 
        return 'Casual';
    


    return 'Very Casual';
}

function getPersonalityType(profile : any): string {
    const directness = profile.personalityTraits.directnessLevel.value;
    const warmth = profile.personalityTraits.warmthLevel.value;

    if (directness >= 7 && warmth >= 7) 
        return 'Direct and Warm';
    


    if (directness >= 7 && warmth < 4) 
        return 'Direct and Professional';
    


    if (directness < 4 && warmth >= 7) 
        return 'Diplomatic and Warm';
    


    if (directness < 4 && warmth < 4) 
        return 'Reserved and Diplomatic';
    


    return 'Balanced Communicator';
}

function getCommunicationStyle(profile : any): string {
    const tone = profile.toneFormality.toneDistribution.value;
    if (tone.formal > 60) 
        return 'Highly Professional';
    


    if (tone.casual > 60) 
        return 'Casual and Friendly';
    


    if (tone.neutral > 50) 
        return 'Balanced and Adaptable';
    


    return 'Mixed Style';
}

function getAverageEmailLength(profile : any): number {
    const wordCounts = Object.values(profile.messageStructure.avgWordCount);
    const avgLength = wordCounts.reduce((sum : number, wc : any) => sum + wc.value.mean, 0) / wordCounts.length;
    return Math.round(avgLength);
}

// Auto-run the analysis
runCommunicationProfileAnalysis().then(() => {
    console.log('\n✅ Analysis completed successfully!');
    process.exit(0);
}).catch((error) => {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
});

export {
    runCommunicationProfileAnalysis
};
