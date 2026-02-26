/**
 * Embeddings Module - Cohere Version
 */

import { CohereClient } from 'cohere-ai';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('embeddings');

// Initialize Cohere client with type assertion to avoid constructor issues
const cohere = new (CohereClient as any)({
  token: process.env.COHERE_API_KEY,
}) as any;

// Cohere embedding configuration
const EMBEDDING_MODEL = 'embed-english-v3.0';
const EMBEDDING_DIMENSIONS = 1024;
const MAX_BATCH_SIZE = 96;
const RATE_LIMIT_DELAY_MS = 100;

/**
 * Create an embedding for a single text string.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    logger.warn('Attempted to embed empty text');
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  try {
    const response = await cohere.embed({
      texts: [text],
      model: EMBEDDING_MODEL,
      inputType: 'search_document',
    });

    logger.debug(`Created Cohere embedding for text (${text.length} chars)`);
    return response.embeddings[0];
  } catch (error: any) {
    logger.error(`Failed to create Cohere embedding: ${error.message}`);
    throw new Error(`Embedding failed: ${error.message}`);
  }
}

/**
 * Create embeddings for multiple texts in a batch.
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Filter out empty texts but track their positions
  const validTexts: { index: number; text: string }[] = [];
  texts.forEach((text, index) => {
    if (text && text.trim().length > 0) {
      validTexts.push({ index, text });
    }
  });

  if (validTexts.length === 0) {
    return texts.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0));
  }

  const results: number[][] = new Array(texts.length).fill(null);
  
  // Process in batches
  for (let i = 0; i < validTexts.length; i += MAX_BATCH_SIZE) {
    const batch = validTexts.slice(i, i + MAX_BATCH_SIZE);
    
    try {
      logger.info(`Processing Cohere embedding batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(validTexts.length / MAX_BATCH_SIZE)}`);
      
      const response = await cohere.embed({
        texts: batch.map(b => b.text),
        model: EMBEDDING_MODEL,
        inputType: 'search_document',
      });

      // Map results back to original positions
      if (response && response.embeddings && Array.isArray(response.embeddings)) {
        response.embeddings.forEach((embedding: number[], batchIndex: number) => {
          const originalIndex = batch[batchIndex].index;
          results[originalIndex] = embedding;
        });
      }
      
      // Small delay between batches
      if (i + MAX_BATCH_SIZE < validTexts.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    } catch (error: any) {
      logger.error(`Batch embedding failed: ${error.message}`);
      throw new Error(`Batch embedding failed: ${error.message}`);
    }
  }

  // Fill in zeros for empty texts
  for (let i = 0; i < results.length; i++) {
    if (results[i] === null) {
      results[i] = new Array(EMBEDDING_DIMENSIONS).fill(0);
    }
  }

  logger.info(`Created ${validTexts.length} Cohere embeddings`);
  return results;
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Prepare text for embedding by cleaning and normalizing.
 */
export function preprocessText(text: string): string {
  let processed = text;

  // Remove Slack user mentions
  processed = processed.replace(/<@[A-Z0-9]+>/g, '@user');

  // Remove Slack channel mentions
  processed = processed.replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1');
  processed = processed.replace(/<#[A-Z0-9]+>/g, '#channel');

  // Remove URLs
  processed = processed.replace(/<https?:\/\/[^>]+>/g, '[link]');
  processed = processed.replace(/https?:\/\/\S+/g, '[link]');

  // Remove emoji codes
  processed = processed.replace(/:[a-z0-9_+-]+:/g, '');

  // Normalize whitespace
  processed = processed.replace(/\s+/g, ' ').trim();

  // Remove very short messages
  if (processed.length < 10) {
    return '';
  }

  return processed;
}

/**
 * Get embedding model information.
 */
export function getEmbeddingConfig() {
  return {
    provider: 'cohere',
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxBatchSize: MAX_BATCH_SIZE,
  };
}
