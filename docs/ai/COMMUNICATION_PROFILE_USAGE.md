# Communication Profile System Usage Guide

## Overview

The Communication Profile System analyzes your email patterns using Groq LLM to extract comprehensive writing style features. This creates a detailed profile that can be used to generate personalized email responses that match your communication style.

## Quick Start

### 1. Collect Email Data
First, collect your email data using the existing email collection system:

```bash
npm run collect-emails
```

This creates a file like `data/writing-style-data-{userId}-{timestamp}.json`

### 2. Run Communication Profile Analysis
Analyze the collected emails to extract communication patterns:

```bash
npm run analyze-communication-profile
```

This will:
- Find the most recent email data file
- Send the data to Groq LLM for analysis
- Extract 60+ communication variables
- Save the complete profile to `data/communication-profile-{userId}-{timestamp}.json`
- Save a human-readable summary to `data/summary-communication-profile-{userId}-{timestamp}.json`

### 3. Test with Sample Data
Test the system with sample emails:

```bash
npm run test-communication-profile
```

## What Gets Analyzed

The system extracts comprehensive communication patterns across 13 categories:

### 1. Tone & Formality Patterns
- **Formality scores** (1-10) by relationship type
- **Tone distribution** (formal/neutral/casual percentages)
- **Formality triggers** (keywords that increase formality)
- **Readability grade** (Flesch-Kincaid level)
- **Hedging frequency** by relationship

### 2. Greeting & Closing Patterns
- **Greeting styles** by relationship with usage percentages
- **Closing styles** with punctuation preferences
- **Name usage patterns** (first name vs formal)
- **Signature block components**
- **Sign-off punctuation style**

### 3. Personality Traits
- **Directness level** (1-10, diplomatic to blunt)
- **Warmth level** (1-10, cold to friendly)
- **Enthusiasm indicators** and frequency
- **Politeness markers** and common phrases
- **Urgency expression style**
- **Authority expression preferences**

### 4. Message Structure
- **Average word counts** by relationship/topic
- **Sentence count preferences**
- **Paragraph style** (one-block vs multi-paragraph)
- **Bullet point usage** and preferred styles
- **Line break patterns**
- **Sentence length variability**

### 5. Language & Vocabulary
- **Common phrases** with sentiment flags
- **Signature words** (TF-IDF weighted)
- **Abbreviation usage** frequency
- **Technical language level** (1-10)
- **Contractions usage** percentage
- **Spelling locale preference** (US/GB)

### 6. Relationship-Specific Patterns
- **Relationship classification** for each contact
- **Communication history summaries**
- **Response time patterns**
- **Topic-formality mappings**
- **Contact groupings** by domain/role

### 7. Response Context Patterns
- **Response triggers** and urgency levels
- **Length correlation** (incoming vs outgoing)
- **Escalation patterns** and tone shifts
- **Follow-up style** (proactive/reactive)

### 8. Emotional & Social Variables
- **Emoji usage** frequency and allowed set
- **Exclamation point** usage patterns
- **Positive language markers**
- **Concern expression** patterns
- **Appreciation expression** formulas
- **Humor usage** boundaries

### 9. Context-Aware Variables
- **Meeting request style** and preferences
- **Deadline communication** patterns
- **Problem escalation** tone and approach
- **Praise giving** style and visibility
- **Information sharing** patterns

### 10. Thread Position Variables
- **Thread starter** patterns and subject lines
- **Thread continuation** style (inline/top-posting)
- **Thread closing** style and phrases

### 11. Timing & Priority Variables
- **Urgency indicators** and time references
- **Scheduling language** flexibility
- **Availability expression** patterns

### 12. Decision Making Style
- **Decision language** confidence and style
- **Consensus building** approach

### 13. Problem Solving Communication
- **Issue reporting** detail level
- **Solution presentation** style
- **Risk communication** directness

## Output Files

### Communication Profile (`communication-profile-{userId}-{timestamp}.json`)
Complete structured profile with all variables and confidence scores:

