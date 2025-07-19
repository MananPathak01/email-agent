import { generateEmbedding } from './openai';

export interface SimilarityResult {
  id: number;
  similarity: number;
  email: any;
}

export class VectorSearchService {
  // Calculate cosine similarity between two vectors
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Find similar emails based on content similarity
  async findSimilarEmails(
    queryText: string,
    existingEmails: Array<{ id: number; embedding: string; [key: string]: any }>,
    threshold: number = 0.7,
    limit: number = 5
  ): Promise<SimilarityResult[]> {
    try {
      // Generate embedding for the query text
      const queryEmbedding = await generateEmbedding(queryText);

      const similarities: SimilarityResult[] = [];

      for (const email of existingEmails) {
        if (!email.embedding) continue;

        try {
          // Parse the stored embedding
          const emailEmbedding = JSON.parse(email.embedding);
          
          // Calculate similarity
          const similarity = this.cosineSimilarity(queryEmbedding, emailEmbedding);

          if (similarity >= threshold) {
            similarities.push({
              id: email.id,
              similarity,
              email
            });
          }
        } catch (error) {
          console.error(`Error processing embedding for email ${email.id}:`, error);
          continue;
        }
      }

      // Sort by similarity (highest first) and limit results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding similar emails:', error);
      throw new Error('Failed to find similar emails');
    }
  }

  // Find similar email patterns for template suggestions
  async findSimilarResponsePatterns(
    emailContent: string,
    category: string,
    existingEmails: Array<{ id: number; embedding: string; category: string; [key: string]: any }>,
    threshold: number = 0.6
  ): Promise<SimilarityResult[]> {
    try {
      // Filter emails by category first
      const categoryEmails = existingEmails.filter(email => 
        email.category === category && email.embedding
      );

      if (categoryEmails.length === 0) {
        return [];
      }

      return await this.findSimilarEmails(emailContent, categoryEmails, threshold, 3);
    } catch (error) {
      console.error('Error finding similar response patterns:', error);
      return [];
    }
  }

  // Generate and store embedding for new email
  async generateAndStoreEmbedding(emailContent: string, subject: string): Promise<string> {
    try {
      // Combine subject and content for better context
      const combinedText = `${subject}\n\n${emailContent}`;
      const embedding = await generateEmbedding(combinedText);
      
      // Return as JSON string for storage
      return JSON.stringify(embedding);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding for email');
    }
  }

  // Find contextually related tasks
  async findRelatedTasks(
    emailContent: string,
    existingTasks: Array<{ id: number; title: string; description: string; [key: string]: any }>,
    threshold: number = 0.6
  ): Promise<Array<{ taskId: number; similarity: number; task: any }>> {
    try {
      const results: Array<{ taskId: number; similarity: number; task: any }> = [];

      for (const task of existingTasks) {
        // Combine task title and description for comparison
        const taskText = `${task.title}\n${task.description || ''}`;
        
        try {
          const taskEmbedding = await generateEmbedding(taskText);
          const emailEmbedding = await generateEmbedding(emailContent);
          
          const similarity = this.cosineSimilarity(emailEmbedding, taskEmbedding);
          
          if (similarity >= threshold) {
            results.push({
              taskId: task.id,
              similarity,
              task
            });
          }
        } catch (error) {
          console.error(`Error processing task ${task.id}:`, error);
          continue;
        }
      }

      return results.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Error finding related tasks:', error);
      return [];
    }
  }
}

export const vectorSearchService = new VectorSearchService();
