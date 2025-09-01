import {CommunicationProfileService, EmailData} from '../server/services/communication-profile.service';

/**
 * Test script to verify the integrated communication profile analysis
 */
async function testIntegratedAnalysis() {
    console.log('🧪 Testing Integrated Communication Profile Analysis...\n');

    // Create sample email data that matches the format from Gmail collection
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
        }, {
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
        }, {
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
        }
    ];

    try { // Initialize the service (same as used in Gmail learning route)
        const profileService = new CommunicationProfileService();

        console.log(`📧 Analyzing ${
            sampleEmails.length
        } sample emails...`);

        // Run analysis (same as called from Gmail learning route)
        // Define a sample user context, simulating what the frontend form would provide
        const sampleUserContext = {
            primaryUse: 'work',
            workStyle: 'professional-relaxed',
            workContacts: ['team', 'clients', 'boss'],
        };

        console.log('📋 Testing with user context:', sampleUserContext);

        // Run analysis with context (same as called from Gmail learning route)
        const profile = await profileService.analyzeEmails(sampleEmails, 'test-integration-user-with-context', sampleUserContext);

        // Save results (same as called from Gmail learning route)
        const outputPath = await profileService.saveProfile(profile, 'test-integration-profile.json');

        console.log('\n✅ Integration test completed successfully!');
        console.log(`📊 Profile saved to: ${outputPath}`);
        console.log(`🔢 Overall confidence: ${
            (profile.confidence * 100).toFixed(1)
        }%`);

        // Display some key results to verify the analysis worked
        console.log('\n📋 Analysis Results:');
        console.log(`   • User ID: ${
            profile.userId
        }`);
        console.log(`   • Sample Size: ${
            profile.sampleSize
        } emails`);
        console.log(`   • Directness Level: ${
            profile.personalityTraits.directnessLevel.value.toFixed(1)
        }/10`);
        console.log(`   • Warmth Level: ${
            profile.personalityTraits.warmthLevel.value.toFixed(1)
        }/10`);
        console.log(`   • Tone Distribution: ${
            JSON.stringify(profile.toneFormality.toneDistribution.value)
        }`);

        return profile;

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        throw error;
    }
}

// Auto-run the test
testIntegratedAnalysis().then(() => {
    console.log('\n🎉 Integration test completed successfully!');
    console.log('✅ The communication profile analysis is ready for Gmail integration!');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Integration test failed:', error.message);
    process.exit(1);
});

export {
    testIntegratedAnalysis
};