```json
{
  "userId": "user123",
  "generatedAt": "2025-08-14T...",
  "confidence": 0.85,
  "sampleSize": 47,
  "toneFormality": {
    "formalityScore": {
      "colleague": {
        "value": 4.2,
        "confidence": 0.8,
        "lastUpdated": "2025-08-14T...",
        "sampleSize": 15
      }
    }
  }
  // ... all other categories
}
```

### Profile Summary (`summary-communication-profile-{userId}-{timestamp}.json`)
Human-readable insights and key patterns:

```json
{
  "userId": "user123",
  "overallConfidence": 0.85,
  "summary": {
    "communicationStyle": "Balanced and Adaptable",
    "formalityLevel": "Moderately Formal",
    "personalityType": "Direct and Warm",
    "writingCharacteristics": [
      "Uses enthusiastic language",
      "Very polite and courteous"
    ]
  },
  "keyInsights": {
    "mostFormalRelationship": "boss",
    "preferredGreeting": "Hi",
    "averageEmailLength": 156,
    "urgencyStyle": "ASAP, time-sensitive",
    "decisionMakingStyle": "collaborative"
  }
}
```

## Configuration

### Environment Variables
Make sure you have the required environment variables in your `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### Groq API Settings
The system uses these default settings:
- **Model**: `llama-3.1-8b-instant`
- **Temperature**: 0.1 (for consistent analysis)
- **Max Tokens**: 8000
- **Response Format**: JSON

## Relationship Categories

The system classifies contacts into these standard categories:
- **boss**: Manager, supervisor, executive
- **colleague**: Peer, team member, coworker
- **direct_report**: Subordinate, team member you manage
- **client**: External customer, client contact
- **vendor**: External supplier, service provider
- **friend**: Personal friend, social contact
- **family**: Family member
- **unknown**: Unclassified contact

## Confidence Scoring

Each feature includes a confidence score (0-1) based on:
- **Sample size**: More emails = higher confidence
- **Pattern consistency**: Consistent patterns = higher confidence
- **Data quality**: Clear, substantial emails = higher confidence

## Using the Profile

The generated communication profile can be used to:

1. **Generate personalized email responses** that match your style
2. **Adapt tone and formality** based on recipient relationship
3. **Maintain consistent voice** across different contexts
4. **Automate email workflows** with your personal patterns
5. **Provide insights** into your communication habits

## Troubleshooting

### Common Issues

1. **No email data found**
   - Run `npm run collect-emails` first
   - Check that files exist in the `data/` directory

2. **Groq API errors**
   - Verify `GROQ_API_KEY` is set in `.env`
   - Check your Groq API quota and rate limits

3. **Low confidence scores**
   - Collect more email samples
   - Ensure emails have substantial content (>10 words)
   - Check that emails represent different relationships

4. **Missing analysis categories**
   - The system provides default values for missing patterns
   - More email samples will improve coverage

### Performance Tips

- **Optimal sample size**: 20-50 emails for best results
- **Email quality**: Substantial emails (50+ words) provide better patterns
- **Relationship diversity**: Include emails to different types of contacts
- **Recent emails**: More recent emails get higher weight in analysis

## Next Steps

Once you have a communication profile:

1. **Integrate with email generation**: Use the profile to generate contextual responses
2. **Update periodically**: Re-run analysis as your communication style evolves
3. **Fine-tune patterns**: Manually adjust specific patterns if needed
4. **Expand to other platforms**: Apply similar analysis to other communication channels

## API Integration

The communication profile can be integrated into your email generation system:

```typescript
import { CommunicationProfile } from './scripts/groq-communication-profile-analyzer';

// Load profile
const profile: CommunicationProfile = JSON.parse(fs.readFileSync('data/communication-profile-user123.json', 'utf-8'));

// Use for email generation
const formalityLevel = profile.toneFormality.formalityScore.client.value;
const preferredGreeting = profile.greetingClosing.greetingStyles.client.value[0].greeting;
const avgWordCount = profile.messageStructure.avgWordCount.client.value.mean;
```

This creates a foundation for AI-powered email responses that authentically match your individual communication style.