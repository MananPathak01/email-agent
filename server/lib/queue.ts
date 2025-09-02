import {Queue, Worker, Job} from 'bullmq';
import Redis from 'ioredis';

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
export let redis: Redis |null = null;

// Only try to connect to Redis if explicitly enabled
if (process.env.REDIS_ENABLED === 'true') {
    try {
        redis = new Redis(redisConfig);
        console.log('✅ Redis connected for background jobs');
    } catch (error) {
        console.log('⚠️ Redis connection failed - using in-memory processing');
    }
} else {
    console.log('⚠️ Redis disabled - using in-memory processing');
}

// Job types
export interface EmailProcessingJob {
    emailId: string;
    userId: string;
    provider: 'gmail' | 'outlook';
    emailData: any;
}

export interface DraftGenerationJob {
    emailId: string;
    userId: string;
    emailAnalysis: any;
    userContext: any;
}

export interface LearningJob {
    userId: string;
    accountId: string;
    emailData: any[];
}

// Create queues (only if Redis is available)
export let emailProcessingQueue: Queue<EmailProcessingJob> |null = null;
export let draftGenerationQueue: Queue<DraftGenerationJob> |null = null;
export let learningQueue: Queue<LearningJob> |null = null;

if (redis) {
    emailProcessingQueue = new Queue<EmailProcessingJob>('email-processing', {
        connection: redis,
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

    draftGenerationQueue = new Queue<DraftGenerationJob>('draft-generation', {
        connection: redis,
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

    learningQueue = new Queue<LearningJob>('learning', {
        connection: redis,
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
export async function processEmailJob(job: Job<EmailProcessingJob>) {
    const {emailId, userId, provider, emailData} = job.data;

    try {
        console.log(`[Job] 🔄 Processing email ${emailId} for user ${userId}`);
        console.log(`[Job] Email subject: "${
            emailData.subject
        }", from: "${
            emailData.from
        }"`);

        // Import here to avoid circular dependencies
        const {analyzeEmail} = await import ('./openai');
        const {saveEmailAnalysis} = await import ('../services/email.service');
        const {wsManager} = await import ('./websocket');

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
            if (draftGenerationQueue) {
                await draftGenerationQueue.add('generate-draft', {
                    emailId,
                    userId,
                    emailAnalysis: analysis,
                    userContext: {
                        provider,
                        emailData
                    }
                });
            } else { // Process immediately if no queue available
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
                await processDraftGenerationJob(jobData as any);
            }
        } else { // Notify that no response is needed
            wsManager.notifyProcessingStatus(userId, {
                status: 'completed',
                emailId,
                message: 'Email analyzed - no response required'
            });
        }

        console.log(`Email ${emailId} processed successfully`);
        return {success: true, analysis};

    } catch (error) {
        console.error(`Error processing email ${emailId}:`, error);
        throw error;
    }
}

export async function processDraftGenerationJob(job: Job<DraftGenerationJob>) {
    const {emailId, userId, emailAnalysis, userContext} = job.data;

    try {
        console.log(`[Draft Job] 📝 Generating draft for email ${emailId}`);
        console.log(`[Draft Job] Analysis: intent=${
            emailAnalysis.intent
        }, requiresResponse=${
            emailAnalysis.requiresResponse
        }`);

        // Import services
        const {generateSimpleResponse} = await import ('./openai');
        const {saveDraftResponse} = await import ('../services/email.service');
        const {wsManager} = await import ('./websocket');

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
            const {GmailService} = await import ('../services/gmail.service');
            const gmailService = new GmailService();
            await gmailService.createDraft(userId, emailId, draftResponse);

            console.log(`✅ Created Gmail draft for email ${emailId}`);

            // Notify user that draft is ready
            wsManager.notifyDraftGenerated(userId, emailId, {
                confidence: draftResponse.confidence,
                workflowUsed: draftResponse.workflowUsed,
                estimatedTimeToWrite: 5
            });
        } else {
            console.log('Outlook draft creation not yet implemented');
        }

        console.log(`Draft generated for email ${emailId}`);
        return {success: true, draft: draftResponse};

    } catch (error) {
        console.error(`Error generating draft for email ${emailId}:`, error);
        throw error;
    }
}

export async function processLearningJob(job: Job<LearningJob>) {
    const {userId, accountId} = job.data;

    try {
        console.log(`Processing learning for user ${userId}, account ${accountId}`);

        // Import services
        const {processHistoricalEmails} = await import ('../services/learning.service');
        const {GmailService} = await import ('../services/gmail.service');
        const {updateEmailAccount, getEmailAccount} = await import ('../services/emailAccounts.service');
        const {decrypt} = await import ('../utils/crypto');

        // Get the account details to retrieve stored tokens
        const account = await getEmailAccount(accountId, userId);
        if (! account) {
            throw new Error(`Account ${accountId} not found for user ${userId}`);
        }

        if (! account.accessToken || ! account.refreshToken) {
            throw new Error(`Missing tokens for account ${accountId}`);
        }

        // Decrypt the stored tokens
        const accessToken = decrypt(account.accessToken);
        const refreshToken = decrypt(account.refreshToken);

        // Initialize Gmail service with decrypted tokens
        const gmailService = new GmailService();
        const historicalEmails = await gmailService.getHistoricalEmailsForLearning(userId, 1000);

        console.log(`Fetched ${
            historicalEmails.length
        } historical emails for learning`);

        // Process the historical emails to extract patterns
        await processHistoricalEmails(userId, accountId, historicalEmails);

        // Mark learning as completed
        await updateEmailAccount(accountId, userId, {learningCompleted: true});

        console.log(`Learning completed for user ${userId}, account ${accountId}`);
        return {success: true};

    } catch (error) {
        console.error(`Error processing learning for user ${userId}:`, error);
        throw error;
    }
}

// Create workers (only if Redis is available)
export let emailProcessingWorker: Worker<EmailProcessingJob> |null = null;
export let draftGenerationWorker: Worker<DraftGenerationJob> |null = null;
export let learningWorker: Worker<LearningJob> |null = null;

if (redis && emailProcessingQueue && draftGenerationQueue && learningQueue) {
    emailProcessingWorker = new Worker<EmailProcessingJob>('email-processing', processEmailJob, {
        connection: redis,
        concurrency: 5
    });

    draftGenerationWorker = new Worker<DraftGenerationJob>('draft-generation', processDraftGenerationJob, {
        connection: redis,
        concurrency: 3
    });

    learningWorker = new Worker<LearningJob>('learning', processLearningJob, {
        connection: redis,
        concurrency: 2
    });
}

// Worker event handlers (only if workers exist)
if (emailProcessingWorker) {
    emailProcessingWorker.on('completed', (job) => {
        console.log(`Email processing job ${
            job.id
        } completed`);
    });

    emailProcessingWorker.on('failed', (job, err) => {
        console.error(`Email processing job ${
            job ?. id
        } failed:`, err);
    });
}

if (draftGenerationWorker) {
    draftGenerationWorker.on('completed', (job) => {
        console.log(`Draft generation job ${
            job.id
        } completed`);
    });

    draftGenerationWorker.on('failed', (job, err) => {
        console.error(`Draft generation job ${
            job ?. id
        } failed:`, err);
    });
}

if (learningWorker) {
    learningWorker.on('completed', (job) => {
        console.log(`Learning job ${
            job.id
        } completed`);
    });

    learningWorker.on('failed', (job, err) => {
        console.error(`Learning job ${
            job ?. id
        } failed:`, err);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down workers...');
    if (emailProcessingWorker) 
        await emailProcessingWorker.close();
    


    if (draftGenerationWorker) 
        await draftGenerationWorker.close();
    


    if (learningWorker) 
        await learningWorker.close();
    


    if (redis) 
        await redis.quit();
    


    process.exit(0);
});

// Helper functions for adding jobs
export async function addEmailProcessingJob(data: EmailProcessingJob) {
    if (emailProcessingQueue) {
        return await emailProcessingQueue.add('process-email', data, {
            priority: data.emailData.urgency === 'high' ? 1 : data.emailData.urgency === 'medium' ? 2 : 3
        });
    } else { // Process immediately if no queue available
        return await processEmailJob({data}
        as any);
    }
}

export async function addDraftGenerationJob(data: DraftGenerationJob) {
    if (draftGenerationQueue) {
        return await draftGenerationQueue.add('generate-draft', data);
    } else { // Process immediately if no queue available
        return await processDraftGenerationJob({data}
        as any);
    }
}

export async function addLearningJob(data: LearningJob) {
    if (learningQueue) {
        return await learningQueue.add('process-learning', data, {
            delay: 5000 // Delay learning jobs to not overwhelm the system
        });
    } else { // Process immediately if no queue available (with error handling)
        setTimeout(async () => {
            try {
                await processLearningJob({data}
                as any);
            } catch (error) {
                console.error('Error in immediate learning job processing:', error);
                // Don't crash the server - just log the error
            }
        }, 5000);
    }
}
