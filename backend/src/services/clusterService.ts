/**
 * ApeAI — Cluster Service
 *
 * Manages feedback clusters — groups of related feedback items.
 * Mirrors Python services/cluster_service.py exactly.
 */

import { getSupabaseClient } from '../db/supabase';

type DbRow = Record<string, unknown>;

export async function createCluster(params: {
  title: string;
  summary?: string;
  feedbackIds?: string[];
  confidenceScore?: number;
  userId?: string;
}): Promise<DbRow> {
  const db = getSupabaseClient();
  const { title, summary, feedbackIds, confidenceScore = 0.0, userId } = params;

  const clusterData: DbRow = {
    title,
    summary: summary ?? null,
    confidence_score: confidenceScore,
    feedback_count: feedbackIds?.length ?? 0,
    status: 'new',
  };
  if (userId) clusterData['user_id'] = userId;

  const { data, error } = await db.from('clusters').insert(clusterData).select().single();
  if (error || !data) throw new Error(`Failed to create cluster: ${error?.message}`);

  const cluster = data as DbRow;
  const clusterId = cluster['id'] as string;
  console.info(`✅ Cluster created: ${clusterId} — '${title}'`);

  if (feedbackIds && feedbackIds.length > 0) {
    const links = feedbackIds.map((fid) => ({ cluster_id: clusterId, feedback_id: fid }));
    await db.from('cluster_feedback').insert(links);
    console.info(`   Linked ${feedbackIds.length} feedback items`);
  }

  return cluster;
}

export async function getCluster(
  clusterId: string,
  includeFeedback = true,
): Promise<DbRow> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('clusters')
    .select('*')
    .eq('id', clusterId)
    .single();

  if (error || !data) throw new Error(`Cluster not found: ${clusterId}`);

  const cluster = data as DbRow;

  if (includeFeedback) {
    const { data: links } = await db
      .from('cluster_feedback')
      .select('feedback_id, similarity_score')
      .eq('cluster_id', clusterId);

    const feedbackItems: DbRow[] = [];
    if (links && links.length > 0) {
      const fids = links.map((l: DbRow) => l['feedback_id']);
      const scores: Record<string, unknown> = {};
      for (const l of links as DbRow[]) {
        scores[l['feedback_id'] as string] = l['similarity_score'];
      }

      const { data: feedbackData } = await db
        .from('feedback')
        .select('*')
        .in('id', fids);

      for (const f of (feedbackData ?? []) as DbRow[]) {
        feedbackItems.push({ ...f, similarity_score: scores[f['id'] as string] });
      }
    }

    cluster['feedback_items'] = feedbackItems;
  }

  return cluster;
}

export async function listClusters(params: {
  status?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ clusters: DbRow[]; total: number }> {
  const db = getSupabaseClient();
  const { status, userId, limit = 50, offset = 0 } = params;

  let query = db
    .from('clusters')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (userId) query = query.eq('user_id', userId);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list clusters: ${error.message}`);

  return {
    clusters: (data ?? []) as DbRow[],
    total: count ?? (data ?? []).length,
  };
}

export async function updateCluster(
  clusterId: string,
  updates: {
    title?: string;
    summary?: string;
    status?: string;
    confidenceScore?: number;
  },
): Promise<DbRow> {
  const db = getSupabaseClient();
  const updateData: DbRow = {};

  if (updates.title !== undefined) updateData['title'] = updates.title;
  if (updates.summary !== undefined) updateData['summary'] = updates.summary;
  if (updates.status !== undefined) updateData['status'] = updates.status;
  if (updates.confidenceScore !== undefined) updateData['confidence_score'] = updates.confidenceScore;

  if (Object.keys(updateData).length === 0) throw new Error('No fields to update');

  const { data, error } = await db
    .from('clusters')
    .update(updateData)
    .eq('id', clusterId)
    .select()
    .single();

  if (error || !data) throw new Error(`Cluster not found: ${clusterId}`);
  console.info(`✅ Cluster updated: ${clusterId}`);
  return data as DbRow;
}

export async function deleteCluster(clusterId: string): Promise<void> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('clusters')
    .delete()
    .eq('id', clusterId)
    .select();

  if (error) throw new Error(`Failed to delete cluster: ${error.message}`);
  if (!data || (data as DbRow[]).length === 0) throw new Error(`Cluster not found: ${clusterId}`);
  console.info(`🗑️  Cluster deleted: ${clusterId}`);
}

export async function addFeedbackToCluster(
  clusterId: string,
  feedbackIds: string[],
  similarityScores?: number[],
): Promise<{ added: number; total_in_cluster: number }> {
  const db = getSupabaseClient();

  const links = feedbackIds.map((fid, i) => ({
    cluster_id: clusterId,
    feedback_id: fid,
    similarity_score: similarityScores?.[i] ?? null,
  }));

  const { data } = await db.from('cluster_feedback').insert(links).select();

  const { count } = await db
    .from('cluster_feedback')
    .select('id', { count: 'exact' })
    .eq('cluster_id', clusterId);

  const newCount = count ?? 0;
  await db.from('clusters').update({ feedback_count: newCount }).eq('id', clusterId);

  console.info(`✅ Added ${feedbackIds.length} items to cluster ${clusterId}`);
  return { added: (data ?? []).length, total_in_cluster: newCount };
}

export async function removeFeedbackFromCluster(
  clusterId: string,
  feedbackIds: string[],
): Promise<{ removed: number; total_in_cluster: number }> {
  const db = getSupabaseClient();

  for (const fid of feedbackIds) {
    await db
      .from('cluster_feedback')
      .delete()
      .eq('cluster_id', clusterId)
      .eq('feedback_id', fid);
  }

  const { count } = await db
    .from('cluster_feedback')
    .select('id', { count: 'exact' })
    .eq('cluster_id', clusterId);

  const newCount = count ?? 0;
  await db.from('clusters').update({ feedback_count: newCount }).eq('id', clusterId);

  console.info(`🗑️  Removed ${feedbackIds.length} items from cluster ${clusterId}`);
  return { removed: feedbackIds.length, total_in_cluster: newCount };
}

export async function getClusterStats(
  userId?: string,
): Promise<{ total: number; by_status: Record<string, number> }> {
  const db = getSupabaseClient();

  let query = db.from('clusters').select('status');
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get cluster stats:', error);
    return { total: 0, by_status: {} };
  }

  const byStatus: Record<string, number> = {};
  for (const row of (data ?? []) as DbRow[]) {
    const s = (row['status'] as string) ?? 'unknown';
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  return { total: (data ?? []).length, by_status: byStatus };
}
