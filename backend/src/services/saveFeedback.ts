/**
 * ApeAI — Feedback Storage Service
 *
 * Handles saving normalized FeedbackItems to Supabase.
 * Mirrors Python services/save_feedback.py.
 */

import { getSupabaseClient } from '../db/supabase';
import { FeedbackItem, feedbackItemToDbDict } from '../types/feedback';

export async function saveFeedback(item: FeedbackItem): Promise<Record<string, unknown>> {
  const client = getSupabaseClient();
  const dbData = feedbackItemToDbDict(item);

  console.info(
    `💾 Saving feedback: source=${item.source}, author=${item.author}, content_length=${item.content.length} chars`,
  );

  const { data, error } = await client.from('feedback').insert(dbData).select().single();

  if (error) {
    console.error('❌ Failed to save feedback:', error);
    throw new Error(`Failed to save feedback: ${error.message}`);
  }

  console.info(`✅ Feedback saved: id=${(data as Record<string, unknown>)['id']}`);
  return data as Record<string, unknown>;
}

export async function saveFeedbackBatch(
  items: FeedbackItem[],
): Promise<Array<Record<string, unknown>>> {
  if (items.length === 0) return [];

  const client = getSupabaseClient();
  const dbData = items.map(feedbackItemToDbDict);

  console.info(`💾 Batch saving ${items.length} feedback items`);

  const { data, error } = await client.from('feedback').insert(dbData).select();

  if (error) {
    console.error('❌ Batch save failed:', error);
    throw new Error(`Batch save failed: ${error.message}`);
  }

  console.info(`✅ Batch save complete: ${(data ?? []).length} items saved`);
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function getFeedbackStats(
  userId?: string,
): Promise<{ total: number; by_source: Record<string, number> }> {
  const client = getSupabaseClient();

  let query = client.from('feedback').select('source');
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get feedback stats:', error);
    return { total: 0, by_source: {} };
  }

  if (!data || data.length === 0) {
    return { total: 0, by_source: {} };
  }

  const bySource: Record<string, number> = {};
  for (const row of data) {
    const src = (row as Record<string, string>)['source'] ?? 'unknown';
    bySource[src] = (bySource[src] ?? 0) + 1;
  }

  return { total: data.length, by_source: bySource };
}

export async function getRecentFeedbacks(
  userId?: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  const client = getSupabaseClient();

  let query = client
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch recent feedbacks:', error);
    return [];
  }

  return (data ?? []) as Array<Record<string, unknown>>;
}
