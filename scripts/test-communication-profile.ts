import {GroqCommunicationProfileAnalyzer, EmailData} from './groq-communication-profile-analyzer';

/**
 * Test script for communication profile analysis with sample data
 */
async function testCommunicationProfile() {
    console.log('🧪 Testing Communication Profile Analysis...\n');

    // Create sample email data
    const sampleEmails: EmailData[] = [
        {
            threadId: 'thread1',
            from: 'user@company.com',
            to: 'colleague@company.com',
            subject: 'Project Update',
            body: `Hi Sarah,

I wanted to give you a quick update on the project. We're making good progress and should be on track for the deadline.

Let me know if you have any questions.

Best,
John`,
            wordCount: 32
        },
        {
            threadId: 'thread2',
            from: 'user@company.com',
            to: 'boss@company.com',
            subject: 'Weekly Report',
            body: `Dear Mr. Johnson,

Please find attached the weekly report for your review. All deliverables have been completed on schedule, and we are proceeding according to the established timeline.

I would appreciate your feedback at your earliest convenience.

Kind regards,
John Smith`,
            wordCount: 38
        },
        {
            threadId: 'thread3',
            from: 'user@company.com',
            to: 'client@external.com',
            subject: 'Proposal Follow-up',
            body: `Dear Ms. Anderson,

Thank you for taking the time to review our proposal. I wanted to follow up on our discussion and address any questions you might have.

We remain committed to delivering exceptional value for your organization and would welcome the opportunity to discuss next steps.

Please let me know if you would like to schedule a call this week.

Best regards,
John Smith
Senior Consultant
Company Inc.`,
            wordCount: 65
        },
        {
            threadId: 'thread4',
            from: 'user@company.com',
            to: 'friend@personal.com',
            subject: 'Weekend Plans',
            body: `Hey Mike!

Hope you're doing well! Are we still on for the game this weekend? Let me know what time works best for you.

Can't wait to catch up!

Cheers,
John`,
            wordCount: 28
        }, {
            threadId: 'thread5',
            from: 'user@company.com',
            to: 'team@company.com',
            subject: 'URGENT: Server Issue',
            body: `Team,

We're experiencing a critical server issue that needs immediate attention. Please prioritize this over other tasks.

I've already contacted IT support and they're working on it. I'll keep you updated as we learn more.

Thanks for your quick response on this.

John`,
            wordCount: 42
        }
    ];

    try { // Initialize analyzer
        const analyzer = new GroqCommunicationProfileAnalyzer();

        console.log(`📧 Analyzing ${
            sampleEmails.length
        } sample emails...`);

        // Run analysis
        const profile = await analyzer.analyzeEmails(sampleEmails, 'test-user-123');

        // Save results
        const outputPath = await analyzer.saveProfile(profile, 'test-communication-profile.json');

        console.log('\n✅ Test completed successfully!');
        console.log(`📊 Profile saved to: ${outputPath}`);
        console.log(`🔢 Overall confidence: ${
            (profile.confidence * 100).toFixed(1)
        }%`);

        // Display some key results
        console.log('\n📋 Sample Results:');
        console.log(`   • Directness Level: ${
            profile.personalityTraits.directnessLevel.value.toFixed(1)
        }/10`);
        console.log(`   • Warmth Level: ${
            profile.personalityTraits.warmthLevel.value.toFixed(1)
        }/10`);
        console.log(`   • Average Formality (Colleague): ${
            profile.toneFormality.formalityScore.colleague ?. value.toFixed(1) || 'N/A'
        }/10`);
        console.log(`   • Average Formality (Boss): ${
            profile.toneFormality.formalityScore.boss ?. value.toFixed(1) || 'N/A'
        }/10`);
        console.log(`   • Contractions Usage: ${
            profile.languageVocabulary.contractionsUsage.value.toFixed(1)
        }%`);

        return profile;

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Auto-run the test
testCommunicationProfile().then(() => {
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
});

export {
    testCommunicationProfile
};
