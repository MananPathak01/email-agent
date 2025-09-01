import OpenAI from 'openai';

// Support multiple AI providers
const aiProvider = process.env.AI_PROVIDER || 'openai'; // 'openai', 'groq', 'local'

// Configuration for different providers
const getAIConfig = () => {
  switch (aiProvider) {
    case 'groq':
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is required when using Groq');
      }
      return {
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile' // or 'llama-3.1-8b-instant'
      };
    
    case 'local':
      return {
        apiKey: 'ollama',
        baseURL: process.env.LOCAL_MODEL_URL || 'http://localhost:11434/v1',
        model: process.env.LOCAL_MODEL || 'llama3.1:8b'
      };
    
    case 'openai':
    default:
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required when using OpenAI');
      }
      return {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: undefined,
        model: 'gpt-4o'
      };
  }
};

const config = getAIConfig();

export const openai = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
});

// Email analysis prompt templates
export const EMAIL_ANALYSIS_PROMPT = `
You are an email analysis API. Analyze the email and return ONLY a JSON object with no additional text or explanation.

Email content:
{email_content}

Return ONLY this JSON structure (no other text):
{
  "intent": "question|request|information|meeting|complaint|other",
  "urgency": "low|medium|high",
  "sentiment": "positive|neutral|negative", 
  "category": "onboarding|support|sales|meeting|other",
  "entities": [{"type": "person|company|date|document|product", "value": "extracted value", "confidence": 0.8}],
  "actionItems": ["action 1", "action 2"],
  "requiresResponse": true,
  "keyTopics": ["topic 1", "topic 2"],
  "confidence": 0.85
}
`;

export const RESPONSE_GENERATION_PROMPT = `
Generate a professional email response based on the following context:

Original Email Analysis:
{email_analysis}

Original Email Content:
{original_email}

User's Communication Style (learned from previous emails):
{communication_style}

Similar Past Responses:
{similar_responses}

Workflow Template (if applicable):
{workflow_template}

Instructions:
1. Generate a response that matches the user's communication style
2. Address all key points from the original email
3. Include relevant attachments if suggested by the workflow
4. Keep the tone professional but match the user's typical style
5. Be concise but complete

Respond in JSON format:
{
  "subject": "Re: Original Subject",
  "content": "Email response content here",
  "attachments": ["filename1.pdf", "filename2.doc"],
  "confidence": 0.9,
  "reasoning": "Why this response was generated",
  "workflowUsed": "workflow_name_if_applicable"
}
`;

// Rate limiting and optimization
const RATE_LIMIT = {
  requests: 0,
  resetTime: Date.now() + 60000, // Reset every minute
  maxRequests: 25 // Stay well under Groq's 30/min limit
};

// Simple in-memory cache for email analysis
const analysisCache = new Map<string, any>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(content: string): string {
  // Create a simple hash of the email content
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

function getCachedAnalysis(emailContent: string) {
  const key = getCacheKey(emailContent);
  const cached = analysisCache.get(key);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.analysis;
  }
  
  return null;
}

function setCachedAnalysis(emailContent: string, analysis: any) {
  const key = getCacheKey(emailContent);
  analysisCache.set(key, {
    analysis,
    timestamp: Date.now()
  });
  
  // Clean old cache entries periodically
  if (analysisCache.size > 1000) {
    const cutoff = Date.now() - CACHE_TTL;
    for (const [k, v] of analysisCache.entries()) {
      if (v.timestamp < cutoff) {
        analysisCache.delete(k);
      }
    }
  }
}

function checkRateLimit() {
  const now = Date.now();
  if (now > RATE_LIMIT.resetTime) {
    RATE_LIMIT.requests = 0;
    RATE_LIMIT.resetTime = now + 60000;
  }
  
  if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded. Please wait a moment.');
  }
  
  RATE_LIMIT.requests++;
}

function optimizeEmailContent(emailContent: string): string {
  // Truncate very long emails to save tokens
  const maxLength = 2000; // ~500 tokens
  if (emailContent.length > maxLength) {
    return emailContent.substring(0, maxLength) + '\n[Email truncated for analysis]';
  }
  return emailContent;
}

