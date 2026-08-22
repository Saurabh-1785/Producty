#!/usr/bin/env tsx
/**
 * ApeAI Layer 0 — Pull Play Store Reviews
 *
 * Main CLI entry point. Orchestrates the full workflow:
 *   1. Parse CLI arguments
 *   2. Check backend health
 *   3. Use webcmd to extract reviews (explore or reuse adapter)
 *   4. Normalize to AppStoreReviewInput schema
 *   5. POST to ApeAI's /api/ingestion/appstore
 *   6. Print summary
 *
 * Usage:
 *   npx tsx layer0/pull_play_reviews.ts \
 *     --app-id com.whatsapp \
 *     --limit 10 \
 *     --token "YOUR_JWT" \
 *     [--api-url http://localhost:8000] \
 *     [--force-explore]
 *
 * Environment variables (alternative to flags):
 *   APEAI_AUTH_TOKEN   — Supabase JWT
 *   APEAI_API_URL      — Backend URL (default: http://localhost:8000)
 */

import { extractReviews } from './webcmd_bridge.js';
import { normalizeReviewBatch } from './normalizer.js';
import { ingestReviews, checkBackendHealth } from './ingestion_client.js';

// ─── CLI Argument Parsing ─────────────────────────────────────

interface CliArgs {
  appId: string;
  limit: number;
  token: string;
  apiUrl: string;
  forceExplore: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {
    apiUrl: process.env['APEAI_API_URL'] || 'http://localhost:8000',
    token: process.env['APEAI_AUTH_TOKEN'] || '',
    limit: 10,
    forceExplore: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--app-id':
        parsed.appId = args[++i];
        break;
      case '--limit':
        parsed.limit = parseInt(args[++i], 10) || 10;
        break;
      case '--token':
        parsed.token = args[++i];
        break;
      case '--api-url':
        parsed.apiUrl = args[++i];
        break;
      case '--force-explore':
        parsed.forceExplore = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        if (args[i].startsWith('--')) {
          console.error(`❌ Unknown flag: ${args[i]}`);
          printUsage();
          process.exit(1);
        }
    }
  }

  // Validation
  if (!parsed.appId) {
    console.error('❌ Missing required --app-id flag');
    console.error('   Example: --app-id com.whatsapp');
    printUsage();
    process.exit(1);
  }

  if (!parsed.token) {
    console.error('❌ Missing auth token');
    console.error('   Provide via --token flag or APEAI_AUTH_TOKEN env var');
    console.error('   Get it from: Frontend → DevTools → Application → Local Storage → supabase auth token');
    process.exit(1);
  }

  if (parsed.limit! < 1 || parsed.limit! > 100) {
    console.warn(`⚠️  Limit ${parsed.limit} clamped to range [1, 100]`);
    parsed.limit = Math.max(1, Math.min(100, parsed.limit!));
  }

  return parsed as CliArgs;
}

