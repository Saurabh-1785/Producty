/**
 * ApeAI — Transcript Storage Service (Layer 1)
 *
 * Ingests raw meeting transcripts from Fireflies.ai and Zoom.
 *   - Validates transcript metadata
 *   - Normalizes to FeedbackItem schema
 *   - Persists raw transcript to database
 *   - Emits trigger notification to Layer 3 AI pipeline
 *
 * Environment variables:
 *   FIREFLIES_WEBHOOK_SECRET (for signature verification)
 *   ZOOM_WEBHOOK_SECRET (for signature verification)
 */

import { TranscriptWebhookInput } from '../types/feedback';
import { normalizeTranscript } from './normalize';
import { validateIngestionPayload } from './validate';
import { saveFeedback } from './saveFeedback';

// ─── Mock Fixtures ────────────────────────────────────────────

export function getMockTranscripts(): TranscriptWebhookInput[] {
  return [
    {
      transcript_id: 'transcript-mock-001',
      meeting_title: 'Weekly Product Sync — Sprint 24 Review',
      content: `[00:00] Sarah (PM): Let's start with the feedback review from this week. We received 47 new pieces of feedback.
[00:15] Mike (Eng): The most common theme I'm seeing is around the export functionality. Multiple users are reporting PDF export failures.
[00:32] Sarah: Yes, that aligns with what I'm seeing in the support tickets. We should prioritize this fix.
[00:45] Lisa (Design): I also noticed several requests for dark mode. The eye strain complaints are increasing.
[01:02] Mike: That's a bigger lift. We'd need to audit all our color tokens and create a new theme system.
[01:18] Sarah: Let's add it to the backlog as a P2. For now, let's focus on the export bug and the onboarding flow improvements.
[01:30] Lisa: Agreed. I'll prepare mockups for the new onboarding by Thursday.`,
      participants: ['Sarah (PM)', 'Mike (Eng)', 'Lisa (Design)'],
      duration_seconds: 1800,
      platform: 'fireflies',
      meeting_date: new Date().toISOString(),
    },
    {
      transcript_id: 'transcript-mock-002',
      meeting_title: 'Customer Discovery Call — Enterprise Prospect',
      content: `[00:00] Alex (Sales): Thanks for joining. We'd love to understand your current workflow for managing product feedback.
[00:12] Customer: We currently use spreadsheets and Slack channels. It's completely manual and things fall through the cracks constantly.
[00:28] Alex: How many feedback items do you process monthly?
[00:35] Customer: Roughly 2000 to 3000 across support tickets, app reviews, and internal product notes. We need automated categorization and prioritization.
[00:52] Alex: That's exactly what ApeAI does. Our AI clusters similar feedback automatically.
[01:05] Customer: The key requirement for us is SSO integration and SOC2 compliance. Without those, we can't even start the procurement process.`,
      participants: ['Alex (Sales)', 'Enterprise Customer'],
      duration_seconds: 2400,
      platform: 'zoom',
      meeting_date: new Date().toISOString(),
    },
  ];
}

// ─── Transcript Ingestion ─────────────────────────────────────

/**
 * Ingests a single transcript webhook payload.
 *   1. Validates required fields
 *   2. Normalizes to FeedbackItem
 *   3. Saves to database
 *   4. Emits Layer 3 trigger (async)
 *
 * @returns The saved feedback record
 */
export async function ingestTranscript(
  data: TranscriptWebhookInput,
  userId?: string,
): Promise<Record<string, unknown>> {
  // Validate payload
  const validation = validateIngestionPayload(
    data as unknown as Record<string, unknown>,
    ['content', 'meeting_title', 'transcript_id'],
  );

  if (!validation.valid) {
    throw new Error(`Transcript validation failed: ${validation.errors.join('; ')}`);
  }

  // Normalize to FeedbackItem
  const feedbackItem = normalizeTranscript(data);
  if (userId) {
    feedbackItem.userId = userId;
  }

  // Persist to database
  const saved = await saveFeedback(feedbackItem);

  // Emit Layer 3 trigger notification (async — fire and forget)
  console.info(
    `🎙️ Transcript ingested: "${data.meeting_title}" (${data.participants.length} participants). ` +
    `Layer 3 trigger emitted for feedback id=${(saved as Record<string, unknown>)['id']}`,
  );

  return saved;
}

/**
 * Retrieves the appropriate webhook secret for a transcript platform.
 */
export function getTranscriptWebhookSecret(platform: 'fireflies' | 'zoom'): string | undefined {
  if (platform === 'fireflies') {
    return process.env.FIREFLIES_WEBHOOK_SECRET;
  }
  return process.env.ZOOM_WEBHOOK_SECRET;
}
