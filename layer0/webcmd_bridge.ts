/**
 * Producty Layer 0 — webcmd Bridge
 *
 * Encapsulates all interactions with the webcmd CLI:
 *   - Check if a google-play adapter already exists
 *   - Run an existing adapter command
 *   - Explore a page via browser and extract structured data
 *   - Trigger adapter creation via webcmd-adapter-author
 *
 * All calls shell out to the `webcmd` binary via child_process.
 * Output is always requested as JSON (-f json).
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

// ─── Constants ────────────────────────────────────────────────

const WEBCMD_BIN = 'webcmd';
const EXEC_TIMEOUT_MS = 120_000; // 2 minutes for browser exploration
const ADAPTER_TIMEOUT_MS = 30_000; // 30 seconds for adapter reuse
const RATE_LIMIT_MS = 1_000; // 1 second between interactions

/** The webcmd site name for our Google Play adapter */
export const GOOGLE_PLAY_SITE = 'google-play';
export const REVIEWS_COMMAND = 'reviews';

// ─── Prompt for adapter creation ──────────────────────────────

export const ADAPTER_CREATION_PROMPT = `
Create a private Webcmd adapter for Google Play Store app reviews.
Command: webcmd google-play reviews --app-id <app_id> --limit <limit>
Output JSON rows with stable keys: review_id, author, title, content,
rating, review_date, helpful_count, app_version, country.
This is public, read-only data on play.google.com — do not log in,
do not vote, reply, or report any review. Use the PUBLIC strategy.
Return null for any field not found on the page.
Verify with app ID com.whatsapp and return 5 JSON examples.
`.trim();

// ─── Types ────────────────────────────────────────────────────

export interface WebcmdResult {
  success: boolean;
  data: Record<string, unknown>[];
  adapterReused: boolean;
  elapsedMs: number;
  error?: string;
  fallbackUsed?: boolean;
}

interface ExecResult {
  stdout: string;
  stderr: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWebcmd(
  args: string[],
  timeoutMs: number = ADAPTER_TIMEOUT_MS,
): Promise<ExecResult> {
  try {
    const result = await execFileAsync(WEBCMD_BIN, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
      env: { ...process.env },
    });
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (err: unknown) {
    const error = err as Error & { stdout?: string; stderr?: string; code?: string };
    // If the command exited with output, still return it
    if (error.stdout) {
      return { stdout: error.stdout, stderr: error.stderr || '' };
    }
    throw new Error(
      `webcmd command failed: ${error.message}\n` +
        `args: ${args.join(' ')}\n` +
        `stderr: ${error.stderr || '(none)'}`,
    );
  }
}

function parseJsonOutput(stdout: string): Record<string, unknown>[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object' && parsed !== null) return [parsed];
    return [];
  } catch {
    // Try to find JSON array within the output
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // Fall through
      }
    }

    // Try to find individual JSON objects
    const objectMatches = trimmed.match(/\{[\s\S]*?\}/g);
    if (objectMatches) {
      const results: Record<string, unknown>[] = [];
      for (const match of objectMatches) {
        try {
          results.push(JSON.parse(match));
        } catch {
          // Skip unparseable objects
        }
      }
      if (results.length > 0) return results;
    }

    console.warn('⚠️  Could not parse webcmd output as JSON');
    console.warn('   Raw output (first 500 chars):', trimmed.slice(0, 500));
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Checks whether a webcmd adapter for the given site exists.
 */
export async function checkAdapterExists(
  site: string = GOOGLE_PLAY_SITE,
): Promise<boolean> {
  try {
    const result = await runWebcmd(['list', '-f', 'json'], 10_000);
    const adapters = parseJsonOutput(result.stdout);

    return adapters.some(
      (adapter) =>
        (adapter['site'] as string)?.toLowerCase() === site.toLowerCase() ||
        (adapter['name'] as string)?.toLowerCase().includes(site.toLowerCase()),
    );
  } catch (err) {
    console.warn(
      `⚠️  Could not check adapter registry: ${(err as Error).message}`,
    );
    return false;
  }
}

/**
 * Runs an existing webcmd adapter command and returns parsed JSON results.
 */
export async function runAdapter(
  appId: string,
  limit: number,
  site: string = GOOGLE_PLAY_SITE,
  command: string = REVIEWS_COMMAND,
): Promise<WebcmdResult> {
  const startTime = Date.now();

  try {
    console.log(
      `🔄 Running adapter: webcmd ${site} ${command} --app-id ${appId} --limit ${limit}`,
    );

    const result = await runWebcmd(
      [site, command, '--app-id', appId, '--limit', String(limit), '-f', 'json'],
      ADAPTER_TIMEOUT_MS,
    );

    const data = parseJsonOutput(result.stdout);
    const elapsedMs = Date.now() - startTime;

    if (data.length === 0 && result.stderr) {
      console.warn(
        `⚠️  Adapter returned no data. stderr: ${result.stderr.slice(0, 300)}`,
      );
    }

    return {
      success: data.length > 0,
      data,
      adapterReused: true,
      elapsedMs,
      error: data.length === 0 ? 'Adapter returned no results' : undefined,
    };
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    return {
      success: false,
      data: [],
      adapterReused: true,
      elapsedMs,
      error: `Adapter execution failed: ${(err as Error).message}`,
    };
  }
}

