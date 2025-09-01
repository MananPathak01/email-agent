import * as fs from 'fs';
import * as path from 'path';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Complete Communication Profile based on COMMUNICATION_PROFILE_SPEC.md
interface CommunicationProfile {
    userId: string;
    generatedAt: string;
    confidence: number;
    sampleSize: number;

    // 4.1 Tone & Formality Patterns
    toneFormality: {
        formalityScore: {
        [relationship: string]: FeatureWithConfidence < number >; // 1-10 scale
        };
        toneDistribution: FeatureWithConfidence < {
            formal: number;
            neutral: number;
            casual: number;
        } >;
        formalityTriggers: FeatureWithConfidence < Array < {
            trigger: string;
            weight: number;
        } >>;
        contextFormalityMap: {
        [role: string]: FeatureWithConfidence < number >;
        };
        readabilityGrade: FeatureWithConfidence < number >;
        hedgingLevel: {
        [relationship: string]: FeatureWithConfidence < number >;
        };
    };

    // 4.2 Greeting & Closing Patterns
    greetingClosing: {
        greetingStyles: {
        [relationship: string]: FeatureWithConfidence < Array < {
                greeting: string;
                usage: number;
                capitalization: string;
            } >>;
        };
        closingStyles: {
        [relationship: string]: FeatureWithConfidence < Array < {
                closing: string;
                usage: number;
                punctuation: string;
            } >>;
        };
        nameUsagePattern: {
        [relationship: string]: FeatureWithConfidence < {
                firstName: number;
                fullName: number;
                honorific: number;
            } >;
        };
        signatureBlockPattern: FeatureWithConfidence < {
            components: string[];
            delimiterStyle: string;
        } >;
        signoffPunctuationStyle: FeatureWithConfidence < {
            punctuation: 'comma' | 'period' | 'none';
            newlineCount: number;
        } >;
    };

    // 4.3 Communication Personality Traits
    personalityTraits: {
        directnessLevel: FeatureWithConfidence < number >; // 1-10
        warmthLevel: FeatureWithConfidence < number >; // 1-10
        enthusiasmIndicators: FeatureWithConfidence < {
            rate: number;
            commonWords: string[];
        } >;
        politenessMarkers: FeatureWithConfidence < {
            rate: number;
            commonPhrases: string[];
        } >;
        urgencyStyle: FeatureWithConfidence < {
            preferredPhrases: Array < {
                phrase: string;
                usage: number;
            } >;
        } >;
        authorityExpression: FeatureWithConfidence < {
            preferredStyle: string;
            examples: string[];
        } >;
    };

    // 4.4 Email Length & Structure
    messageStructure: {
        avgWordCount: {
        [relationship: string]: FeatureWithConfidence < {
                mean: number;
                std: number;
            } >;
        };
        sentenceCountPreference: FeatureWithConfidence < {
            distribution: number[];
            preferred: number;
        } >;
        paragraphStyle: FeatureWithConfidence < 'one-block' | 'short-paragraphs' | 'multi-para' >;
        bulletPointUsage: FeatureWithConfidence < {
            frequency: number;
            preferredStyle: string[];
        } >;
        lineBreakPatterns: FeatureWithConfidence < {
            beforeGreeting: number;
            afterGreeting: number;
            beforeSignoff: number;
            betweenParagraphs: number;
        } >;
        sentenceVariability: FeatureWithConfidence < number >;
    };

    // 4.5 Language & Vocabulary
    languageVocabulary: {
        commonPhrases: FeatureWithConfidence < Array < {
            phrase: string;
            weight: number;
            sentiment: 'positive' | 'neutral' | 'avoid';
        } >>;
        signatureWords: FeatureWithConfidence < Array < {
            word: string;
            tfIdf: number;
        } >>;
        abbreviationUsage: FeatureWithConfidence < {
            frequency: number;
            preferredExpansions: Array < {
                abbrev: string;
                expansion: string;
            } >;
        } >;
        technicalLanguageLevel: FeatureWithConfidence < number >; // 1-10
        contractionsUsage: FeatureWithConfidence < number >; // percentage
        localeSpellingPreference: FeatureWithConfidence < {
            locale: 'en-US' | 'en-GB' | 'mixed';
            examples: Array < {
                usWord: string;
                gbWord: string;
                userPreference: string;
            } >;
        } >;
        styleEmbedding: FeatureWithConfidence < number[] >; // 768-dim vector
    };

    // 4.6 Relationship-Specific Variables
    relationshipSpecific: {
        relationshipClassification: {
        [email: string]: FeatureWithConfidence < {
                primary: string;
                distribution: {
                    boss: number;
                    colleague: number;
                    directReport: number;
                    client: number;
                    vendor: number;
                    friend: number;
                    family: number;
                    unknown: number;
                };
            } >;
        };
        communicationHistorySummary: {
        [contact: string]: FeatureWithConfidence < {
                topics: string[];
                tone: string;
                recentDecisions: string[];
            } >;
        };
        responseTimePatterns: {
        [contact: string]: FeatureWithConfidence < {
                median: number;
                distribution: number[];
                weekdayPattern: number[];
                timeOfDayPattern: number[];
            } >;
        };
        topicFormalityMapping: {
        [topic: string]: FeatureWithConfidence < number >;
        };
        contactGrouping: FeatureWithConfidence < Array < {
            groupName: string;
            contacts: string[];
            commonTraits: string[];
        } >>;
    };

