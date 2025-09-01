import * as fs from 'fs';
import * as path from 'path';

// Core Writing Style Variables
interface WritingStyleProfile { // 1. Tone & Formality Patterns
    toneFormality: {
        formalityScore: {
        [emailType: string]: number
        }; // 1-10 scale
        toneDistribution: {
            formal: number;
            casual: number;
            neutral: number;
        };
        formalityTriggers: string[];
        contextFormalityMap: {
        [relationship: string]: number
        };
    };

    // 2. Greeting & Closing Patterns
    greetingClosing: {
        greetingStyles: {
        [relationship: string]: string[]
        };
        closingStyles: {
        [relationship: string]: string[]
        };
        nameUsagePattern: 'first_names' | 'formal_titles' | 'mixed';
    };

    // 3. Communication Personality Traits
    personalityTraits: {
        directnessLevel: number; // 1-10: blunt to diplomatic
        warmthLevel: number; // 1-10: cold to very friendly
        enthusiasmIndicators: string[];
        politenessMarkers: string[];
        urgencyStyle: string[];
    };

    // 4. Email Length & Structure
    messageStructure: {
        avgWordCount: {
        [emailType: string]: number
        };
        sentenceCountPreference: number;
        paragraphStyle: 'single' | 'multiple';
        bulletPointUsage: number; // frequency
        lineBreakPatterns: string[];
    };

    // 5. Language & Vocabulary Patterns
    languageVocabulary: {
        commonPhrases: string[];
        signatureWords: string[];
        abbreviationUsage: 'frequent' | 'moderate' | 'rare';
        technicalLanguageLevel: number; // 1-10
        contractionsUsage: 'frequent' | 'moderate' | 'rare';
    };

    // 6. Relationship-Specific Variables
    relationshipMapping: {
        relationshipClassifications: {
        [email: string]: string
        };
        communicationHistorySummary: {
        [email: string]: any
        };
        responseTimePatterns: {
        [priority: string]: number
        };
        topicFormalityMapping: {
        [topic: string]: number
        };
    };

    // 7. Response Context Patterns
    responsePatterns: {
        responseTriggers: string[];
        responseLengthCorrelation: boolean;
        escalationPatterns: string[];
        followUpStyle: 'proactive' | 'reactive';
    };

    // 8. Emotional Expression
    emotionalExpression: {
        emojiUsageFrequency: number;
        exclamationPointUsage: number;
        positiveLanguageMarkers: string[];
        concernExpressionStyle: string[];
        appreciationExpression: string[];
    };

    // 9. Social & Cultural Patterns
    socialCultural: {
        smallTalkFrequency: number;
        culturalMarkers: string[];
        humorUsage: number;
        boundaryStyle: 'professional' | 'personal' | 'mixed';
    };

    // 10. Situational Response Patterns
    situationalPatterns: {
        meetingRequestStyle: string[];
        deadlineCommunication: string[];
        problemEscalationTone: string[];
        praiseGivingStyle: string[];
        informationSharingPattern: 'detailed' | 'brief' | 'mixed';
    };
}

interface EmailData {
    id: string;
    threadId: string;
    sender: string;
    recipient: string[];
    subject: string;
    body: string;
    timestamp: Date;
    isFromSent: boolean;
    threadContext?: EmailData[];
}

class WritingStyleAnalyzer {
    private profile : WritingStyleProfile;

    constructor() {
        this.profile = this.initializeProfile();
    }

