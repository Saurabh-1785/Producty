/**
 * ApeAI — AI Clustering Service
 *
 * Implements the iterative clustering logic using vector similarity.
 * Mirrors Python ai/services/clustering_service.py.
 */

import { getSupabaseClient } from '../db/supabase';
import { createEmbeddingsBatch, generateEmbedding } from '../services/embeddingService';
import { createCluster, addFeedbackToCluster } from '../services/clusterService';

type DbRow = Record<string, unknown>;

const THRESHOLDS: Record<string, number> = {
  bug: 0.9,
  feature_request: 0.85,
  usability: 0.85,
  default: 0.8,
};

export function classifyFeedback(content: string): string {
  const lower = content.toLowerCase();
  if (['bug', 'error', 'fail', 'broken', 'crash', 'wrong'].some((w) => lower.includes(w))) {
    return 'bug';
  }
  if (['feature', 'add', 'new', 'want', 'should', 'could'].some((w) => lower.includes(w))) {
    return 'feature_request';
  }
  return 'default';
}

export async function clusterUnprocessedFeedback(
  userId?: string,
): Promise<DbRow> {
  const db = getSupabaseClient();

  // Step 1: Ensure all feedback has embeddings
  try {
    const embedResult = await createEmbeddingsBatch();
    console.info(`📊 Embedding batch result: ${JSON.stringify(embedResult)}`);
  } catch (err) {
    console.error('Failed to create embeddings batch:', err);
    // Continue — some embeddings may already exist
  }

  // Step 2: Get unclustered feedback
  const { data: allFeedback } = await db.from('feedback').select('id, content');
  const { data: links } = await db.from('cluster_feedback').select('feedback_id');

  const linkedIds = new Set((links ?? []).map((l: DbRow) => l['feedback_id'] as string));
  const unprocessed = (allFeedback ?? []).filter(
    (f: DbRow) => !linkedIds.has(f['id'] as string),
  );

  if (unprocessed.length === 0) {
    return {
      processed: 0,
      new_clusters: 0,
      linked: 0,
      message: 'All feedback is already clustered.',
    };
  }

  console.info(`🔄 Processing ${unprocessed.length} unclustered feedback items`);

  // Step 3: Check if any embeddings exist
  const { count: embeddingCount } = await db
    .from('embeddings')
    .select('feedback_id', { count: 'exact', head: true });

  if (!embeddingCount || embeddingCount === 0) {
    console.warn('⚠️ No embeddings exist — using fallback clustering');
    return createFallbackClusters(unprocessed as DbRow[], userId);
  }

  let newClusters = 0;
  let linked = 0;

  for (const item of unprocessed as DbRow[]) {
    const fid = item['id'] as string;
    const content = item['content'] as string;

    const fbType = classifyFeedback(content);
    const threshold = THRESHOLDS[fbType] ?? THRESHOLDS['default'];

    try {
      const embedding = await generateEmbedding(content);
      const vectorStr = `[${embedding.join(',')}]`;

      const { data: matches } = await db.rpc('match_feedback', {
        query_embedding: vectorStr,
        match_count: 5,
        match_threshold: threshold,
      });

      let clusterId: string | null = null;

      if (matches && (matches as DbRow[]).length > 0) {
        const matchIds = (matches as DbRow[])
          .map((m) => m['feedback_id'] as string)
          .filter((id) => id !== fid);

        if (matchIds.length > 0) {
          const { data: existingLinks } = await db
            .from('cluster_feedback')
            .select('cluster_id')
            .in('feedback_id', matchIds)
            .limit(1);

          if (existingLinks && (existingLinks as DbRow[]).length > 0) {
            clusterId = (existingLinks as DbRow[])[0]['cluster_id'] as string;
          }
        }
      }

      if (clusterId) {
        const simScore =
          matches && (matches as DbRow[]).length > 0
            ? ((matches as DbRow[])[0]['similarity'] as number)
            : 0.8;
        await addFeedbackToCluster(clusterId, [fid], [simScore]);
        linked++;
      } else {
        await createCluster({
          title: `New ${fbType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Cluster`,
          feedbackIds: [fid],
          confidenceScore: 100.0,
          userId,
        });
        newClusters++;
      }
    } catch (err) {
      console.error(`Failed to cluster feedback ${fid}:`, err);
    }
  }

  return {
    processed: unprocessed.length,
    new_clusters: newClusters,
    linked,
    message: `Processed ${unprocessed.length} items: ${newClusters} new clusters, ${linked} linked to existing.`,
  };
}

async function createFallbackClusters(
  unprocessed: DbRow[],
  userId?: string,
): Promise<DbRow> {
  const groups: Record<string, string[]> = {};

  for (const item of unprocessed) {
    const fbType = classifyFeedback(item['content'] as string);
    if (!groups[fbType]) groups[fbType] = [];
    groups[fbType].push(item['id'] as string);
  }

  let newClusters = 0;
  for (const [fbType, fids] of Object.entries(groups)) {
    const label = fbType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    await createCluster({
      title: `${label} Feedback Group`,
      summary: `Auto-grouped ${fids.length} ${fbType} feedback items (fallback clustering — no embeddings available yet).`,
      feedbackIds: fids,
      confidenceScore: 50.0,
      userId,
    });
    newClusters++;
  }

  return {
    processed: unprocessed.length,
    new_clusters: newClusters,
    linked: 0,
    message: `Created ${newClusters} clusters using keyword-based fallback grouping (${unprocessed.length} total items).`,
  };
}