function printUsage(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ApeAI Layer 0 — Google Play Store Review Ingestion (webcmd)    ║
╚══════════════════════════════════════════════════════════════════╝

USAGE:
  npx tsx layer0/pull_play_reviews.ts [options]

OPTIONS:
  --app-id <id>       Android package name (e.g., com.whatsapp)     [REQUIRED]
  --limit <n>         Max reviews to pull (1-100, default: 10)
  --token <jwt>       Supabase JWT for authentication               [REQUIRED]
  --api-url <url>     ApeAI backend URL (default: http://localhost:8000)
  --force-explore     Skip adapter reuse, force fresh browser exploration
  --help, -h          Show this help

ENVIRONMENT VARIABLES:
  APEAI_AUTH_TOKEN     Alternative to --token flag
  APEAI_API_URL        Alternative to --api-url flag

EXAMPLES:
  # First run (explore and discover the page):
  npx tsx layer0/pull_play_reviews.ts --app-id com.whatsapp --limit 10 --token "eyJ..." --force-explore

  # Second run (reuse the saved adapter — faster):
  npx tsx layer0/pull_play_reviews.ts --app-id com.whatsapp --limit 10 --token "eyJ..."

  # Recovery test (different app, may trigger fallback):
  npx tsx layer0/pull_play_reviews.ts --app-id com.some.obscure.app --limit 5 --token "eyJ..."
`);
}

// ─── Banner ───────────────────────────────────────────────────

function printBanner(args: CliArgs): void {
  console.log('');
  console.log('═'.repeat(64));
  console.log('  🦍 ApeAI Layer 0 — Autonomous Play Store Review Ingestion');
  console.log('═'.repeat(64));
  console.log(`  App ID:        ${args.appId}`);
  console.log(`  Review limit:  ${args.limit}`);
  console.log(`  API URL:       ${args.apiUrl}`);
  console.log(`  Mode:          ${args.forceExplore ? '🔍 Force Explore (fresh browser pass)' : '🔄 Auto (reuse adapter if available)'}`);
  console.log(`  Timestamp:     ${new Date().toISOString()}`);
  console.log('─'.repeat(64));
}

// ─── Summary ──────────────────────────────────────────────────

interface RunSummary {
  appId: string;
  reviewsFound: number;
  reviewsNormalized: number;
  reviewsSkipped: number;
  reviewsIngested: number;
  ingestionErrors: number;
  adapterReused: boolean;
  fallbackUsed: boolean;
  extractionTimeMs: number;
  totalTimeMs: number;
  skippedReasons: string[];
}

function printSummary(summary: RunSummary): void {
  console.log('');
  console.log('═'.repeat(64));
  console.log('  📊 Layer 0 Run Summary');
  console.log('═'.repeat(64));
  console.log(`  App:                ${summary.appId}`);
  console.log(`  Reviews found:      ${summary.reviewsFound}`);
  console.log(`  Reviews normalized: ${summary.reviewsNormalized}`);
  console.log(`  Reviews skipped:    ${summary.reviewsSkipped}${summary.skippedReasons.length > 0 ? ' (' + summary.skippedReasons.slice(0, 3).join(', ') + ')' : ''}`);
  console.log(`  Reviews ingested:   ${summary.reviewsIngested}`);
  console.log(`  Ingestion errors:   ${summary.ingestionErrors}`);
  console.log('─'.repeat(64));
  console.log(`  Adapter reused:     ${summary.adapterReused ? '✅ YES (fast path)' : '❌ NO (explored fresh)'}`);
  if (summary.fallbackUsed) {
    console.log(`  Fallback used:      ⚠️  YES (adapter failed → re-explored)`);
  }
  console.log(`  Extraction time:    ${summary.extractionTimeMs}ms`);
  console.log(`  Total time:         ${summary.totalTimeMs}ms`);
  console.log('═'.repeat(64));

  // Exit status
  if (summary.reviewsIngested > 0) {
    console.log('');
    console.log(`  ✅ SUCCESS — ${summary.reviewsIngested} review(s) are now in ApeAI's pipeline.`);
    console.log('     They will appear in the dashboard and are ready for Layer 2 clustering.');
  } else if (summary.reviewsFound === 0) {
    console.log('');
    console.log('  ⚠️  No reviews were extracted. Possible causes:');
    console.log('     - The app has no public reviews');
    console.log('     - webcmd could not access the Play Store page');
    console.log('     - The page structure changed (try --force-explore)');
  } else {
    console.log('');
    console.log('  ❌ Reviews were found but ingestion failed. Check errors above.');
  }
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const totalStart = Date.now();
  const args = parseArgs();

  printBanner(args);

  // Step 1: Health check
  console.log('\n🏥 Checking backend health...');
  const healthy = await checkBackendHealth(args.apiUrl);
  if (!healthy) {
    console.error(`❌ Cannot reach backend at ${args.apiUrl}`);
    console.error('   Make sure the ApeAI backend is running:');
    console.error('   cd backend && npm run dev');
    process.exit(1);
  }
  console.log('✅ Backend is healthy');

  // Step 2: Extract reviews via webcmd
  const webcmdResult = await extractReviews(
    args.appId,
    args.limit,
    args.forceExplore,
  );

  if (!webcmdResult.success) {
    console.error(`\n❌ Review extraction failed: ${webcmdResult.error}`);
    console.error('   Troubleshooting:');
    console.error('   1. Is webcmd installed? Run: webcmd --version');
    console.error('   2. Try: webcmd doctor');
    console.error('   3. Try with --force-explore to bypass the adapter');

    printSummary({
      appId: args.appId,
      reviewsFound: 0,
      reviewsNormalized: 0,
      reviewsSkipped: 0,
      reviewsIngested: 0,
      ingestionErrors: 0,
      adapterReused: webcmdResult.adapterReused,
      fallbackUsed: webcmdResult.fallbackUsed ?? false,
      extractionTimeMs: webcmdResult.elapsedMs,
      totalTimeMs: Date.now() - totalStart,
      skippedReasons: [],
    });
    process.exit(1);
  }

  console.log(`\n📦 webcmd returned ${webcmdResult.data.length} raw review(s)`);

  // Step 3: Normalize to AppStoreReviewInput
  console.log('\n🔧 Normalizing reviews to AppStoreReviewInput schema...');
  const { reviews, skipped } = normalizeReviewBatch(webcmdResult.data, args.appId);
  console.log(`   ✅ ${reviews.length} review(s) normalized`);
  if (skipped.length > 0) {
    console.log(`   ⚠️  ${skipped.length} review(s) skipped`);
  }

  // Step 4: Ingest into ApeAI
  const ingestionResult = await ingestReviews(reviews, args.apiUrl, args.token);

  // Step 5: Print summary
  printSummary({
    appId: args.appId,
    reviewsFound: webcmdResult.data.length,
    reviewsNormalized: reviews.length,
    reviewsSkipped: skipped.length,
    reviewsIngested: ingestionResult.saved,
    ingestionErrors: ingestionResult.errors.length,
    adapterReused: webcmdResult.adapterReused,
    fallbackUsed: webcmdResult.fallbackUsed ?? false,
    extractionTimeMs: webcmdResult.elapsedMs,
    totalTimeMs: Date.now() - totalStart,
    skippedReasons: skipped.map((s) => s.reason),
  });

  // Exit code
  process.exit(ingestionResult.success ? 0 : 1);
}

// ─── Run ──────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(2);
});
