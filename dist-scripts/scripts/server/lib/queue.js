"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.learningWorker = exports.draftGenerationWorker = exports.emailProcessingWorker = exports.learningQueue = exports.draftGenerationQueue = exports.emailProcessingQueue = exports.redis = void 0;
exports.processEmailJob = processEmailJob;
exports.processDraftGenerationJob = processDraftGenerationJob;
exports.processLearningJob = processLearningJob;
exports.addEmailProcessingJob = addEmailProcessingJob;
exports.addDraftGenerationJob = addDraftGenerationJob;
exports.addLearningJob = addLearningJob;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
// Redis connection configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required by BullMQ
    retryDelayOnFailover: 100,
    lazyConnect: true
};
// Create Redis connection (optional)
exports.redis = null;
// Only try to connect to Redis if explicitly enabled
if (process.env.REDIS_ENABLED === 'true') {
    try {
        exports.redis = new ioredis_1.default(redisConfig);
        console.log('✅ Redis connected for background jobs');
    }
    catch (error) {
        console.log('⚠️ Redis connection failed - using in-memory processing');
    }
}
else {
    console.log('⚠️ Redis disabled - using in-memory processing');
}
// Create queues (only if Redis is available)
exports.emailProcessingQueue = null;
exports.draftGenerationQueue = null;
exports.learningQueue = null;
if (exports.redis) {
    exports.emailProcessingQueue = new bullmq_1.Queue('email-processing', {
        connection: exports.redis,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        }
    });
    exports.draftGenerationQueue = new bullmq_1.Queue('draft-generation', {
        connection: exports.redis,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        }
    });
    exports.learningQueue = new bullmq_1.Queue('learning', {
        connection: exports.redis,
        defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 25,
            attempts: 2,
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        }
    });
}
// Job processing functions
async function processEmailJob(job) {
    const { emailId, userId, provider, emailData } = job.data;
    try {
        console.log(`[Job] 🔄 Processing email ${emailId} for user ${userId}`);
        console.log(`[Job] Email subject: "${emailData.subject}", from: "${emailData.from}"`);
        // Import here to avoid circular dependencies
        const { analyzeEmail } = await Promise.resolve().then(() => __importStar(require('./openai')));
        const { saveEmailAnalysis } = await Promise.resolve().then(() => __importStar(require('../services/email.service')));
        const { wsManager } = await Promise.resolve().then(() => __importStar(require('./websocket')));
        // Notify user that analysis is starting
        wsManager.notifyProcessingStatus(userId, {
            status: 'analyzing',
            emailId,
            message: 'Analyzing email content with AI...'
        });
        // Analyze the email content
        const emailContent = emailData.body || emailData.snippet || '';
        const analysis = await analyzeEmail(emailContent);
        // Save the analysis to database
        await saveEmailAnalysis(emailId, userId, analysis);
        // Notify user about detected workflow
        if (analysis.category && analysis.category !== 'other') {
            wsManager.notifyWorkflowDetected(userId, emailId, analysis.category);
        }
        // If email requires response, queue draft generation
        if (analysis.requiresResponse) {
            if (exports.draftGenerationQueue) {
                await exports.draftGenerationQueue.add('generate-draft', {
                    emailId,
                    userId,
                    emailAnalysis: analysis,
                    userContext: {
                        provider,
                        emailData
                    }
                });
            }
            else { // Process immediately if no queue available
                const jobData = {
                    data: {
                        emailId,
                        userId,
                        emailAnalysis: analysis,
                        userContext: {
                            provider,
                            emailData
                        }
                    }
                };
                await processDraftGenerationJob(jobData);
            }
        }
        else { // Notify that no response is needed
            wsManager.notifyProcessingStatus(userId, {
                status: 'completed',
                emailId,
                message: 'Email analyzed - no response required'
            });
        }
        console.log(`Email ${emailId} processed successfully`);
        return { success: true, analysis };
    }
    catch (error) {
        console.error(`Error processing email ${emailId}:`, error);
        throw error;
    }
}
async function processDraftGenerationJob(job) {
    const { emailId, userId, emailAnalysis, userContext } = job.data;
    try {
        console.log(`[Draft Job] 📝 Generating draft for email ${emailId}`);
        console.log(`[Draft Job] Analysis: intent=${emailAnalysis.intent}, requiresResponse=${emailAnalysis.requiresResponse}`);
        // Import services
        const { generateSimpleResponse } = await Promise.resolve().then(() => __importStar(require('./openai')));
        const { saveDraftResponse } = await Promise.resolve().then(() => __importStar(require('../services/email.service')));
        const { wsManager } = await Promise.resolve().then(() => __importStar(require('./websocket')));
        // Notify user that draft generation is starting
        wsManager.notifyProcessingStatus(userId, {
            status: 'generating_draft',
            emailId,
            message: 'Generating AI response...'
        });
        // Generate a simple response without complex learning
        const draftResponse = await generateSimpleResponse(emailAnalysis, userContext.emailData);
        // Save the draft to our database
        await saveDraftResponse(emailId, userId, draftResponse);
        // Create draft in Gmail
        if (userContext.provider === 'gmail') {
            const { GmailService } = await Promise.resolve().then(() => __importStar(require('../services/gmail.service')));
            const gmailService = new GmailService();
            await gmailService.createDraft(userId, emailId, draftResponse);
            console.log(`✅ Created Gmail draft for email ${emailId}`);
            // Notify user that draft is ready
            wsManager.notifyDraftGenerated(userId, emailId, {
                confidence: draftResponse.confidence,
                workflowUsed: draftResponse.workflowUsed,
                estimatedTimeToWrite: 5
            });
        }
        else {
            console.log('Outlook draft creation not yet implemented');
        }
        console.log(`Draft generated for email ${emailId}`);
        return { success: true, draft: draftResponse };
    }
    catch (error) {
        console.error(`Error generating draft for email ${emailId}:`, error);
        throw error;
    }
}
async function processLearningJob(job) {
    const { userId, accountId } = job.data;
    try {
        console.log(`Processing learning for user ${userId}, account ${accountId}`);
        // Import services
        const { processHistoricalEmails } = await Promise.resolve().then(() => __importStar(require('../services/learning.service')));
        const { GmailService } = await Promise.resolve().then(() => __importStar(require('../services/gmail.service')));
        const { updateEmailAccount, getEmailAccount } = await Promise.resolve().then(() => __importStar(require('../services/emailAccounts.service')));
        const { decrypt } = await Promise.resolve().then(() => __importStar(require('../utils/crypto')));
        // Get the account details to retrieve stored tokens
        const account = await getEmailAccount(accountId, userId);
        if (!account) {
            throw new Error(`Account ${accountId} not found for user ${userId}`);
        }
        if (!account.accessToken || !account.refreshToken) {
            throw new Error(`Missing tokens for account ${accountId}`);
        }
        // Decrypt the stored tokens
        const accessToken = decrypt(account.accessToken);
        const refreshToken = decrypt(account.refreshToken);
        // Initialize Gmail service with decrypted tokens
        const gmailService = new GmailService(accessToken, refreshToken);
        const historicalEmails = await gmailService.getHistoricalEmailsForLearning(userId, 1000);
        console.log(`Fetched ${historicalEmails.length} historical emails for learning`);
        // Process the historical emails to extract patterns
        await processHistoricalEmails(userId, accountId, historicalEmails);
        // Mark learning as completed
        await updateEmailAccount(accountId, userId, { learningCompleted: true });
        console.log(`Learning completed for user ${userId}, account ${accountId}`);
        return { success: true };
    }
    catch (error) {
        console.error(`Error processing learning for user ${userId}:`, error);
        throw error;
    }
}
// Create workers (only if Redis is available)
exports.emailProcessingWorker = null;
exports.draftGenerationWorker = null;
exports.learningWorker = null;
if (exports.redis && exports.emailProcessingQueue && exports.draftGenerationQueue && exports.learningQueue) {
    exports.emailProcessingWorker = new bullmq_1.Worker('email-processing', processEmailJob, {
        connection: exports.redis,
        concurrency: 5
    });
    exports.draftGenerationWorker = new bullmq_1.Worker('draft-generation', processDraftGenerationJob, {
        connection: exports.redis,
        concurrency: 3
    });
    exports.learningWorker = new bullmq_1.Worker('learning', processLearningJob, {
        connection: exports.redis,
        concurrency: 2
    });
}
// Worker event handlers (only if workers exist)
if (exports.emailProcessingWorker) {
    exports.emailProcessingWorker.on('completed', (job) => {
        console.log(`Email processing job ${job.id} completed`);
    });
    exports.emailProcessingWorker.on('failed', (job, err) => {
        console.error(`Email processing job ${job?.id} failed:`, err);
    });
}
if (exports.draftGenerationWorker) {
    exports.draftGenerationWorker.on('completed', (job) => {
        console.log(`Draft generation job ${job.id} completed`);
    });
    exports.draftGenerationWorker.on('failed', (job, err) => {
        console.error(`Draft generation job ${job?.id} failed:`, err);
    });
}
if (exports.learningWorker) {
    exports.learningWorker.on('completed', (job) => {
        console.log(`Learning job ${job.id} completed`);
    });
    exports.learningWorker.on('failed', (job, err) => {
        console.error(`Learning job ${job?.id} failed:`, err);
    });
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down workers...');
    if (exports.emailProcessingWorker)
        await exports.emailProcessingWorker.close();
    if (exports.draftGenerationWorker)
        await exports.draftGenerationWorker.close();
    if (exports.learningWorker)
        await exports.learningWorker.close();
    if (exports.redis)
        await exports.redis.quit();
    process.exit(0);
});
// Helper functions for adding jobs
async function addEmailProcessingJob(data) {
    if (exports.emailProcessingQueue) {
        return await exports.emailProcessingQueue.add('process-email', data, {
            priority: data.emailData.urgency === 'high' ? 1 : data.emailData.urgency === 'medium' ? 2 : 3
        });
    }
    else { // Process immediately if no queue available
        return await processEmailJob({ data });
    }
}
async function addDraftGenerationJob(data) {
    if (exports.draftGenerationQueue) {
        return await exports.draftGenerationQueue.add('generate-draft', data);
    }
    else { // Process immediately if no queue available
        return await processDraftGenerationJob({ data });
    }
}
async function addLearningJob(data) {
    if (exports.learningQueue) {
        return await exports.learningQueue.add('process-learning', data, {
            delay: 5000 // Delay learning jobs to not overwhelm the system
        });
    }
    else { // Process immediately if no queue available (with error handling)
        setTimeout(async () => {
            try {
                await processLearningJob({ data });
            }
            catch (error) {
                console.error('Error in immediate learning job processing:', error);
                // Don't crash the server - just log the error
            }
        }, 5000);
    }
}