/**
 * Builds a Playwright-style browser script for extracting reviews.
 * Written to a temp file and executed via `webcmd browser run --file`.
 */
function buildBrowserScript(url: string, limit: number): string {
  return `
// Navigate to the app page
await page.goto('${url}', { waitUntil: 'domcontentloaded', timeout: 30000 });

// Wait for reviews section to load
await page.waitForTimeout(3000);

// Try to scroll to load more reviews
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1000);
}

// Extract review data from the page
const reviews = await page.evaluate((maxReviews) => {
  const results = [];
  
  // Google Play reviews — try multiple selectors as structure may vary
  const reviewElements = document.querySelectorAll(
    '[jscontroller] [class*="review"], ' +
    'div[data-reviewid], ' +
    '.h3YV2d, ' +
    '[class*="RHo1pe"]'
  );
  
  const seen = new Set();
  
  for (const el of reviewElements) {
    if (results.length >= maxReviews) break;
    
    // Extract review text
    let content = '';
    const contentEl = el.querySelector(
      '[class*="review-body"], .h3YV2d, ' +
      'span[jsname="bN97Pc"], span[jsname="fbQN7e"], [class*="UD7Dzf"]'
    );
    if (contentEl) content = contentEl.textContent?.trim() || '';
    if (!content) {
      const spans = el.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent?.trim() || '';
        if (text.length > 20 && !text.includes('\\u2605')) {
          content = text;
          break;
        }
      }
    }
    if (!content || content.length < 5) continue;
    
    // Extract author
    let author = 'anonymous';
    const authorEl = el.querySelector(
      '[class*="author"], span[class*="X43Kjb"], ' +
      'div[class*="YNR7H"] span, [class*="vsQHp"]'
    );
    if (authorEl) author = authorEl.textContent?.trim() || 'anonymous';
    
    // Dedup
    const key = author + '::' + content.slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    
    // Extract rating
    let rating = 0;
    const ratingEl = el.querySelector(
      '[aria-label*="star"], [aria-label*="Star"], ' +
      '[class*="pf5lIe"] > div, [role="img"][aria-label]'
    );
    if (ratingEl) {
      const label = ratingEl.getAttribute('aria-label') || '';
      const m = label.match(/(\\d)/);
      if (m) rating = parseInt(m[1], 10);
    }
    
    // Extract date
    let reviewDate = null;
    const dateEl = el.querySelector(
      '[class*="bp9Aid"], span[class*="p2TkOb"], [class*="review-date"]'
    );
    if (dateEl) reviewDate = dateEl.textContent?.trim() || null;
    
    // Extract helpful count
    let helpfulCount = null;
    const helpfulEl = el.querySelector(
      '[class*="jILTFe"], [aria-label*="helpful"], [class*="AJTPZc"]'
    );
    if (helpfulEl) {
      const ht = helpfulEl.textContent?.trim() || '';
      const hm = ht.match(/(\\d+)/);
      if (hm) helpfulCount = parseInt(hm[1], 10);
    }
    
    // Extract review ID
    let reviewId = el.getAttribute('data-reviewid') || null;
    if (!reviewId) {
      reviewId = 'gplay-' + Array.from(content.slice(0, 50))
        .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
        .toString(36);
    }
    
    results.push({
      review_id: reviewId,
      author,
      title: null,
      content,
      rating: rating || null,
      review_date: reviewDate,
      helpful_count: helpfulCount,
      app_version: null,
      country: null,
    });
  }
  
  return results;
}, ${limit});

return reviews;
`;
}

/**
 * Uses webcmd's browser to explore a Play Store page and extract reviews.
 * This is the "first run" / "explore" path — slower but discovers the page layout.
 */