    private initializeProfile(): WritingStyleProfile {
        return {
            toneFormality: {
                formalityScore: {},
                toneDistribution: {
                    formal: 0,
                    casual: 0,
                    neutral: 0
                },
                formalityTriggers: [],
                contextFormalityMap: {}
            },
            greetingClosing: {
                greetingStyles: {},
                closingStyles: {},
                nameUsagePattern: 'mixed'
            },
            personalityTraits: {
                directnessLevel: 5,
                warmthLevel: 5,
                enthusiasmIndicators: [],
                politenessMarkers: [],
                urgencyStyle: []
            },
            messageStructure: {
                avgWordCount: {},
                sentenceCountPreference: 0,
                paragraphStyle: 'multiple',
                bulletPointUsage: 0,
                lineBreakPatterns: []
            },
            languageVocabulary: {
                commonPhrases: [],
                signatureWords: [],
                abbreviationUsage: 'moderate',
                technicalLanguageLevel: 5,
                contractionsUsage: 'moderate'
            },
            relationshipMapping: {
                relationshipClassifications: {},
                communicationHistorySummary: {},
                responseTimePatterns: {},
                topicFormalityMapping: {}
            },
            responsePatterns: {
                responseTriggers: [],
                responseLengthCorrelation: false,
                escalationPatterns: [],
                followUpStyle: 'reactive'
            },
            emotionalExpression: {
                emojiUsageFrequency: 0,
                exclamationPointUsage: 0,
                positiveLanguageMarkers: [],
                concernExpressionStyle: [],
                appreciationExpression: []
            },
            socialCultural: {
                smallTalkFrequency: 0,
                culturalMarkers: [],
                humorUsage: 0,
                boundaryStyle: 'professional'
            },
            situationalPatterns: {
                meetingRequestStyle: [],
                deadlineCommunication: [],
                problemEscalationTone: [],
                praiseGivingStyle: [],
                informationSharingPattern: 'mixed'
            }
        };
    }

    // Analyze greeting patterns
    private analyzeGreetings(emails : EmailData[]): void {
        const greetingPatterns: {
        [key: string]: string[]
        } = {};
        const closingPatterns: {
        [key: string]: string[]
        } = {};

        emails.forEach(email => {
            if (!email.isFromSent) 
                return;
            

            const body = email.body.toLowerCase();
            const lines = body.split('\n').map(line => line.trim());

            // Extract greeting (first few lines)
            const firstLines = lines.slice(0, 3).join(' ');
            const greetingMatch = firstLines.match(/(dear|hello|hi|hey|good morning|good afternoon)[^.!?]*[.!?]?/i);

            if (greetingMatch) {
                const relationship = this.classifyRelationship(email.recipient[0] || '');
                if (! greetingPatterns[relationship]) 
                    greetingPatterns[relationship] = [];
                
                greetingPatterns[relationship].push(greetingMatch[0]);
            }

            // Extract closing (last few lines)
            const lastLines = lines.slice(-3).join(' ');
            const closingMatch = lastLines.match(/(best regards|kind regards|sincerely|thanks|cheers|best|talk soon)[^.!?]*[.!?]?/i);

            if (closingMatch) {
                const relationship = this.classifyRelationship(email.recipient[0] || '');
                if (! closingPatterns[relationship]) 
                    closingPatterns[relationship] = [];
                
                closingPatterns[relationship].push(closingMatch[0]);
            }
        });

        this.profile.greetingClosing.greetingStyles = greetingPatterns;
        this.profile.greetingClosing.closingStyles = closingPatterns;
    }

    // Analyze formality patterns
    private analyzeFormalityPatterns(emails : EmailData[]): void {
        let formalCount = 0;
        let casualCount = 0;
        let neutralCount = 0;

        emails.forEach(email => {
            if (!email.isFromSent) 
                return;
            

            const formalityScore = this.calculateFormalityScore(email.body);
            const emailType = this.classifyEmailType(email.subject, email.body);

            this.profile.toneFormality.formalityScore[emailType] = formalityScore;

            if (formalityScore >= 7) 
                formalCount++;
             else if (formalityScore <= 3) 
                casualCount++;
             else 
                neutralCount++;
            

            // Map formality to relationship
            const relationship = this.classifyRelationship(email.recipient[0] || '');
            this.profile.toneFormality.contextFormalityMap[relationship] = formalityScore;
        });

        const total = formalCount + casualCount + neutralCount;
        if (total > 0) {
            this.profile.toneFormality.toneDistribution = {
                formal: (formalCount / total) * 100,
                casual: (casualCount / total) * 100,
                neutral: (neutralCount / total) * 100
            };
        }
    }

