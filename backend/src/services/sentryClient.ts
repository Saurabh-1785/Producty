/**
 * ApeAI — Sentry / PostHog Connector Client (Layer 1)
 *
 * Responsible for fetching observability data:
 *   - Sentry crash reports and error groups
 *   - PostHog user friction events
 *
 * Environment variables:
 *   SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
 *   SENTRY_WEBHOOK_SECRET (for inbound webhook signature verification)
 *   POSTHOG_API_KEY, POSTHOG_PROJECT_ID
 *
 * This client provides:
 *   - fetchSentryIssues() — polls Sentry error groups
 *   - fetchPostHogEvents() — polls PostHog user friction events
 *   - Mock fixtures for local testing
 */

import { ObservabilityAlertInput } from '../types/feedback';

// ─── Configuration ────────────────────────────────────────────

interface SentryConfig {
  authToken?: string;
  org?: string;
  project?: string;
  webhookSecret?: string;
}

interface PostHogConfig {
  apiKey?: string;
  projectId?: string;
}

function getSentryConfig(): SentryConfig {
  return {
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    webhookSecret: process.env.SENTRY_WEBHOOK_SECRET,
  };
}

function getPostHogConfig(): PostHogConfig {
  return {
    apiKey: process.env.POSTHOG_API_KEY,
    projectId: process.env.POSTHOG_PROJECT_ID,
  };
}

export function getSentryWebhookSecret(): string | undefined {
  return process.env.SENTRY_WEBHOOK_SECRET;
}

// ─── Mock Fixtures ────────────────────────────────────────────

export function getMockSentryIssues(): ObservabilityAlertInput[] {
  return [
    {
      alert_id: 'sentry-mock-001',
      title: 'TypeError: Cannot read properties of undefined (reading \'map\')',
      content: 'Unhandled exception in FeedbackList component. The feedbacks array is undefined when the API returns an empty response body instead of an empty array.',
      error_count: 342,
      impacted_users: 89,
      stack_trace: `TypeError: Cannot read properties of undefined (reading 'map')
    at FeedbackList (webpack:///src/components/FeedbackList.tsx:45:22)
    at renderWithHooks (webpack:///node_modules/react-dom/cjs/react-dom.development.js:14985:18)
    at mountIndeterminateComponent (webpack:///node_modules/react-dom/cjs/react-dom.development.js:17811:13)`,
      level: 'error',
      platform: 'sentry',
      first_seen: new Date(Date.now() - 86400000).toISOString(),
      last_seen: new Date().toISOString(),
      project: 'apeai-frontend',
    },
    {
      alert_id: 'sentry-mock-002',
      title: 'TimeoutError: Supabase query exceeded 30s timeout',
      content: 'Database query timeout when fetching embeddings for large feedback batches (>500 items). The pgvector similarity search is not using the IVFFlat index correctly.',
      error_count: 56,
      impacted_users: 23,
      stack_trace: `TimeoutError: Supabase query exceeded 30s timeout
    at SupabaseClient.from (webpack:///src/db/supabase.ts:23:5)
    at embeddingService.batchSearch (webpack:///src/services/embeddingService.ts:89:12)
    at clusterService.runClustering (webpack:///src/services/clusterService.ts:45:8)`,
      level: 'error',
      platform: 'sentry',
      first_seen: new Date(Date.now() - 172800000).toISOString(),
      last_seen: new Date(Date.now() - 3600000).toISOString(),
      project: 'apeai-backend',
    },
  ];
}

export function getMockPostHogEvents(): ObservabilityAlertInput[] {
  return [
    {
      alert_id: 'posthog-mock-001',
      title: 'High rage-click rate on Export Button',
      content: 'Users are rage-clicking the "Export to PDF" button an average of 4.2 times before the action completes. This indicates the button does not provide adequate loading feedback.',
      error_count: 0,
      impacted_users: 156,
      level: 'warning',
      platform: 'posthog',
      first_seen: new Date(Date.now() - 604800000).toISOString(),
      last_seen: new Date().toISOString(),
      project: 'apeai-frontend',
    },
  ];
}

// ─── Live API Clients ─────────────────────────────────────────

/**
 * Fetches unresolved issues from Sentry.
 * Falls back to mock data if API credentials are not configured.
 */
export async function fetchSentryIssues(
  limit: number = 25,
): Promise<ObservabilityAlertInput[]> {
  const config = getSentryConfig();

  if (!config.authToken || !config.org || !config.project) {
    console.info('⚠️  Sentry API not configured — returning mock issues');
    return getMockSentryIssues();
  }

  // TODO: Implement live Sentry API call
  // Reference: https://docs.sentry.io/api/events/list-a-projects-issues/
  console.info(`⚡ Fetching Sentry issues for ${config.org}/${config.project} (limit: ${limit})`);
  console.warn('🔧 Live Sentry API integration pending — using mocks');
  return getMockSentryIssues();
}

/**
 * Fetches user friction events from PostHog.
 * Falls back to mock data if API credentials are not configured.
 */
export async function fetchPostHogEvents(
  limit: number = 25,
): Promise<ObservabilityAlertInput[]> {
  const config = getPostHogConfig();

  if (!config.apiKey || !config.projectId) {
    console.info('⚠️  PostHog API not configured — returning mock events');
    return getMockPostHogEvents();
  }

  // TODO: Implement live PostHog API call
  // Reference: https://posthog.com/docs/api
  console.info(`📊 Fetching PostHog events (limit: ${limit})`);
  console.warn('🔧 Live PostHog API integration pending — using mocks');
  return getMockPostHogEvents();
}
