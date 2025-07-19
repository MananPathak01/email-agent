import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-openai-api-key"
});

export interface EmailAnalysis {
  isOnboardingRelated: boolean;
  priority: "low" | "medium" | "high";
  category: string;
  sentiment: string;
  urgency: number;
  keyInformation: {
    names: string[];
    dates: string[];
    requirements: string[];
    actionItems: string[];
  };
  suggestedResponse: string;
  confidence: number;
}

export interface TaskSuggestion {
  title: string;
  description: string;
  type: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedTo?: string;
  steps: string[];
}

export async function analyzeEmail(emailContent: string, subject: string, fromEmail: string): Promise<EmailAnalysis> {
  try {
    const prompt = `
Analyze this email for onboarding-related content and provide structured analysis:

Subject: ${subject}
From: ${fromEmail}
Content: ${emailContent}

Please analyze and respond with JSON in this exact format:
{
  "isOnboardingRelated": boolean,
  "priority": "low" | "medium" | "high",
  "category": "equipment" | "orientation" | "paperwork" | "meeting" | "general",
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "urgency": number (1-10),
  "keyInformation": {
    "names": ["name1", "name2"],
    "dates": ["date1", "date2"],
    "requirements": ["req1", "req2"],
    "actionItems": ["action1", "action2"]
  },
  "suggestedResponse": "brief suggested response approach",
  "confidence": number (0-1)
}

Focus on identifying:
- Equipment requests (laptops, access cards, desk setup)
- Orientation scheduling and meeting requests
- Paperwork submissions and document requirements
- First day preparations and logistics
- Any urgent requests or time-sensitive items
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert email analysis AI specializing in onboarding workflows. Analyze emails for onboarding-related content and provide structured insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    return analysis as EmailAnalysis;
  } catch (error) {
    console.error("Error analyzing email:", error);
    throw new Error("Failed to analyze email: " + (error as Error).message);
  }
}

export async function generateEmailResponse(
  originalEmail: string,
  subject: string,
  context: string,
  template?: string
): Promise<string> {
  try {
    const prompt = `
Generate a professional email response for this onboarding-related email:

Original Subject: ${subject}
Original Email: ${originalEmail}
Context: ${context}
${template ? `Template to use: ${template}` : ""}

Generate a complete, professional email response that:
- Addresses all points in the original email
- Provides clear next steps and timelines
- Maintains a welcoming and helpful tone
- Includes relevant onboarding information
- Is specific and actionable

Return only the email content (no subject line or headers).
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional HR specialist writing onboarding emails. Write clear, helpful, and welcoming responses that provide specific information and next steps."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error generating email response:", error);
    throw new Error("Failed to generate email response: " + (error as Error).message);
  }
}

export async function suggestTasks(emailContent: string, analysis: EmailAnalysis): Promise<TaskSuggestion[]> {
  try {
    const prompt = `
Based on this email analysis, suggest specific onboarding tasks:

Email Content: ${emailContent}
Analysis: ${JSON.stringify(analysis)}

Generate 1-3 specific, actionable tasks with JSON format:
{
  "tasks": [
    {
      "title": "task title",
      "description": "detailed description",
      "type": "equipment" | "orientation" | "paperwork" | "meeting",
      "priority": "low" | "medium" | "high",
      "dueDate": "YYYY-MM-DD or relative like 'today', 'tomorrow'",
      "assignedTo": "role or department",
      "steps": ["step1", "step2", "step3"]
    }
  ]
}

Focus on:
- Concrete deliverables and deadlines
- Specific equipment or document requirements
- Meeting scheduling and coordination
- Follow-up actions and confirmations
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a workflow automation expert. Create specific, actionable tasks for onboarding processes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.tasks || [];
  } catch (error) {
    console.error("Error suggesting tasks:", error);
    throw new Error("Failed to suggest tasks: " + (error as Error).message);
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding: " + (error as Error).message);
  }
}

export async function summarizeConversation(emails: Array<{ subject: string; content: string; fromEmail: string }>): Promise<string> {
  try {
    const conversation = emails.map(email => 
      `From: ${email.fromEmail}\nSubject: ${email.subject}\nContent: ${email.content}\n---`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at summarizing email conversations. Provide concise, actionable summaries focusing on key points and next steps."
        },
        {
          role: "user",
          content: `Summarize this email conversation thread focusing on the main onboarding needs and current status:\n\n${conversation}`
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    throw new Error("Failed to summarize conversation: " + (error as Error).message);
  }
}