    // 4.7 Response Context Patterns
    responseContext: {
        responseTriggers: FeatureWithConfidence < Array < {
            trigger: string;
            responseType: string;
            urgency: number;
        } >>;
        responseLengthCorrelation: FeatureWithConfidence < {
        [incomingLength: string]: string; // incoming -> outgoing length class
        } >;
        escalationPatterns: FeatureWithConfidence < Array < {
            trigger: string;
            toneShift: string;
            steps: string[];
        } >>;
        followUpStyle: FeatureWithConfidence < {
            type: 'proactive' | 'reactive';
            typicalInterval: number;
            commonPhrasing: string[];
        } >;
    };

    // 4.8 Emotional & Social Variables
    emotionalSocial: {
        emojiUsageFrequency: FeatureWithConfidence < {
            rate: number;
            allowedSet: string[];
        } >;
        exclamationPointUsage: FeatureWithConfidence < {
            per1000Words: number;
            maxPerEmail: number;
        } >;
        positiveLanguageMarkers: FeatureWithConfidence < {
            rate: number;
            sentimentMean: number;
            sentimentStd: number;
            commonWords: string[];
        } >;
        concernExpressionStyle: FeatureWithConfidence < {
            patterns: string[];
            preferredPhrases: string[];
        } >;
        appreciationExpression: FeatureWithConfidence < {
            formulas: string[];
            placement: 'beginning' | 'end' | 'both';
        } >;
        humorUsage: FeatureWithConfidence < {
            frequency: number;
            boundaries: 'light' | 'none' | 'moderate';
        } >;
    };

    // 4.9 Context-Aware Variables
    contextAware: {
        meetingRequestStyle: FeatureWithConfidence < {
            dateTimePhrasing: string;
            proposalStyle: 'slots' | 'options' | 'flexible';
            calendarLinkPreference: boolean;
        } >;
        deadlineCommunication: FeatureWithConfidence < {
            dateStyle: 'precise' | 'relative';
            bufferPreference: number;
            urgencyMarkers: string[];
        } >;
        problemEscalationTone: FeatureWithConfidence < {
            style: 'diplomatic' | 'direct';
            includesProposedFixes: boolean;
            escalationSteps: string[];
        } >;
        praiseGivingStyle: FeatureWithConfidence < {
            visibility: 'private' | 'public' | 'mixed';
            adjectives: string[];
            context: string[];
        } >;
        informationSharingPattern: FeatureWithConfidence < {
            style: 'brief' | 'detailed' | 'mixed';
            usesTldr: boolean;
            attachmentPreference: boolean;
        } >;
    };

    // 4.10 Thread Position Variables
    threadPosition: {
        threadStarterStyle: FeatureWithConfidence < {
            subjectLinePatterns: string[];
            openingContextSentences: number;
        } >;
        threadContinuationStyle: FeatureWithConfidence < {
            replyStyle: 'inline' | 'top-posting';
            quotedTextUsage: number;
        } >;
        threadClosingStyle: FeatureWithConfidence < {
            explicitClosure: boolean;
            closurePhrases: string[];
        } >;
    };

    // Additional Advanced Patterns
    timingPriority: {
        responseUrgencyIndicators: FeatureWithConfidence < string[] >;
        timeReferenceStyle: FeatureWithConfidence < {
            preference: 'specific' | 'flexible';
            examples: string[];
        } >;
        schedulingLanguage: FeatureWithConfidence < {
            flexibility: 'rigid' | 'flexible';
            commonPhrases: string[];
        } >;
        availabilityExpression: FeatureWithConfidence < {
            sharingStyle: 'detailed' | 'general';
            commonFormats: string[];
        } >;
    };

    decisionMaking: {
        decisionLanguage: FeatureWithConfidence < {
            preferredStyle: string;
            confidence: 'high' | 'medium' | 'low';
            examples: string[];
        } >;
        consensusBuildingApproach: FeatureWithConfidence < {
            style: 'collaborative' | 'directive';
            commonPhrases: string[];
        } >;
    };

    problemSolving: {
        issueReportingStyle: FeatureWithConfidence < {
            detail: 'summary' | 'detailed';
            structure: string[];
        } >;
        solutionPresentation: FeatureWithConfidence < {
            options: 'single' | 'multiple';
            reasoning: boolean;
        } >;
        riskCommunication: FeatureWithConfidence < {
            directness: number;
            commonPhrases: string[];
        } >;
    };
}

interface FeatureWithConfidence < T > {
    value: T;
    confidence: number; // 0-1
    lastUpdated: Date;
    sampleSize: number;
}

interface EmailData {
    threadId: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    wordCount: number;
    threadContext?: EmailData[];
}

class GroqCommunicationProfileAnalyzer {
    private groq : Groq;
    private maxTokens : number = 8000;
    private temperature : number = 0.1;

    constructor() {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY environment variable is required');
        }