    // Calculate formality score (1-10)
    private calculateFormalityScore(body : string): number {
        const text = body.toLowerCase();
        let score = 5;
        // Start neutral

        // Formal indicators (+)
        const formalWords = [
            'dear',
            'sincerely',
            'regards',
            'please',
            'thank you',
            'appreciate',
            'kindly'
        ];
        const formalCount = formalWords.filter(word => text.includes(word)).length;
        score += formalCount * 0.5;

        // Casual indicators (-)
        const casualWords = [
            'hey',
            'hi there',
            'thanks',
            'cheers',
            'awesome',
            'cool',
            'yeah'
        ];
        const casualCount = casualWords.filter(word => text.includes(word)).length;
        score -= casualCount * 0.5;

        // Contractions (casual)
        const contractions = text.match(/\b\w+'\w+\b/g) || [];
        score -= contractions.length * 0.1;

        // Exclamation points (casual)
        const exclamations = (text.match(/!/g) || []).length;
        score -= exclamations * 0.2;

        return Math.max(1, Math.min(10, score));
    }

    // Analyze personality traits
    private analyzePersonalityTraits(emails : EmailData[]): void {
        let totalDirectness = 0;
        let totalWarmth = 0;
        const enthusiasmWords: string[] = [];
        const politenessWords: string[] = [];
        const urgencyWords: string[] = [];

        emails.forEach(email => {
            if (!email.isFromSent) 
                return;
            

            const body = email.body.toLowerCase();

            // Directness analysis
            const directWords = [
                'need',
                'must',
                'should',
                'require',
                'immediately'
            ];
            const diplomaticWords = [
                'perhaps',
                'might',
                'could',
                'would appreciate',
                'if possible'
            ];

            const directCount = directWords.filter(word => body.includes(word)).length;
            const diplomaticCount = diplomaticWords.filter(word => body.includes(word)).length;

            totalDirectness += directCount > diplomaticCount ? 7 : 3;

            // Warmth analysis
            const warmWords = [
                'great',
                'wonderful',
                'excellent',
                'looking forward',
                'excited'
            ];
            const coldWords = ['fine', 'okay', 'noted', 'understood'];

            const warmCount = warmWords.filter(word => body.includes(word)).length;
            const coldCount = coldWords.filter(word => body.includes(word)).length;

            totalWarmth += warmCount > coldCount ? 7 : 3;

            // Collect enthusiasm indicators
            const enthusiasm = body.match(/(great|awesome|excellent|fantastic|amazing|wonderful)!/gi) || [];
            enthusiasmWords.push(... enthusiasm);

            // Collect politeness markers
            const politeness = body.match(/(please|thank you|thanks|appreciate|kindly)/gi) || [];
            politenessWords.push(... politeness);

            // Collect urgency style
            const urgency = body.match(/(asap|urgent|immediately|rush|deadline|time-sensitive)/gi) || [];
            urgencyWords.push(... urgency);
        });

        const emailCount = emails.filter(e => e.isFromSent).length;
        if (emailCount > 0) {
            this.profile.personalityTraits.directnessLevel = totalDirectness / emailCount;
            this.profile.personalityTraits.warmthLevel = totalWarmth / emailCount;
        }

        this.profile.personalityTraits.enthusiasmIndicators = [...new Set(enthusiasmWords)];
        this.profile.personalityTraits.politenessMarkers = [...new Set(politenessWords)];
        this.profile.personalityTraits.urgencyStyle = [...new Set(urgencyWords)];
    }

    // Analyze message structure
    private analyzeMessageStructure(emails : EmailData[]): void {
        const wordCounts: {
        [type: string]: number[]
        } = {};
        let totalSentences = 0;
        let totalEmails = 0;
        let bulletPointCount = 0;

        emails.forEach(email => {
            if (!email.isFromSent) 
                return;
            

            const body = email.body;
            const emailType = this.classifyEmailType(email.subject, body);

            // Word count
            const wordCount = body.split(/\s+/).length;
            if (! wordCounts[emailType]) 
                wordCounts[emailType] = [];
            
            wordCounts[emailType].push(wordCount);

            // Sentence count
            const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 0);
            totalSentences += sentences.length;
            totalEmails++;

            // Bullet points
            const bullets = body.match(/^\s*[-*•]\s/gm) || [];
            bulletPointCount += bullets.length;
        });

        // Calculate averages
        Object.keys(wordCounts).forEach(type => {
            const counts = wordCounts[type];
            this.profile.messageStructure.avgWordCount[type] = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        });

        if (totalEmails > 0) {
            this.profile.messageStructure.sentenceCountPreference = totalSentences / totalEmails;
            this.profile.messageStructure.bulletPointUsage = bulletPointCount / totalEmails;
        }
    }

