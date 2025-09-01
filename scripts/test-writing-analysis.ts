#!/usr/bin/env tsx

/**
 * Test Writing Style Analysis with LLM
 * 
 * This script takes the collected email data and sends it to an LLM
 * for comprehensive writing style analysis.
 */

import fs from 'fs';
import path from 'path';

// Load the latest writing style data
function loadLatestWritingData(): any {
    const dataDir = path.join(process.cwd(), 'data');
    const files = fs.readdirSync(dataDir).filter(file => file.startsWith('writing-style-data-')).sort().reverse();

    if (files.length === 0) {
        throw new Error('No writing style data files found. Please collect emails first.');
    }

    const latestFile = files[0];
    const filePath = path.join(dataDir, latestFile);

    console.log(`📧 Loading data from: ${latestFile}`);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Create the analysis prompt
function createAnalysisPrompt(emailData : any): string {
    const systemPrompt = `You are an expert communication analyst specializing in writing style analysis. Your task is to analyze email data and extract detailed writing patterns to create a comprehensive communication profile.

Analyze the provided email data and extract writing style features with confidence scores (0-1).

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, just the JSON object.`;

    const analysisPrompt = `Analyze this email data and return a comprehensive writing style profile in JSON format:

EMAIL DATA:
${
        JSON.stringify(emailData, null, 2)
    }

Extract patterns for:
1. Tone & Formality (formality scores 1-10 by relationship type)
2. Greeting & Closing patterns (actual phrases used)
3. Personality traits (directness 1-10, warmth 1-10, enthusiasm markers)
4. Message structure (word counts, paragraph style, bullet usage)
5. Language & vocabulary (common phrases, signature words, contraction usage)
6. Relationship classification (classify recipients by email patterns)

Return JSON with confidence scores (0-1) for each feature. Focus on patterns that appear in multiple emails.`;

    return `${systemPrompt}\n\n${analysisPrompt}`;
}

// Main execution
async function analyzeWritingStyle() {
    try {
        console.log('🎯 Starting Writing Style Analysis');
        console.log('='.repeat(50));

        // Load the email data
        const emailData = loadLatestWritingData();

        console.log(`📊 Dataset Summary:`);
        console.log(`   • Sent emails: ${
            emailData.sentEmails ?. length || 0
        }`);
        console.log(`   • Context emails: ${
            emailData.summary ?. contextCount || 0
        }`);
        console.log(`   • Total processed: ${
            (emailData.sentEmails ?. length || 0) + (emailData.summary ?. contextCount || 0)
        }`);

        // Create the analysis prompt
        const prompt = createAnalysisPrompt(emailData);

        console.log('\n🤖 LLM Analysis Prompt Created');
        console.log('='.repeat(50));
        console.log('Copy the following prompt and send it to your LLM (Claude, GPT-4, etc.):');
        console.log('\n' + '='.repeat(80));
        console.log(prompt);
        console.log('='.repeat(80));

        // Save prompt to file for easy copying
        const promptFile = path.join(process.cwd(), 'data', `analysis-prompt-${
            Date.now()
        }.txt`);
        fs.writeFileSync(promptFile, prompt);

        console.log(`\n💾 Prompt saved to: ${promptFile}`);
        console.log('\n📋 Next Steps:');
        console.log('1. Copy the prompt above');
        console.log('2. Send it to Claude, GPT-4, or your preferred LLM');
        console.log('3. The LLM will return a comprehensive JSON analysis');
        console.log('4. Save the JSON response for integration into your app');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the analysis
analyzeWritingStyle();
