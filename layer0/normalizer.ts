/**
 * ApeAI Layer 0 — Review Normalizer
 *
 * Converts raw webcmd JSON output into the AppStoreReviewInput shape
 * expected by POST /api/ingestion/appstore.
 *
 * AppStoreReviewInput (from backend/src/types/feedback.ts):
 *   review_id: string       — REQUIRED, unique review identifier
 *   title?: string           — optional, prepended to content by normalizer
 *   content: string          — REQUIRED, the review text
 *   author: string           — REQUIRED, reviewer display name
 *   rating: number           — 1–5 stars
 *   app_version?: string     — optional
 *   platform: 'android'      — always 'android' for Play Store
 *   country?: string         — optional
 *   review_date?: string     — ISO string, optional
 *
 * The backend normalizer (normalizeAppStoreReview) will:
 *   - Set source: 'google_play' when platform === 'android'
 *   - Store rating, app_version, country, review_id in metadata
 *   - Use review_date as timestamp
 *   - Set external_id to review_id
 */

import crypto from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────

/** Matches the backend AppStoreReviewInput interface exactly */
export interface AppStoreReviewInput {
  review_id: string;
  title?: string;
  content: string;
  author: string;
  rating: number;
  app_version?: string;
  platform: 'ios' | 'android';
  country?: string;
  review_date?: string;
}

export interface NormalizationResult {
  reviews: AppStoreReviewInput[];
  skipped: SkippedReview[];
}

export interface SkippedReview {
  index: number;
  reason: string;
  rawData: Record<string, unknown>;
}

// ─── Normalization ────────────────────────────────────────────

/**
 * Generates a deterministic review ID from content + author.
 * Used when webcmd output doesn't include a review_id.
 */
function generateReviewId(appId: string, author: string, content: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${appId}::${author}::${content.slice(0, 200)}`)
    .digest('hex')
    .slice(0, 16);
  return `gplay-webcmd-${hash}`;
}

/**
 * Tries to parse a date string into ISO format.
 * Handles various formats that might appear on Play Store (e.g. "August 15, 2026").
 */
function parseReviewDate(rawDate: unknown): string | undefined {
  if (!rawDate) return undefined;

  const dateStr = String(rawDate).trim();
  if (!dateStr) return undefined;

  // Already ISO format?
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr;
  }

  // Try standard Date parsing
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]; // Return date-only ISO
    }
  } catch {
    // Fall through
  }

  // Return as-is — the backend will use new Date().toISOString() as fallback
  return dateStr;
}

/**
 * Tries to extract a numeric rating from various formats.
 */
function parseRating(rawRating: unknown): number {
  if (typeof rawRating === 'number') {
    return Math.min(5, Math.max(1, Math.round(rawRating)));
  }

  if (typeof rawRating === 'string') {
    const match = rawRating.match(/(\d)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.min(5, Math.max(1, num));
    }
  }

  return 0; // Unknown — 0 signals "not available"
}

/**
 * Normalizes a single raw webcmd review object into AppStoreReviewInput.
 * Returns null if required fields (content, author) are missing.
 */
export function normalizeWebcmdReview(
  raw: Record<string, unknown>,
  index: number,
  appId: string,
): { review: AppStoreReviewInput } | { skipped: SkippedReview } {
  // Extract content — try multiple possible field names
  const content =
    asString(raw['content']) ||
    asString(raw['review_text']) ||
    asString(raw['text']) ||
    asString(raw['body']) ||
    asString(raw['review']);

  if (!content || content.trim().length < 3) {
    return {
      skipped: {
        index,
        reason: 'Missing or empty "content" field',
        rawData: raw,
      },
    };
  }

  // Extract author — try multiple possible field names
  const author =
    asString(raw['author']) ||
    asString(raw['reviewer']) ||
    asString(raw['user']) ||
    asString(raw['display_name']) ||
    asString(raw['userName']) ||
    'anonymous';

  if (!author || author.trim().length === 0) {
    return {
      skipped: {
        index,
        reason: 'Missing "author" field',
        rawData: raw,
      },
    };
  }

  // Extract review_id
  const reviewId =
    asString(raw['review_id']) ||
    asString(raw['reviewId']) ||
    asString(raw['id']) ||
    generateReviewId(appId, author, content);

  // Extract optional fields with graceful fallbacks
  const title = asString(raw['title']) || asString(raw['summary']) || undefined;
  const rating = parseRating(raw['rating'] ?? raw['score'] ?? raw['stars']);
  const reviewDate = parseReviewDate(raw['review_date'] ?? raw['date'] ?? raw['reviewDate']);
  const appVersion = asString(raw['app_version']) ?? asString(raw['appVersion']) ?? undefined;
  const country = asString(raw['country']) ?? asString(raw['region']) ?? undefined;

  const review: AppStoreReviewInput = {
    review_id: reviewId,
    content: content.trim(),
    author: author.trim(),
    rating,
    platform: 'android',
    ...(title && { title }),
    ...(appVersion && { app_version: appVersion }),
    ...(country && { country }),
    ...(reviewDate && { review_date: reviewDate }),
  };

  return { review };
}

/**
 * Normalizes an array of raw webcmd review objects into AppStoreReviewInput[].
 * Logs warnings for skipped reviews but never crashes the batch.
 */
export function normalizeReviewBatch(
  rawData: Record<string, unknown>[],
  appId: string,
): NormalizationResult {
  const reviews: AppStoreReviewInput[] = [];
  const skipped: SkippedReview[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const raw = rawData[i];

    try {
      const result = normalizeWebcmdReview(raw, i, appId);

      if ('review' in result) {
        reviews.push(result.review);
      } else {
        console.warn(
          `⚠️  Skipped review #${i}: ${result.skipped.reason}`,
        );
        skipped.push(result.skipped);
      }
    } catch (err) {
      const reason = `Unexpected error: ${(err as Error).message}`;
      console.warn(`⚠️  Skipped review #${i}: ${reason}`);
      skipped.push({ index: i, reason, rawData: raw });
    }
  }

  return { reviews, skipped };
}

// ─── Helpers ──────────────────────────────────────────────────

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (value !== null && value !== undefined) {
    const str = String(value).trim();
    return str.length > 0 ? str : undefined;
  }
  return undefined;
}