    // Analyze language and vocabulary
    private analyzeLanguageVocabulary(emails : EmailData[]): void {
        const allText = emails.filter(e => e.isFromSent).map(e => e.body.toLowerCase()).join(' ');

        // Common phrases (2-4 word combinations)
        const phrases = this.extractCommonPhrases(allText);
        this.profile.languageVocabulary.commonPhrases = phrases;

        // Signature words (frequently used words)
        const words = allText.split(/\s+/).filter(word => word.length > 3);
        const wordFreq: {
        [word: string]: number
        } = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        const sortedWords = Object.entries(wordFreq).sort(([
            , a
        ], [, b]) => b - a).slice(0, 20).map(([word]) => word);

        this.profile.languageVocabulary.signatureWords = sortedWords;

        // Abbreviation usage
        const abbreviations = allText.match(/\b[A-Z]{2,}\b/g) || [];
        const abbreviationFreq = abbreviations.length / words.length;

        if (abbreviationFreq > 0.05) 
            this.profile.languageVocabulary.abbreviationUsage = 'frequent';
         else if (abbreviationFreq > 0.02) 
            this.profile.languageVocabulary.abbreviationUsage = 'moderate';
         else 
            this.profile.languageVocabulary.abbreviationUsage = 'rare';
        

        // Contractions usage
        const contractions = allText.match(/\b\w+'\w+\b/g) || [];
        const contractionFreq = contractions.length / words.length;

        if (contractionFreq > 0.05) 
            this.profile.languageVocabulary.contractionsUsage = 'frequent';
         else if (contractionFreq > 0.02) 
            this.profile.languageVocabulary.contractionsUsage = 'moderate';
         else 
            this.profile.languageVocabulary.contractionsUsage = 'rare';
        
    }

    // Extract common phrases
    private extractCommonPhrases(text : string): string[]{
        const words = text.split(/\s+/);
        const phrases: {
        [phrase: string]: number
        } = {};

        // Extract 2-4 word phrases
        for (let len = 2; len <= 4; len++) {
            for (let i = 0; i <= words.length - len; i++) {
                const phrase = words.slice(i, i + len).join(' ');
                if (phrase.length > 5) { // Skip very short phrases
                    phrases[phrase] = (phrases[phrase] || 0) + 1;
                }
            }
        }

        return Object.entries(phrases).filter(
            ([, count]) => count >= 2
        ) // Appears at least twice.sort(
            ([
                , a
            ], [, b]) => b - a
        ).slice(0, 15).map(
            ([phrase]) => phrase
        );
    }

