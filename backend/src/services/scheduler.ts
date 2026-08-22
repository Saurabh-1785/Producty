/**
 * ApeAI — Cron Job Scheduler Service (Layer 1)
 *
 * Executes periodic background polling for:
 *   - App Store reviews (iOS + Android)
 *   - Reddit keyword feeds
 *   - Sentry error groups
 *
 * Uses setInterval-based scheduling (no external cron dependency).
 * Each job runs independently and logs its results.
 *
 * Environment variables:
 *   SCHEDULER_ENABLED=true (opt-in — disabled by default)
 *   SCHEDULER_INTERVAL_MINUTES=60 (polling interval)
 */

import { fetchAppStoreReviews, fetchGooglePlayReviews } from './appStoreClient';
import { fetchSubredditPosts } from './redditClient';
import { fetchSentryIssues } from './sentryClient';
import { normalizeAppStoreReview, normalizeRedditPost, normalizeObservabilityAlert } from './normalize';
import { saveFeedbackBatch } from './saveFeedback';
import { FeedbackItem } from '../types/feedback';

// ─── Configuration ────────────────────────────────────────────

interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  subreddits: string[];
}

function getSchedulerConfig(): SchedulerConfig {
  return {
    enabled: process.env.SCHEDULER_ENABLED === 'true',
    intervalMinutes: parseInt(process.env.SCHEDULER_INTERVAL_MINUTES ?? '60', 10),
    subreddits: (process.env.SCHEDULER_SUBREDDITS ?? '').split(',').filter(Boolean),
  };
}

// ─── Job Definitions ──────────────────────────────────────────

async function pollAppStoreReviews(): Promise<number> {
  console.info('📱 [Scheduler] Polling App Store reviews...');
  try {
    const iosReviews = await fetchAppStoreReviews();
    const androidReviews = await fetchGooglePlayReviews();
    const allReviews = [...iosReviews, ...androidReviews];

    if (allReviews.length === 0) {
      console.info('📱 [Scheduler] No new reviews found');
      return 0;
    }

    const normalized: FeedbackItem[] = allReviews.map(normalizeAppStoreReview);
    const saved = await saveFeedbackBatch(normalized);
    console.info(`📱 [Scheduler] Saved ${saved.length} app store reviews`);
    return saved.length;
  } catch (err) {
    console.error('📱 [Scheduler] App Store polling failed:', err);
    return 0;
  }
}

async function pollRedditFeeds(): Promise<number> {
  const config = getSchedulerConfig();
  const subreddits = config.subreddits.length > 0 ? config.subreddits : ['ProductManagement'];

  console.info(`🤖 [Scheduler] Polling Reddit feeds: ${subreddits.join(', ')}...`);
  try {
    let totalSaved = 0;

    for (const sub of subreddits) {
      const posts = await fetchSubredditPosts(sub);
      if (posts.length > 0) {
        const normalized: FeedbackItem[] = posts.map(normalizeRedditPost);
        const saved = await saveFeedbackBatch(normalized);
        totalSaved += saved.length;
      }
    }

    console.info(`🤖 [Scheduler] Saved ${totalSaved} Reddit posts`);
    return totalSaved;
  } catch (err) {
    console.error('🤖 [Scheduler] Reddit polling failed:', err);
    return 0;
  }
}

async function pollSentryIssues(): Promise<number> {
  console.info('⚡ [Scheduler] Polling Sentry issues...');
  try {
    const issues = await fetchSentryIssues();

    if (issues.length === 0) {
      console.info('⚡ [Scheduler] No new Sentry issues found');
      return 0;
    }

    const normalized: FeedbackItem[] = issues.map(normalizeObservabilityAlert);
    const saved = await saveFeedbackBatch(normalized);
    console.info(`⚡ [Scheduler] Saved ${saved.length} Sentry issues`);
    return saved.length;
  } catch (err) {
    console.error('⚡ [Scheduler] Sentry polling failed:', err);
    return 0;
  }
}

// ─── Scheduler Controller ─────────────────────────────────────

let schedulerIntervalId: ReturnType<typeof setInterval> | null = null;

async function runAllJobs(): Promise<void> {
  console.info('🕐 [Scheduler] Running all polling jobs...');
  const startTime = Date.now();

  const [appStoreCount, redditCount, sentryCount] = await Promise.allSettled([
    pollAppStoreReviews(),
    pollRedditFeeds(),
    pollSentryIssues(),
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.info(
    `🕐 [Scheduler] All jobs complete in ${elapsed}s — ` +
    `AppStore: ${appStoreCount.status === 'fulfilled' ? appStoreCount.value : 'error'}, ` +
    `Reddit: ${redditCount.status === 'fulfilled' ? redditCount.value : 'error'}, ` +
    `Sentry: ${sentryCount.status === 'fulfilled' ? sentryCount.value : 'error'}`,
  );
}

/**
 * Starts the background scheduler if SCHEDULER_ENABLED=true.
 * Runs polling jobs immediately on start, then at the configured interval.
 */
export function startScheduler(): void {
  const config = getSchedulerConfig();

  if (!config.enabled) {
    console.info('🕐 [Scheduler] Disabled (set SCHEDULER_ENABLED=true to enable)');
    return;
  }

  if (schedulerIntervalId) {
    console.warn('🕐 [Scheduler] Already running — skipping duplicate start');
    return;
  }

  const intervalMs = config.intervalMinutes * 60 * 1000;

  console.info(
    `🕐 [Scheduler] Starting with ${config.intervalMinutes}-minute interval`,
  );

  // Run immediately
  runAllJobs();

  // Then run on interval
  schedulerIntervalId = setInterval(runAllJobs, intervalMs);
}

/**
 * Stops the background scheduler.
 */
export function stopScheduler(): void {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.info('🕐 [Scheduler] Stopped');
  }
}

/**
 * Returns the current scheduler status.
 */
export function getSchedulerStatus(): { running: boolean; intervalMinutes: number; enabled: boolean } {
  const config = getSchedulerConfig();
  return {
    running: schedulerIntervalId !== null,
    intervalMinutes: config.intervalMinutes,
    enabled: config.enabled,
  };
}