        this.groq = new Groq({apiKey: process.env.GROQ_API_KEY});
    }

    /**
   * Analyze emails and generate comprehensive communication profile
   */
    async analyzeEmails(emailData : EmailData[], userId : string): Promise < CommunicationProfile > {
        console.log(`🔍 Starting Groq analysis for ${
            emailData.length
        } emails...`);

        try { // Create the comprehensive analysis prompt
            const prompt = this.createAnalysisPrompt(emailData);

            console.log(`📝 Sending ${
                prompt.length
            } characters to Groq...`);

            // Call Groq API
            const completion = await this.groq.chat.completions.create({
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
                temperature: this.temperature,
                max_tokens: this.maxTokens,
                response_format: {
                    type: "json_object"
                }
            });

            const response = completion.choices[0] ?. message ?. content;
            if (! response) {
                throw new Error('No response from Groq API');
            }

            console.log(`✅ Received ${
                response.length
            } characters from Groq`);

            // Parse and validate the response
            const analysisResult = JSON.parse(response);

            // Create the complete communication profile
            const profile = this.createCommunicationProfile(analysisResult, userId, emailData.length);

            console.log('🎯 Communication profile analysis complete!');
            return profile;

        } catch (error) {
            console.error('❌ Error in Groq analysis:', error);
            throw error;
        }
    }

    /**
   * Create the system prompt for Groq
   */
    private getSystemPrompt(): string {
        return `You are an expert communication pattern analyst. Your task is to analyze email data and extract comprehensive writing style patterns according to the Communication Profile Specification.

You must analyze ALL the following categories and return a complete JSON response:

1. Tone & Formality Patterns (formality scores, tone distribution, triggers)
2. Greeting & Closing Patterns (styles by relationship, name usage, signatures)
3. Personality Traits (directness, warmth, enthusiasm, politeness, urgency, authority)
4. Message Structure (word counts, sentences, paragraphs, bullets, line breaks)
5. Language & Vocabulary (phrases, signature words, abbreviations, technical level, contractions, spelling)
6. Relationship-Specific (classifications, history, response times, topics, grouping)
7. Response Context (triggers, length correlation, escalation, follow-up)
8. Emotional & Social (emojis, exclamations, positive language, concern, appreciation, humor)
9. Context-Aware (meetings, deadlines, problems, praise, information sharing)
10. Thread Position (starters, continuation, closing)
11. Timing & Priority (urgency indicators, time references, scheduling, availability)
12. Decision Making (language, consensus building)
13. Problem Solving (reporting style, solution presentation, risk communication)

For each feature, provide:
- value: the actual measurement/classification
- confidence: 0-1 score based on sample size and consistency
- sampleSize: number of emails this feature was derived from

Use relationship categories: boss, colleague, direct_report, client, vendor, friend, family, unknown

Return ONLY valid JSON. Be thorough and analytical.`;
    }

    /**
   * Create the analysis prompt with email data
   */
    private createAnalysisPrompt(emailData : EmailData[]): string {
        const sentEmails = emailData.filter(email => email.from && !email.from.includes('noreply') && email.wordCount > 5);

        const emailSamples = sentEmails.slice(0, 20).map((email, index) => {
            return `
EMAIL ${
                index + 1
            }:
To: ${
                email.to
            }
Subject: ${
                email.subject
            }
Body: ${
                email.body.substring(0, 1000)
            }${
                email.body.length > 1000 ? '...' : ''
            }
Word Count: ${
                email.wordCount
            }
---`;
        }).join('\n');

        return `Analyze these ${
            sentEmails.length
        } email samples to extract comprehensive communication patterns:

${emailSamples}

ANALYSIS REQUIREMENTS:

Extract ALL communication profile variables with confidence scores:

1. TONE & FORMALITY:
- Formality scores (1-10) by relationship type
- Tone distribution (formal/neutral/casual percentages)
- Formality triggers (keywords, contexts that increase formality)
- Readability grade (Flesch-Kincaid level)
- Hedging frequency by relationship

2. GREETINGS & CLOSINGS:
- Greeting styles by relationship with usage percentages
- Closing styles by relationship with punctuation patterns
- Name usage patterns (first name vs formal vs honorific percentages)
- Signature block components and style
- Sign-off punctuation preferences

3. PERSONALITY TRAITS:
- Directness level (1-10, diplomatic to blunt)
- Warmth level (1-10, cold to very friendly)
- Enthusiasm indicators (rate and common words)
- Politeness markers (rate and phrases)
- Urgency expression style and preferred phrases
- Authority expression preferences

4. MESSAGE STRUCTURE:
- Average word counts by relationship/topic with standard deviation
- Sentence count preferences and distribution
- Paragraph style (one-block/short-paragraphs/multi-para)
- Bullet point usage frequency and preferred styles
- Line break patterns (spacing around greetings, sign-offs, paragraphs)
- Sentence length variability

5. LANGUAGE & VOCABULARY:
- Common phrases with weights and sentiment flags
- Signature words with TF-IDF scores
- Abbreviation usage frequency and preferred expansions
- Technical language level (1-10)
- Contractions usage percentage
- Spelling locale preference (US/GB/mixed) with examples

6. RELATIONSHIP PATTERNS:
- Relationship classification for each contact
- Communication history summaries
- Response time patterns by contact/role
- Topic-formality mappings
- Contact groupings by domain/role

7. RESPONSE CONTEXT:
- Response triggers and urgency levels
- Length correlation patterns (incoming vs outgoing)
- Escalation patterns and tone shifts
- Follow-up style (proactive/reactive) and intervals

8. EMOTIONAL & SOCIAL:
- Emoji usage rate and allowed set
- Exclamation point frequency and limits
- Positive language markers and sentiment scores
- Concern expression patterns
- Appreciation expression formulas and placement
- Humor usage frequency and boundaries

9. CONTEXT-AWARE:
- Meeting request style and preferences
- Deadline communication patterns
- Problem escalation tone and approach
- Praise giving style and visibility
- Information sharing patterns

10. THREAD POSITION:
- Thread starter patterns (subject lines, opening context)
- Thread continuation style (inline/top-posting, quoting)
- Thread closing style and phrases

11. TIMING & PRIORITY:
- Urgency indicators and time reference styles
- Scheduling language flexibility
- Availability expression patterns

12. DECISION MAKING:
- Decision language confidence and style
- Consensus building approach

13. PROBLEM SOLVING:
- Issue reporting detail level and structure
- Solution presentation style (single/multiple options)
- Risk communication directness and phrases

Return comprehensive JSON with all categories populated and confidence scores.`;
    }

    /**
   * Create the complete communication profile from analysis results
   */
    private createCommunicationProfile(analysisResult : any, userId : string, sampleSize : number): CommunicationProfile {
        const now = new Date();

        return {
            userId,
            generatedAt: now.toISOString(),
            confidence: analysisResult.overallConfidence || 0.8,
            sampleSize,

            toneFormality: this.extractToneFormality(analysisResult.toneFormality || {}, now, sampleSize),
            greetingClosing: this.extractGreetingClosing(analysisResult.greetingClosing || {}, now, sampleSize),
            personalityTraits: this.extractPersonalityTraits(analysisResult.personalityTraits || {}, now, sampleSize),
            messageStructure: this.extractMessageStructure(analysisResult.messageStructure || {}, now, sampleSize),
            languageVocabulary: this.extractLanguageVocabulary(analysisResult.languageVocabulary || {}, now, sampleSize),
            relationshipSpecific: this.extractRelationshipSpecific(analysisResult.relationshipSpecific || {}, now, sampleSize),
            responseContext: this.extractResponseContext(analysisResult.responseContext || {}, now, sampleSize),
            emotionalSocial: this.extractEmotionalSocial(analysisResult.emotionalSocial || {}, now, sampleSize),
            contextAware: this.extractContextAware(analysisResult.contextAware || {}, now, sampleSize),
            threadPosition: this.extractThreadPosition(analysisResult.threadPosition || {}, now, sampleSize),
            timingPriority: this.extractTimingPriority(analysisResult.timingPriority || {}, now, sampleSize),
            decisionMaking: this.extractDecisionMaking(analysisResult.decisionMaking || {}, now, sampleSize),
            problemSolving: this.extractProblemSolving(analysisResult.problemSolving || {}, now, sampleSize)
        };
    }

    // Helper methods to extract each category (with default values)
    private extractToneFormality(data : any, date : Date, sampleSize : number): CommunicationProfile['toneFormality']{
        return {
            formalityScore: this.extractFormalityScores(data.formalityScore || {}, date, sampleSize),
            toneDistribution: this.createFeature(data.toneDistribution || {
                formal: 33,
                neutral: 34,
                casual: 33
            }, 0.7, date, sampleSize),
            formalityTriggers: this.createFeature(data.formalityTriggers || [], 0.6, date, sampleSize),
            contextFormalityMap: this.extractContextFormality(data.contextFormalityMap || {}, date, sampleSize),
            readabilityGrade: this.createFeature(data.readabilityGrade || 8.5, 0.8, date, sampleSize),
            hedgingLevel: this.extractHedgingLevel(data.hedgingLevel || {}, date, sampleSize)
        };
    }

    private extractGreetingClosing(data : any, date : Date, sampleSize : number): CommunicationProfile['greetingClosing']{
        return {
            greetingStyles: this.extractGreetingStyles(data.greetingStyles || {}, date, sampleSize),
            closingStyles: this.extractClosingStyles(data.closingStyles || {}, date, sampleSize),
            nameUsagePattern: this.extractNameUsage(data.nameUsagePattern || {}, date, sampleSize),
            signatureBlockPattern: this.createFeature(data.signatureBlockPattern || {
                components: [],
                delimiterStyle: 'standard'
            }, 0.7, date, sampleSize),
            signoffPunctuationStyle: this.createFeature(data.signoffPunctuationStyle || {
                punctuation: 'comma',
                newlineCount: 2
            }, 0.8, date, sampleSize)
        };
    }

    private extractPersonalityTraits(data : any, date : Date, sampleSize : number): CommunicationProfile['personalityTraits']{
        return {
            directnessLevel: this.createFeature(data.directnessLevel || 5.5, 0.7, date, sampleSize),
            warmthLevel: this.createFeature(data.warmthLevel || 6.2, 0.7, date, sampleSize),
            enthusiasmIndicators: this.createFeature(data.enthusiasmIndicators || {
                rate: 0.02,
                commonWords: []
            }, 0.6, date, sampleSize),
            politenessMarkers: this.createFeature(data.politenessMarkers || {
                rate: 0.05,
                commonPhrases: []
            }, 0.8, date, sampleSize),
            urgencyStyle: this.createFeature(data.urgencyStyle || {
                preferredPhrases: []
            }, 0.6, date, sampleSize),
            authorityExpression: this.createFeature(data.authorityExpression || {
                preferredStyle: 'collaborative',
                examples: []
            }, 0.7, date, sampleSize)
        };
    }

    private extractMessageStructure(data : any, date : Date, sampleSize : number): CommunicationProfile['messageStructure']{
        return {
            avgWordCount: this.extractWordCounts(data.avgWordCount || {}, date, sampleSize),
            sentenceCountPreference: this.createFeature(data.sentenceCountPreference || {
                distribution: [],
                preferred: 4
            }, 0.7, date, sampleSize),
            paragraphStyle: this.createFeature(data.paragraphStyle || 'multi-para', 0.8, date, sampleSize),
            bulletPointUsage: this.createFeature(data.bulletPointUsage || {
                frequency: 0.1,
                preferredStyle: ['-']
            }, 0.6, date, sampleSize),
            lineBreakPatterns: this.createFeature(data.lineBreakPatterns || {
                beforeGreeting: 0,
                afterGreeting: 1,
                beforeSignoff: 1,
                betweenParagraphs: 1
            }, 0.7, date, sampleSize),
            sentenceVariability: this.createFeature(data.sentenceVariability || 0.3, 0.6, date, sampleSize)
        };
    }

    private extractLanguageVocabulary(data : any, date : Date, sampleSize : number): CommunicationProfile['languageVocabulary']{
        return {
            commonPhrases: this.createFeature(data.commonPhrases || [], 0.8, date, sampleSize),
            signatureWords: this.createFeature(data.signatureWords || [], 0.7, date, sampleSize),
            abbreviationUsage: this.createFeature(data.abbreviationUsage || {
                frequency: 0.02,
                preferredExpansions: []
            }, 0.6, date, sampleSize),
            technicalLanguageLevel: this.createFeature(data.technicalLanguageLevel || 5.0, 0.7, date, sampleSize),
            contractionsUsage: this.createFeature(data.contractionsUsage || 15, 0.8, date, sampleSize),
            localeSpellingPreference: this.createFeature(data.localeSpellingPreference || {
                locale: 'en-US',
                examples: []
            }, 0.6, date, sampleSize),
            styleEmbedding: this.createFeature(data.styleEmbedding || [], 0.5, date, sampleSize)
        };
    }

    private extractRelationshipSpecific(data : any, date : Date, sampleSize : number): CommunicationProfile['relationshipSpecific']{
        return {
            relationshipClassification: this.extractRelationshipClassification(data.relationshipClassification || {}, date, sampleSize),
            communicationHistorySummary: this.extractCommunicationHistory(data.communicationHistorySummary || {}, date, sampleSize),
            responseTimePatterns: this.extractResponseTimePatterns(data.responseTimePatterns || {}, date, sampleSize),
            topicFormalityMapping: this.extractTopicFormality(data.topicFormalityMapping || {}, date, sampleSize),
            contactGrouping: this.createFeature(data.contactGrouping || [], 0.6, date, sampleSize)
        };
    }

    private extractResponseContext(data : any, date : Date, sampleSize : number): CommunicationProfile['responseContext']{
        return {
            responseTriggers: this.createFeature(data.responseTriggers || [], 0.7, date, sampleSize),
            responseLengthCorrelation: this.createFeature(data.responseLengthCorrelation || {}, 0.6, date, sampleSize),
            escalationPatterns: this.createFeature(data.escalationPatterns || [], 0.6, date, sampleSize),
            followUpStyle: this.createFeature(data.followUpStyle || {
                type: 'reactive',
                typicalInterval: 24,
                commonPhrasing: []
            }, 0.7, date, sampleSize)
        };
    }

    private extractEmotionalSocial(data : any, date : Date, sampleSize : number): CommunicationProfile['emotionalSocial']{
        return {
            emojiUsageFrequency: this.createFeature(data.emojiUsageFrequency || {
                rate: 0.001,
                allowedSet: []
            }, 0.8, date, sampleSize),
            exclamationPointUsage: this.createFeature(data.exclamationPointUsage || {
                per1000Words: 2,
                maxPerEmail: 3
            }, 0.9, date, sampleSize),
            positiveLanguageMarkers: this.createFeature(data.positiveLanguageMarkers || {
                rate: 0.03,
                sentimentMean: 0.1,
                sentimentStd: 0.2,
                commonWords: []
            }, 0.7, date, sampleSize),
            concernExpressionStyle: this.createFeature(data.concernExpressionStyle || {
                patterns: [],
                preferredPhrases: []
            }, 0.6, date, sampleSize),
            appreciationExpression: this.createFeature(data.appreciationExpression || {
                formulas: [],
                placement: 'end'
            }, 0.8, date, sampleSize),
            humorUsage: this.createFeature(data.humorUsage || {
                frequency: 0.01,
                boundaries: 'light'
            }, 0.5, date, sampleSize)
        };
    }

    private extractContextAware(data : any, date : Date, sampleSize : number): CommunicationProfile['contextAware']{
        return {
            meetingRequestStyle: this.createFeature(data.meetingRequestStyle || {
                dateTimePhrasing: 'flexible',
                proposalStyle: 'options',
                calendarLinkPreference: false
            }, 0.7, date, sampleSize),
            deadlineCommunication: this.createFeature(data.deadlineCommunication || {
                dateStyle: 'relative',
                bufferPreference: 1,
                urgencyMarkers: []
            }, 0.7, date, sampleSize),
            problemEscalationTone: this.createFeature(data.problemEscalationTone || {
                style: 'diplomatic',
                includesProposedFixes: true,
                escalationSteps: []
            }, 0.6, date, sampleSize),
            praiseGivingStyle: this.createFeature(data.praiseGivingStyle || {
                visibility: 'private',
                adjectives: [],
                context: []
            }, 0.6, date, sampleSize),
            informationSharingPattern: this.createFeature(data.informationSharingPattern || {
                style: 'mixed',
                usesTldr: false,
                attachmentPreference: false
            }, 0.7, date, sampleSize)
        };
    }

    private extractThreadPosition(data : any, date : Date, sampleSize : number): CommunicationProfile['threadPosition']{
        return {
            threadStarterStyle: this.createFeature(data.threadStarterStyle || {
                subjectLinePatterns: [],
                openingContextSentences: 1
            }, 0.7, date, sampleSize),
            threadContinuationStyle: this.createFeature(data.threadContinuationStyle || {
                replyStyle: 'top-posting',
                quotedTextUsage: 0.3
            }, 0.8, date, sampleSize),
            threadClosingStyle: this.createFeature(data.threadClosingStyle || {
                explicitClosure: false,
                closurePhrases: []
            }, 0.6, date, sampleSize)
        };
    }

    private extractTimingPriority(data : any, date : Date, sampleSize : number): CommunicationProfile['timingPriority']{
        return {
            responseUrgencyIndicators: this.createFeature(data.responseUrgencyIndicators || [], 0.7, date, sampleSize),
            timeReferenceStyle: this.createFeature(data.timeReferenceStyle || {
                preference: 'flexible',
                examples: []
            }, 0.6, date, sampleSize),
            schedulingLanguage: this.createFeature(data.schedulingLanguage || {
                flexibility: 'flexible',
                commonPhrases: []
            }, 0.7, date, sampleSize),
            availabilityExpression: this.createFeature(data.availabilityExpression || {
                sharingStyle: 'general',
                commonFormats: []
            }, 0.6, date, sampleSize)
        };
    }

    private extractDecisionMaking(data : any, date : Date, sampleSize : number): CommunicationProfile['decisionMaking']{
        return {
            decisionLanguage: this.createFeature(data.decisionLanguage || {
                preferredStyle: 'collaborative',
                confidence: 'medium',
                examples: []
            }, 0.6, date, sampleSize),
            consensusBuildingApproach: this.createFeature(data.consensusBuildingApproach || {
                style: 'collaborative',
                commonPhrases: []
            }, 0.6, date, sampleSize)
        };
    }

    private extractProblemSolving(data : any, date : Date, sampleSize : number): CommunicationProfile['problemSolving']{
        return {
            issueReportingStyle: this.createFeature(data.issueReportingStyle || {
                detail: 'detailed',
                structure: []
            }, 0.7, date, sampleSize),
            solutionPresentation: this.createFeature(data.solutionPresentation || {
                options: 'single',
                reasoning: true
            }, 0.7, date, sampleSize),
            riskCommunication: this.createFeature(data.riskCommunication || {
                directness: 6,
                commonPhrases: []
            }, 0.6, date, sampleSize)
        };
    }

    // Helper methods for complex extractions
    private extractFormalityScores(data : any, date : Date, sampleSize : number): {
    [relationship: string]: FeatureWithConfidence < number >
    } {
        const relationships = [
            'colleague',
            'boss',
            'client',
            'vendor',
            'friend',
            'unknown'
        ];
        const result: {
        [relationship: string]: FeatureWithConfidence < number >
        } = {};

        relationships.forEach(rel => {
            result[rel] = this.createFeature(data[rel] || 5.5, 0.7, date, sampleSize);
        });

        return result;
    }

    private extractContextFormality(data : any, date : Date, sampleSize : number): {
    [role: string]: FeatureWithConfidence < number >
    } {
        const roles = [
            'boss',
            'colleague',
            'direct_report',
            'client',
            'vendor',
            'friend',
            'family',
            'unknown'
        ];
        const result: {
        [role: string]: FeatureWithConfidence < number >
        } = {};

        roles.forEach(role => {
            result[role] = this.createFeature(data[role] || 5.5, 0.7, date, sampleSize);
        });

        return result;
    }

    private extractHedgingLevel(data : any, date : Date, sampleSize : number): {
    [relationship: string]: FeatureWithConfidence < number >
    } {
        const relationships = [
            'colleague',
            'boss',
            'client',
            'vendor',
            'friend',
            'unknown'
        ];
        const result: {
        [relationship: string]: FeatureWithConfidence < number >
        } = {};

        relationships.forEach(rel => {
            result[rel] = this.createFeature(data[rel] || 0.1, 0.6, date, sampleSize);
        });

        return result;
    }

    private extractGreetingStyles(data : any, date : Date, sampleSize : number): {
    [relationship: string]: FeatureWithConfidence < Array < {
            greeting: string;
            usage: number;
            capitalization: string
        } >>
    } {
        const relationships = [
            'colleague',
            'boss',
            'client',
            'vendor',
            'friend',
            'unknown'
        ];
        const result: {
        [relationship: string]: FeatureWithConfidence < Array < {
                greeting: string;
                usage: number;
                capitalization: string
            } >>
        } = {};

        relationships.forEach(rel => {
            result[rel] = this.createFeature(data[rel] || [], 0.8, date, sampleSize);
        });

        return result;
    }

    private extractClosingStyles(data : any, date : Date, sampleSize : number): {
    [relationship: string]: FeatureWithConfidence < Array < {
            closing: string;
            usage: number;
            punctuation: string
        } >>
    } {
        const relationships = [
            'colleague',
            'boss',
            'client',
            'vendor',
            'friend',
            'unknown'
        ];
        const result: {
        [relationship: string]: FeatureWithConfidence < Array < {
                closing: string;
                usage: number;
                punctuation: string
            } >>
        } = {};

        relationships.forEach(rel => {
            result[rel] = this.createFeature(data[rel] || [], 0.8, date, sampleSize);
        });

        return result;
    }

    private extractNameUsage(data : any, date : Date, sampleSize : number): {
    [relationship: string]: FeatureWithConfidence < {
            firstName: number;
            fullName: number;
            honorific: number
        } >
    } {
        const relationships = [
            'colleague',
            'boss',
            'client',
            'vendor',
            'friend',
            'unknown'
        ];
        const result: {
        [relationship: string]: FeatureWithConfidence < {
                firstName: number;
                fullName: number;
                honorific: number
            } >
        } = {};

        relationships.forEach(rel => {
            result[rel] = this.createFeature(data[rel] || {
                firstName: 70,
                fullName: 20,
                honorific: 10
            }, 0.7, date, sampleSize);
        });

        return result;
    }

    private extractWordCounts(data : any, date : Date, sampleSize : number): {
    [relationship: string]: FeatureWithConfidence < {
            mean: number;
            std: number
        } >
    } {
        const relationships = [
            'colleague',
            'boss',
            'client',
            'vendor',
            'friend',
            'unknown'
        ];
        const result: {
        [relationship: string]: FeatureWithConfidence < {
                mean: number;
                std: number
            } >
        } = {};

        relationships.forEach(rel => {
            result[rel] = this.createFeature(data[rel] || {
                mean: 150,
                std: 50
            }, 0.8, date, sampleSize);
        });

        return result;
    }

    private extractRelationshipClassification(data : any, date : Date, sampleSize : number): {
    [email: string]: FeatureWithConfidence < {
            primary: string;
            distribution: any
        } >
    } {
        const result: {
        [email: string]: FeatureWithConfidence < {
                primary: string;
                distribution: any
            } >
        } = {};

        Object.keys(data).forEach(email => {
            result[email] = this.createFeature(data[email] || {
                primary: 'unknown',
                distribution: {
                    boss: 0,
                    colleague: 0,
                    directReport: 0,
                    client: 0,
                    vendor: 0,
                    friend: 0,
                    family: 0,
                    unknown: 100
                }
            }, 0.6, date, sampleSize);
        });

        return result;
    }

    private extractCommunicationHistory(data : any, date : Date, sampleSize : number): {
    [contact: string]: FeatureWithConfidence < {
            topics: string[];
            tone: string;
            recentDecisions: string[]
        } >
    } {
        const result: {
        [contact: string]: FeatureWithConfidence < {
                topics: string[];
                tone: string;
                recentDecisions: string[]
            } >
        } = {};

        Object.keys(data).forEach(contact => {
            result[contact] = this.createFeature(data[contact] || {
                topics: [],
                tone: 'neutral',
                recentDecisions: []
            }, 0.6, date, sampleSize);
        });

        return result;
    }

    private extractResponseTimePatterns(data : any, date : Date, sampleSize : number): {
    [contact: string]: FeatureWithConfidence < {
            median: number;
            distribution: number[];
            weekdayPattern: number[];
            timeOfDayPattern: number[]
        } >
    } {
        const result: {
        [contact: string]: FeatureWithConfidence < {
                median: number;
                distribution: number[];
                weekdayPattern: number[];
                timeOfDayPattern: number[]
            } >
        } = {};

        Object.keys(data).forEach(contact => {
            result[contact] = this.createFeature(data[contact] || {
                median: 120,
                distribution: [],
                weekdayPattern: [
                    1,
                    1,
                    1,
                    1,
                    1,
                    0.3,
                    0.1
                ],
                timeOfDayPattern: Array(24).fill(0.04)
            }, 0.5, date, sampleSize);
        });

        return result;
    }

    private extractTopicFormality(data : any, date : Date, sampleSize : number): {
    [topic: string]: FeatureWithConfidence < number >
    } {
        const topics = [
            'meeting',
            'project',
            'invoice',
            'social',
            'urgent',
            'general'
        ];
        const result: {
        [topic: string]: FeatureWithConfidence < number >
        } = {};

        topics.forEach(topic => {
            result[topic] = this.createFeature(data[topic] || 5.5, 0.6, date, sampleSize);
        });

        return result;
    }

    /**
   * Helper to create a FeatureWithConfidence object
   */
    private createFeature<T>(value : T, confidence : number, date : Date, sampleSize : number): FeatureWithConfidence < T > {
        return {value, confidence, lastUpdated: date, sampleSize};
    }

    /**
   * Save the communication profile to a file
   */
    async saveProfile(profile : CommunicationProfile, filename? : string): Promise < string > {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `communication-profile-${
            profile.userId
        }-${timestamp}.json`;
        const outputFilename = filename || defaultFilename;
        const outputPath = path.join(process.cwd(), 'data', outputFilename);

        // Ensure data directory exists
        const dataDir = path.dirname(outputPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, {recursive: true});
        }

        // Save the profile
        fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2));
        console.log(`💾 Communication profile saved to: ${outputPath}`);

        // Also save a summary
        const summaryPath = path.join(process.cwd(), 'data', `summary-${outputFilename}`);
        const summary = this.generateProfileSummary(profile);
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        console.log(`📊 Profile summary saved to: ${summaryPath}`);

        return outputPath;
    }

    /**
   * Generate a human-readable summary of the profile
   */
    private generateProfileSummary(profile : CommunicationProfile): any {
        return {
            userId: profile.userId,
            generatedAt: profile.generatedAt,
            overallConfidence: profile.confidence,
            sampleSize: profile.sampleSize,

            summary: {
                communicationStyle: this.getCommunicationStyle(profile),
                formalityLevel: this.getFormalityLevel(profile),
                personalityType: this.getPersonalityType(profile),
                writingCharacteristics: this.getWritingCharacteristics(profile),
                relationshipAdaptation: this.getRelationshipAdaptation(profile),
                responsePatterns: this.getResponsePatterns(profile)
            },

            keyInsights: {
                mostFormalRelationship: this.getMostFormalRelationship(profile),
                preferredGreeting: this.getPreferredGreeting(profile),
                averageEmailLength: this.getAverageEmailLength(profile),
                urgencyStyle: profile.personalityTraits.urgencyStyle.value,
                decisionMakingStyle: profile.decisionMaking.decisionLanguage.value.preferredStyle
            }
        };
    }

    private getCommunicationStyle(profile : CommunicationProfile): string {
        const tone = profile.toneFormality.toneDistribution.value;
        if (tone.formal > 60) 
            return 'Highly Professional';
        
        if (tone.casual > 60) 
            return 'Casual and Friendly';
        
        if (tone.neutral > 50) 
            return 'Balanced and Adaptable';
        
        return 'Mixed Style';
    }

    private getFormalityLevel(profile : CommunicationProfile): string {
        const scores = Object.values(profile.toneFormality.formalityScore);
        const avgFormality = scores.reduce((sum, score) => sum + score.value, 0) / scores.length;

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

    private getPersonalityType(profile : CommunicationProfile): string {
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

    private getWritingCharacteristics(profile : CommunicationProfile): string[]{
        const characteristics: string[] = [];

        if (profile.personalityTraits.enthusiasmIndicators.value.rate > 0.02) {
            characteristics.push('Uses enthusiastic language');
        }

        if (profile.personalityTraits.politenessMarkers.value.rate > 0.05) {
            characteristics.push('Very polite and courteous');
        }

        if (profile.messageStructure.bulletPointUsage.value.frequency > 0.2) {
            characteristics.push('Frequently uses bullet points');
        }

        if (profile.languageVocabulary.contractionsUsage.value > 20) {
            characteristics.push('Uses contractions regularly');
        }

        return characteristics;
    }

    private getRelationshipAdaptation(profile : CommunicationProfile): string {
        const formalityScores = profile.toneFormality.formalityScore;
        const scores = Object.values(formalityScores).map(f => f.value);
        const variance = this.calculateVariance(scores);

        if (variance > 4) 
            return 'Highly adaptive to relationship context';
        
        if (variance > 2) 
            return 'Moderately adaptive to relationship context';
        
        return 'Consistent across relationships';
    }

    private getResponsePatterns(profile : CommunicationProfile): string {
        const followUp = profile.responseContext.followUpStyle.value;
        return `${
            followUp.type
        } follow-up style, typical interval: ${
            followUp.typicalInterval
        } hours`;
    }

    private getMostFormalRelationship(profile : CommunicationProfile): string {
        const formalityScores = profile.toneFormality.formalityScore;
        let maxScore = 0;
        let mostFormal = 'unknown';

        Object.entries(formalityScores).forEach(([rel, score]) => {
            if (score.value > maxScore) {
                maxScore = score.value;
                mostFormal = rel;
            }
        });

        return mostFormal;
    }

    private getPreferredGreeting(profile : CommunicationProfile): string {
        const greetings = profile.greetingClosing.greetingStyles;
        // Find the most common greeting across all relationships
        const allGreetings: {
        [greeting: string]: number
        } = {};

        Object.values(greetings).forEach(relGreetings => {
            relGreetings.value.forEach(g => {
                allGreetings[g.greeting] = (allGreetings[g.greeting] || 0) + g.usage;
            });
        });

        const mostCommon = Object.entries(allGreetings).sort(([
            , a
        ], [, b]) => b - a)[0];
        return mostCommon ? mostCommon[0] : 'Hi';
    }

    private getAverageEmailLength(profile : CommunicationProfile): number {
        const wordCounts = Object.values(profile.messageStructure.avgWordCount);
        const avgLength = wordCounts.reduce((sum, wc) => sum + wc.value.mean, 0) / wordCounts.length;
        return Math.round(avgLength);
    }

    private calculateVariance(numbers : number[]): number {
        const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
        return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
    }
}

export {
    GroqCommunicationProfileAnalyzer,
    CommunicationProfile,
    EmailData
};
