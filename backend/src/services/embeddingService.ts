/**
 * ApeAI — Embedding Service (Google Gemini Edition)
 *
 * Generates vector embeddings using Google's text-embedding-004 model
 * and stores them in Supabase pgvector for similarity search.
 * Mirrors Python services/embedding_service.py.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import settings from '../config';
import { getSupabaseClient } from '../db/supabase';

type DbRow = Record<string, unknown>;

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI;
  if (!settings.googleApiKey) {
    throw new Error('Google API key not configured. Set GOOGLE_API_KEY in your .env file.');
  }
  _genAI = new GoogleGenerativeAI(settings.googleApiKey);
  console.info('✅ Google Generative AI SDK configured');
  return _genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = getGenAI();

  try {
    // Use the embedContent method on the embedding model
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Truncate/pad to 768 dimensions as per pgvector table definition
    const embedding768 = embedding.slice(0, 768);
    console.info(`✅ Generated embedding: ${embedding768.length} dims`);
    return embedding768;
  } catch (err) {
    console.error('❌ Failed to generate Gemini embedding:', err);
    throw new Error(`Gemini embedding generation failed: ${err}`);
  }
}

export async function createEmbeddingForFeedback(feedbackId: string): Promise<DbRow> {
  const db = getSupabaseClient();

  // Check if embedding already exists
  const { data: existing } = await db
    .from('embeddings')
    .select('id')
    .eq('feedback_id', feedbackId);

  if (existing && existing.length > 0) {
    console.info(`⏭️  Embedding already exists for feedback ${feedbackId}`);
    return existing[0] as DbRow;
  }

  // Fetch the feedback content
  const { data: feedbackData, error: feedbackError } = await db
    .from('feedback')
    .select('id, content')
    .eq('id', feedbackId)
    .single();

  if (feedbackError || !feedbackData) throw new Error(`Feedback not found: ${feedbackId}`);

  const content = (feedbackData as DbRow)['content'] as string;

  console.info(`🧠 Generating Gemini embedding for feedback ${feedbackId} (${content.length} chars)`);
  const embedding = await generateEmbedding(content);

  // Format as pgvector string
  const vectorStr = `[${embedding.join(',')}]`;

  console.info(`💾 Sending vector of length ${embedding.length} to DB for feedback ${feedbackId}`);

  const { data: result, error } = await db
    .from('embeddings')
    .insert({
      feedback_id: feedbackId,
      embedding: vectorStr,
      model: 'text-embedding-004',
    })
    .select()
    .single();

  if (error || !result) throw new Error(`Failed to store embedding for ${feedbackId}: ${error?.message}`);

  console.info(`✅ Gemini embedding stored for feedback ${feedbackId}`);
  return result as DbRow;
}

export async function createEmbeddingsBatch(
  feedbackIds?: string[],
): Promise<{ total: number; created: number; skipped: number; errors: DbRow[] }> {
  const db = getSupabaseClient();

  if (!feedbackIds) {
    const { data: allFeedback } = await db.from('feedback').select('id');
    const { data: existingEmbeddings } = await db.from('embeddings').select('feedback_id');

    const existingIds = new Set(
      (existingEmbeddings ?? []).map((e: DbRow) => e['feedback_id'] as string),
    );
    feedbackIds = (allFeedback ?? [])
      .map((f: DbRow) => f['id'] as string)
      .filter((id) => !existingIds.has(id));
  }

  if (feedbackIds.length === 0) {
    return { total: 0, created: 0, skipped: 0, errors: [] };
  }

  let created = 0;
  let skipped = 0;
  const errors: DbRow[] = [];

  console.info(`🧠 Batch embedding (Gemini): ${feedbackIds.length} items to process`);

  for (const fid of feedbackIds) {
    try {
      const result = await createEmbeddingForFeedback(fid);
      if (result['id']) {
        created++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Error embedding ${fid}:`, err);
      errors.push({ feedback_id: fid, error: String(err) });
    }
  }

  return { total: feedbackIds.length, created, skipped, errors };
}

export async function searchSimilar(params: {
  text?: string;
  feedbackId?: string;
  matchCount?: number;
  matchThreshold?: number;
}): Promise<DbRow[]> {
  const db = getSupabaseClient();
  const { text, feedbackId, matchCount = 10, matchThreshold = 0.5 } = params;

  let queryEmbedding: number[] | string;

  if (text) {
    queryEmbedding = await generateEmbedding(text);
  } else if (feedbackId) {
    const { data } = await db
      .from('embeddings')
      .select('embedding')
      .eq('feedback_id', feedbackId)
      .single();

    if (!data) throw new Error(`No embedding found for feedback ${feedbackId}`);
    queryEmbedding = (data as DbRow)['embedding'] as string;
  } else {
    throw new Error("Either 'text' or 'feedback_id' must be provided");
  }

  const vectorStr = Array.isArray(queryEmbedding)
    ? `[${queryEmbedding.join(',')}]`
    : queryEmbedding;

  const { data: results, error } = await db.rpc('match_feedback', {
    query_embedding: vectorStr,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) throw new Error(`Similarity search failed: ${error.message}`);
  return (results ?? []) as DbRow[];
}

export async function getEmbeddingStats(): Promise<DbRow> {
  const db = getSupabaseClient();

  const { count: feedbackCount } = await db
    .from('feedback')
    .select('id', { count: 'exact', head: true });

  const { count: embeddingCount } = await db
    .from('embeddings')
    .select('id', { count: 'exact', head: true });

  const fc = feedbackCount ?? 0;
  const ec = embeddingCount ?? 0;

  return {
    total_feedback: fc,
    total_embedded: ec,
    total_unembedded: fc - ec,
    model: 'text-embedding-004',
    dimensions: 768,
  };
}
