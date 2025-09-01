import { analyzeEmail } from '../server/lib/openai.js';

const testEmail = `
Subject: Welcome to TechCorp - Next Steps for Onboarding

Hi John,

Thank you for choosing TechCorp for your software development needs. I'm excited to work with you on this project.

To get started, I'll need a few things from you:
1. Signed contract (attached)
2. Project requirements document
3. Access to your development environment
4. Timeline preferences

Could you please send these over by Friday? Also, I'd like to schedule a kickoff call for next week.

Looking forward to working together!

Best regards,
Sarah Johnson
Project Manager, TechCorp
`;

async function testGroqIntegration() {
  console.log('🚀 Testing Groq integration...\n');
  
  // Debug environment variables
  console.log('🔧 Configuration:');
  console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
  console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('GROQ_MODEL:', process.env.GROQ_MODEL);
  console.log('');
  
  try {
    console.log('📧 Analyzing test email...');
    const analysis = await analyzeEmail(testEmail);
    
    console.log('✅ Email analysis successful!');
    console.log('📊 Analysis result:');
    console.log(JSON.stringify(analysis, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing Groq:', error);
  }
}

testGroqIntegration();