export async function exploreAndExtract(
  appId: string,
  limit: number,
): Promise<WebcmdResult> {
  const startTime = Date.now();
  const url = `https://play.google.com/store/apps/details?id=${appId}`;

  console.log(`🔍 Exploring Play Store page: ${url}`);
  console.log(`   Extracting up to ${limit} reviews via browser...`);

  // Prepare temp file for the browser script
  const tmpDir = join(process.cwd(), '.layer0-tmp');
  const scriptPath = join(tmpDir, `browser_script_${Date.now()}.js`);

  try {
    mkdirSync(tmpDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  try {
    // Step 1: Create a browser session
    console.log('   Creating browser session...');
    const sessionResult = await runWebcmd(
      ['session', 'create', '-f', 'json'],
      15_000,
    );

    await sleep(RATE_LIMIT_MS);

    let sessionId: string | undefined;
    try {
      const sessionData = JSON.parse(sessionResult.stdout.trim());
      sessionId =
        sessionData['sessionId'] ||
        sessionData['session_id'] ||
        sessionData['id'] ||
        (typeof sessionData === 'string' ? sessionData : undefined);
    } catch {
      const match = sessionResult.stdout.match(/session_[a-f0-9-]+/);
      sessionId = match?.[0];
    }

    if (!sessionId) {
      throw new Error(
        `Could not extract session ID from webcmd: ${sessionResult.stdout.slice(0, 200)}`,
      );
    }

    console.log(`   Session created: ${sessionId}`);

    // Step 2: Write browser script to temp file and run it
    console.log('   Running browser script to extract reviews...');
    const script = buildBrowserScript(url, limit);
    writeFileSync(scriptPath, script, 'utf-8');

    await sleep(RATE_LIMIT_MS);

    const runResult = await runWebcmd(
      [
        '--session',
        sessionId,
        'browser',
        'run',
        '--file',
        scriptPath,
        '--timeout',
        '60',
        '--no-snapshot-diff',
      ],
      EXEC_TIMEOUT_MS,
    );

    // Step 3: Clean up the session
    try {
      await runWebcmd(['session', 'close', sessionId], 10_000);
      console.log(`   Session ${sessionId} closed.`);
    } catch {
      console.warn(`⚠️  Could not close session ${sessionId} (non-fatal)`);
    }

    const data = parseJsonOutput(runResult.stdout);
    const elapsedMs = Date.now() - startTime;

    return {
      success: data.length > 0,
      data,
      adapterReused: false,
      elapsedMs,
      error: data.length === 0 ? 'Exploration returned no reviews' : undefined,
    };
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    console.error(`❌ Browser exploration failed: ${(err as Error).message}`);

    return {
      success: false,
      data: [],
      adapterReused: false,
      elapsedMs,
      error: `Exploration failed: ${(err as Error).message}`,
    };
  } finally {
    // Clean up temp script file
    try {
      unlinkSync(scriptPath);
    } catch {
      // File may not exist if we failed early
    }
  }
}

/**
 * Uses webcmd web fetch to extract reviews via HTTP (no browser needed).
 * Falls back to browser exploration if fetch returns FETCH_REQUIRES_BROWSER.
 */
export async function fetchAndExtract(
  appId: string,
  limit: number,
): Promise<WebcmdResult> {
  const startTime = Date.now();
  const url = `https://play.google.com/store/apps/details?id=${appId}`;

  console.log(`📡 Attempting web fetch: ${url}`);

  try {
    const result = await runWebcmd(
      ['web', 'fetch', '--url', url],
      ADAPTER_TIMEOUT_MS,
    );

    await sleep(RATE_LIMIT_MS);

    // Check for browser-required codes
    if (
      result.stdout.includes('FETCH_REQUIRES_BROWSER') ||
      result.stdout.includes('FETCH_BLOCKED')
    ) {
      console.log(
        '   Fetch requires browser — falling back to browser exploration',
      );
      const browserResult = await exploreAndExtract(appId, limit);
      return { ...browserResult, fallbackUsed: true };
    }

    // Try to extract review data from the fetched content
    const data = parseJsonOutput(result.stdout);
    const elapsedMs = Date.now() - startTime;

    if (data.length === 0) {
      console.log(
        '   Web fetch returned no structured data — falling back to browser',
      );
      const browserResult = await exploreAndExtract(appId, limit);
      return { ...browserResult, fallbackUsed: true };
    }

    return {
      success: true,
      data,
      adapterReused: false,
      elapsedMs,
    };
  } catch (err) {
    console.warn(
      `⚠️  Web fetch failed (${(err as Error).message}) — falling back to browser`,
    );

    const browserResult = await exploreAndExtract(appId, limit);
    return { ...browserResult, fallbackUsed: true };
  }
}

/**
 * Full extraction pipeline with explore → adapter → reuse lifecycle:
 *   1. If forceExplore is false, check if adapter exists and try it
 *   2. If adapter fails or doesn't exist, fall back to exploration
 *   3. Report whether adapter was reused or exploration was needed
 */
export async function extractReviews(
  appId: string,
  limit: number,
  forceExplore: boolean = false,
): Promise<WebcmdResult> {
  // Step 1: Unless forced, try the reuse path first
  if (!forceExplore) {
    console.log('\n📋 Checking for existing google-play adapter...');
    const hasAdapter = await checkAdapterExists(GOOGLE_PLAY_SITE);

    if (hasAdapter) {
      console.log('✅ Adapter found! Attempting reuse path (fast)...');
      const adapterResult = await runAdapter(appId, limit);

      if (adapterResult.success) {
        console.log(
          `✅ Adapter returned ${adapterResult.data.length} reviews in ${adapterResult.elapsedMs}ms`,
        );
        return adapterResult;
      }

      console.warn(`⚠️  Adapter failed: ${adapterResult.error}`);
      console.log('🔄 Falling back to exploration...');
      adapterResult.fallbackUsed = true;
    } else {
      console.log('ℹ️  No existing adapter found — starting exploration...');
    }
  } else {
    console.log('\n🔍 Force-explore mode — skipping adapter lookup...');
  }

  // Step 2: Exploration path (browser or fetch)
  return await fetchAndExtract(appId, limit);
}
