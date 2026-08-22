/**
 * ApeAI Layer 0 — Ingestion Client
 *
 * HTTP client that POSTs normalized AppStoreReviewInput[]
 * to the existing ApeAI backend endpoint:
 *
 *   POST /api/ingestion/appstore
 *   Authorization: Bearer <supabase-jwt>
 *   Content-Type: application/json
 *   Body: AppStoreReviewInput[] (array of reviews)
 *
 * The endpoint accepts single or array payloads, validates
 * required fields (content, author, review_id), normalizes
 * to FeedbackItem, and saves to Supabase.
 */

import type { AppStoreReviewInput } from './normalizer.js';

// ─── Types ────────────────────────────────────────────────────

export interface IngestionResult {
  success: boolean;
  saved: number;
  total: number;
  errors: Array<Record<string, unknown>>;
  message: string;
  httpStatus?: number;
}

// ─── Configuration ────────────────────────────────────────────

const DEFAULT_API_URL = 'http://localhost:8000';
const INGESTION_PATH = '/api/ingestion/appstore';
const REQUEST_TIMEOUT_MS = 30_000;

// ─── Client ───────────────────────────────────────────────────

/**
 * POSTs an array of normalized reviews to ApeAI's ingestion endpoint.
 *
 * @param reviews   - Array of AppStoreReviewInput objects to ingest
 * @param apiUrl    - Base URL of the ApeAI backend (default: http://localhost:8000)
 * @param authToken - Supabase JWT bearer token for authentication
 * @returns IngestionResult with saved count, errors, and status
 */
export async function ingestReviews(
  reviews: AppStoreReviewInput[],
  apiUrl: string = DEFAULT_API_URL,
  authToken: string,
): Promise<IngestionResult> {
  if (reviews.length === 0) {
    return {
      success: true,
      saved: 0,
      total: 0,
      errors: [],
      message: 'No reviews to ingest (empty batch)',
    };
  }

  const url = `${apiUrl.replace(/\/+$/, '')}${INGESTION_PATH}`;

  console.log(`\n📤 POSTing ${reviews.length} reviews to ${url}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(reviews),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const body = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return handleHttpError(response.status, body, reviews.length);
    }

    const saved = (body['saved'] as number) ?? 0;
    const errors = (body['errors'] as Array<Record<string, unknown>>) ?? [];
    const message = (body['message'] as string) ?? `Ingested ${saved} reviews`;

    console.log(`✅ Backend response: ${message}`);

    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} review(s) had validation errors:`);
      for (const err of errors.slice(0, 5)) {
        console.warn(`   - Index ${err['index']}: ${JSON.stringify(err['errors'])}`);
      }
      if (errors.length > 5) {
        console.warn(`   ... and ${errors.length - 5} more`);
      }
    }

    return {
      success: true,
      saved,
      total: reviews.length,
      errors,
      message,
      httpStatus: response.status,
    };
  } catch (err) {
    const error = err as Error;

    if (error.name === 'AbortError') {
      return {
        success: false,
        saved: 0,
        total: reviews.length,
        errors: [{ error: 'Request timed out after 30 seconds' }],
        message: `Ingestion request timed out — is the backend running at ${apiUrl}?`,
      };
    }

    // Network/connection errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return {
        success: false,
        saved: 0,
        total: reviews.length,
        errors: [{ error: error.message }],
        message: `Cannot connect to backend at ${apiUrl} — is it running? (npm run dev in backend/)`,
      };
    }

    return {
      success: false,
      saved: 0,
      total: reviews.length,
      errors: [{ error: error.message }],
      message: `Ingestion failed: ${error.message}`,
    };
  }
}

// ─── Error Handling ───────────────────────────────────────────

function handleHttpError(
  status: number,
  body: Record<string, unknown>,
  totalReviews: number,
): IngestionResult {
  const detail = (body['detail'] as string) ?? JSON.stringify(body);

  switch (status) {
    case 401:
      console.error('❌ Authentication failed — invalid or expired token');
      console.error('   Get a fresh JWT from the frontend (DevTools → Application → Local Storage)');
      return {
        success: false,
        saved: 0,
        total: totalReviews,
        errors: [{ error: 'Authentication failed', detail }],
        message: 'Auth token is invalid or expired. Get a fresh JWT from the frontend.',
        httpStatus: 401,
      };

    case 422:
      console.error(`❌ Validation failed: ${detail}`);
      return {
        success: false,
        saved: 0,
        total: totalReviews,
        errors: (body['errors'] as Array<Record<string, unknown>>) ?? [{ error: detail }],
        message: `Backend rejected the payload: ${detail}`,
        httpStatus: 422,
      };

    case 400:
      console.error(`❌ Bad request: ${detail}`);
      return {
        success: false,
        saved: 0,
        total: totalReviews,
        errors: [{ error: detail }],
        message: `Bad request: ${detail}`,
        httpStatus: 400,
      };

    case 503:
      console.error('❌ Backend unavailable (database connection issue?)');
      return {
        success: false,
        saved: 0,
        total: totalReviews,
        errors: [{ error: detail }],
        message: 'Backend returned 503 — check Supabase connection.',
        httpStatus: 503,
      };

    default:
      console.error(`❌ Unexpected HTTP ${status}: ${detail}`);
      return {
        success: false,
        saved: 0,
        total: totalReviews,
        errors: [{ error: `HTTP ${status}: ${detail}` }],
        message: `Unexpected backend error (HTTP ${status})`,
        httpStatus: status,
      };
  }
}

/**
 * Quick health check — verifies the backend is reachable.
 */
export async function checkBackendHealth(apiUrl: string = DEFAULT_API_URL): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.json() as Record<string, unknown>;
    return body['status'] === 'ok';
  } catch {
    return false;
  }
}
