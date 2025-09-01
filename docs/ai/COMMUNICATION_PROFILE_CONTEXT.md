---
inclusion: always
---

# Communication Profile System Context

This project implements a sophisticated communication profile system that learns individual writing patterns from Gmail data to generate personalized email responses.

## Key Architecture Components

### 1. Email Collection & Analysis Pipeline
- **Gmail API Integration**: Read-only access to collect inbox/sent emails with thread context
- **Multi-Pass AI Analysis**: Uses Groq LLM for tone, formality, relationship classification
- **Feature Extraction**: 60+ variables covering tone, structure, vocabulary, relationships
- **Confidence Scoring**: All features include confidence levels and recency weighting

### 2. Feature Store Variables (Core Categories)
- **Tone & Formality**: formality_score, tone_distribution, readability_grade
- **Greetings & Closings**: greeting_styles, closing_styles, signature_patterns  
- **Personality Traits**: directness_level, warmth_level, politeness_markers
- **Message Structure**: avg_word_count, paragraph_style, bullet_point_usage
- **Language & Vocabulary**: common_phrases, signature_words, style_embeddings
- **Relationship-Specific**: relationship_classification, response_time_patterns
- **Context-Aware**: meeting_request_style, deadline_communication, escalation_patterns

### 3. Privacy & Security Design
- **Minimal Storage**: Prefer derived features over raw email content
- **Encrypted Cache**: Short-lived raw data storage (7-30 days) for reprocessing
- **Feature-First**: Long-term storage focuses on patterns, not content

### 4. Implementation Guidelines

When working on this system:

#### Code Organization
- Email collection: `server/routes/gmail-learning-simple.routes.ts`
- Style analysis: `scripts/writing-style-analyzer.ts` 
- Feature extraction: Should use multi-pass LLM analysis (Groq)
- Storage: SQL for structured features + Vector DB for embeddings

#### Key Principles
- **Confidence-Based**: All features must include confidence scores (0-1)
- **Relationship-Aware**: Most features vary by recipient relationship type
- **Recency-Weighted**: Use EWMA with 90-day half-life for aggregation
- **Privacy-First**: Minimize raw content storage, maximize derived insights

#### Feature Extraction Pattern
```typescript
interface FeatureWithConfidence<T> {
  value: T;
  confidence: number;
  lastUpdated: Date;
  sampleSize: number;
}
```

#### Relationship Classification
Standard categories: boss, colleague, direct_report, client, vendor, friend, family, unknown

#### Analysis Scope Levels
- **per-user**: Global patterns across all emails
- **per-relationship**: Patterns specific to relationship types
- **per-topic**: Patterns for specific subjects/contexts
- **per-thread-position**: Patterns based on position in conversation

This specification ensures the AI assistant generates responses that authentically match the user's individual communication style across different contexts and relationships.