    // Classify email type
    private classifyEmailType(subject : string, body : string): string {
        const subjectLower = subject.toLowerCase();
        const bodyLower = body.toLowerCase();

        if (subjectLower.includes('meeting') || bodyLower.includes('schedule')) 
            return 'meeting';
        
        if (subjectLower.includes('re:') || subjectLower.includes('fwd:')) 
            return 'response';
        
        if (bodyLower.includes('thank') || bodyLower.includes('appreciate')) 
            return 'appreciation';
        
        if (bodyLower.includes('urgent') || bodyLower.includes('asap')) 
            return 'urgent';
        
        if (bodyLower.includes('question') || bodyLower.includes('help')) 
            return 'inquiry';
        

        return 'general';
    }

    // Classify relationship
    private classifyRelationship(email : string): string {
        // This is a simplified classification - in real implementation,
        // you'd use more sophisticated logic or user input
        const domain = email.split('@')[1] || '';

        if (domain.includes('company.com')) 
            return 'colleague';
        
        if (email.includes('boss') || email.includes('manager')) 
            return 'boss';
        
        if (email.includes('client') || email.includes('customer')) 
            return 'client';
        

        return 'general';
    }

    // Main analysis method
    public analyzeEmails(emails : EmailData[]): WritingStyleProfile {
        console.log(`🔍 Analyzing ${
            emails.length
        } emails for writing style patterns...`);

        this.analyzeGreetings(emails);
        this.analyzeFormalityPatterns(emails);
        this.analyzePersonalityTraits(emails);
        this.analyzeMessageStructure(emails);
        this.analyzeLanguageVocabulary(emails);

        console.log('✅ Writing style analysis complete!');
        return this.profile;
    }

    // Save profile to file
    public saveProfile(filename : string = 'writing-style-profile.json'): string {
        const outputPath = path.join(process.cwd(), 'data', filename);

        // Ensure data directory exists
        const dataDir = path.dirname(outputPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, {recursive: true});
        }

        const profileData = {
            generatedAt: new Date().toISOString(),
            profile: this.profile,
            summary: this.generateSummary()
        };

        fs.writeFileSync(outputPath, JSON.stringify(profileData, null, 2));
        console.log(`💾 Writing style profile saved to: ${outputPath}`);

        return outputPath;
    }

    // Generate human-readable summary
    private generateSummary(): any {
        return {communicationStyle: this.getCommunicationStyle(), formalityLevel: this.getFormalityLevel(), personalityType: this.getPersonalityType(), writingCharacteristics: this.getWritingCharacteristics()};
    }

    private getCommunicationStyle(): string {
        const {formal, casual, neutral} = this.profile.toneFormality.toneDistribution;

        if (formal > 60) 
            return 'Highly Professional';
        
        if (casual > 60) 
            return 'Casual and Friendly';
        
        if (neutral > 50) 
            return 'Balanced and Adaptable';
        

        return 'Mixed Style';
    }

    private getFormalityLevel(): string {
        const avgFormality = Object.values(this.profile.toneFormality.formalityScore).reduce((sum, score) => sum + score, 0) / Object.values(this.profile.toneFormality.formalityScore).length;

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

    private getPersonalityType(): string {
        const directness = this.profile.personalityTraits.directnessLevel;
        const warmth = this.profile.personalityTraits.warmthLevel;

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

    private getWritingCharacteristics(): string[]{
        const characteristics: string[] = [];

        if (this.profile.personalityTraits.enthusiasmIndicators.length > 5) {
            characteristics.push('Uses enthusiastic language');
        }

        if (this.profile.personalityTraits.politenessMarkers.length > 10) {
            characteristics.push('Very polite and courteous');
        }

        if (this.profile.messageStructure.bulletPointUsage > 1) {
            characteristics.push('Frequently uses bullet points');
        }

        if (this.profile.languageVocabulary.abbreviationUsage === 'frequent') {
            characteristics.push('Uses many abbreviations');
        }

        if (this.profile.languageVocabulary.contractionsUsage === 'frequent') {
            characteristics.push('Uses contractions regularly');
        }

        return characteristics;
    }
}

export {
    WritingStyleAnalyzer,
    WritingStyleProfile,
    EmailData
};