// Helper functions for AI operations
export async function analyzeEmail(emailContent: string) {
  try {
    // Check cache first
    const cached = getCachedAnalysis(emailContent);
    if (cached) {
      console.log('📋 Using cached email analysis');
      return cached;
    }
    
    // Check rate limits
    checkRateLimit();
    
    // Optimize content to save tokens
    const optimizedContent = optimizeEmailContent(emailContent);
    
    console.log(`🤖 Analyzing email with Groq (${optimizedContent.length} chars)`);
    
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an email analysis API. You MUST respond with ONLY valid JSON, no additional text or explanation.'
        },
        {
          role: 'user',
          content: EMAIL_ANALYSIS_PROMPT.replace('{email_content}', optimizedContent)
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Clean the response to extract JSON
    let jsonContent = content.trim();
    
    // Remove any markdown code blocks
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    // Find JSON object if there's extra text
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const analysis = JSON.parse(jsonContent);
      
      // Cache the successful analysis
      setCachedAnalysis(emailContent, analysis);
      
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', jsonContent);
      throw new Error(`Invalid JSON response: ${parseError}`);
    }
  } catch (error) {
    console.error('Error analyzing email:', error);
    throw error;
  }
}

export async function generateResponse(
  emailAnalysis: any,
  originalEmail: string,
  communicationStyle: any,
  similarResponses: any[],
  workflowTemplate?: any
) {
  try {
    const prompt = RESPONSE_GENERATION_PROMPT
      .replace('{email_analysis}', JSON.stringify(emailAnalysis))
      .replace('{original_email}', originalEmail)
      .replace('{communication_style}', JSON.stringify(communicationStyle))
      .replace('{similar_responses}', JSON.stringify(similarResponses))
      .replace('{workflow_template}', workflowTemplate ? JSON.stringify(workflowTemplate) : 'None');

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert email writer. Generate professional, contextual email responses that match the user\'s communication style. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

export async function generateEmbedding(text: string) {
  try {
    if (useLocalModel) {
      // Use a free embedding service or simple text similarity
      // For now, return a simple hash-based embedding
      return generateSimpleEmbedding(text);
    }
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Simple embedding alternative for local use
function generateSimpleEmbedding(text: string): number[] {
  // Create a simple 384-dimensional embedding based on text characteristics
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0);
  
  // Use word frequency and position to create embedding
  words.forEach((word, index) => {
    const hash = simpleHash(word);
    const pos = hash % 384;
    embedding[pos] += 1 / (index + 1); // Weight by position
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Simplified response generation without learning dependencies
export async function generateSimpleResponse(emailAnalysis: any, emailData: any) {
  try {
    console.log(`🤖 Generating simple response for email analysis:`, emailAnalysis);
    
    const prompt = `
You are a professional email assistant. Generate a helpful, contextual response to this email.

Original Email:
From: ${emailData.from}
Subject: ${emailData.subject}
Content: ${emailData.body || emailData.snippet}

Email Analysis:
- Intent: ${emailAnalysis.intent}
- Urgency: ${emailAnalysis.urgency}
- Sentiment: ${emailAnalysis.sentiment}

Generate a professional, helpful response. Keep it concise and appropriate for the context.
Return ONLY a JSON object with this structure:
{
  "content": "Your response content here",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this response is appropriate",
  "workflowUsed": "general_response"
}
`;

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional email assistant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response generated');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Fallback response
      parsedResponse = {
        content: "Thank you for your email. I'll review this and get back to you soon.",
        confidence: 0.5,
        reasoning: "Fallback response due to parsing error",
        workflowUsed: "fallback"
      };
    }

    console.log(`✅ Generated simple response with confidence: ${parsedResponse.confidence}`);
    return parsedResponse;

  } catch (error) {
    console.error('Error generating simple response:', error);
    
    // Return a fallback response
    return {
      content: "Thank you for your email. I'll review this and get back to you soon.",
      confidence: 0.3,
      reasoning: "Fallback response due to generation error",
      workflowUsed: "error_fallback"
    };
  }
}