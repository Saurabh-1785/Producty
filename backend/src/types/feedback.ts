/**
 * ApeAI — TypeScript Types for Feedback
 *
 * Mirrors Python Pydantic models in models/feedback.py.
 * Every feedback source normalizes into FeedbackItem before storage.
 *
 * === Layer 1 Multi-Source Ingestion ===
 * Connector-specific input interfaces are defined below.
 * Each connector converts incoming data into the universal FeedbackItem
 * schema before persistence, ensuring downstream layers operate on a
 * consistent data structure regardless of the original source.
 */

// ─── Feedback Source Enum ─────────────────────────────────────

export type FeedbackSource =
  | 'manual'
  | 'csv'
  | 'appstore'
  | 'google_play'
  | 'reddit'
  | 'intercom'
  | 'zendesk'
  | 'transcript'
  | 'sentry'
  | 'posthog';

// ─── Existing Input Types ─────────────────────────────────────

export interface ManualFeedbackInput {
  content: string;
  author?: string;
}

export interface CSVFeedbackRow {
  content: string;
  author?: string;
  source?: string;
  [key: string]: string | undefined;
}

// ─── Connector-Specific Input Types (Layer 1) ────────────────

export interface AppStoreReviewInput {
  review_id: string;
  title?: string;
  content: string;
  author: string;
  rating: number; // 1–5 stars
  app_version?: string;
  platform: 'ios' | 'android';
  country?: string;
  review_date?: string; // ISO string
}

export interface RedditPostInput {
  post_id: string;
  title: string;
  content: string; // selftext or comment body
  author: string;
  subreddit: string;
  upvotes: number;
  comments_count: number;
  post_url: string;
  created_utc?: number;
}

export interface SupportTicketWebhookInput {
  ticket_id: string;
  subject?: string;
  content: string;
  author: string;
  customer_email?: string;
  customer_tier?: string; // e.g. 'free', 'pro', 'enterprise'
  tags?: string[];
  platform: 'intercom' | 'zendesk';
  created_at?: string;
}

export interface TranscriptWebhookInput {
  transcript_id: string;
  meeting_title: string;
  content: string; // full transcript text
  participants: string[];
  duration_seconds?: number;
  platform: 'fireflies' | 'zoom';
  meeting_date?: string; // ISO string
}

export interface ObservabilityAlertInput {
  alert_id: string;
  title: string;
  content: string; // error message or event description
  error_count?: number;
  impacted_users?: number;
  stack_trace?: string;
  level?: 'error' | 'warning' | 'info';
  platform: 'sentry' | 'posthog';
  first_seen?: string;
  last_seen?: string;
  project?: string;
}

// ─── Universal Feedback Schema ────────────────────────────────

export interface FeedbackItem {
  userId?: string;
  source: FeedbackSource | string;
  author: string;
  content: string;
  timestamp: string; // ISO string
  external_id?: string; // unique identifier from the source platform
  metadata: Record<string, unknown>;
}

export function feedbackItemToDbDict(item: FeedbackItem): Record<string, unknown> {
  const data: Record<string, unknown> = {
    source: item.source,
    author: item.author,
    content: item.content,
    timestamp: item.timestamp,
    metadata: item.metadata,
  };
  if (item.userId) {
    data['user_id'] = item.userId;
  }
  if (item.external_id) {
    data['external_id'] = item.external_id;
  }
  return data;
}

// ─── Response Types ───────────────────────────────────────────

export interface FeedbackResponse {
  id: string;
  source: string;
  author: string;
  content: string;
  timestamp: string;
  message: string;
}

export interface BatchFeedbackResponse {
  total_rows: number;
  saved: number;
  errors: Array<Record<string, unknown>>;
  message: string;
}

export interface HealthResponse {
  status: string;
  supabase: string;
  version: string;
}

export interface StatsResponse {
  total: number;
  by_source: Record<string, number>;
}
