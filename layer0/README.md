# 📦 Producty Layer 0 — Autonomous Google Play Review Ingestion

> **webcmd-powered agent** that explores the Google Play Store, extracts app reviews,
> and feeds them into Producty's existing ingestion pipeline — with zero backend changes.

---

## What This Does

Layer 0 is a **standalone, decoupled script** that:

1. Uses [webcmd](https://webcmd.dev) to visit a Google Play Store app listing
2. Extracts public user reviews (name, rating, text, date, helpful count)
3. Normalizes each review into Producty's existing `AppStoreReviewInput` schema
4. POSTs them to `POST /api/ingestion/appstore` — the exact same endpoint that already handles app store reviews
5. On a second run, **reuses the webcmd adapter** instead of re-exploring — demonstrating the "explore once, learn, reuse forever" lifecycle

**No backend, frontend, or database changes are needed.** Layer 1's normalizer automatically sets `source: 'google_play'` for reviews with `platform: 'android'`.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 0 (this script)                                   │
│  webcmd → extract reviews → normalize → POST             │
└────────────────────────┬─────────────────────────────────┘
                         │ POST /api/ingestion/appstore
                         │ (existing endpoint, unmodified)
                         ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 1 — Ingestion (existing, zero changes)            │
│  normalizeAppStoreReview() → source: 'google_play'       │
└────────────────────────┬─────────────────────────────────┘
                         ▼
            Layer 2 → 3 → 4 (existing, unmodified)
```

---

## Prerequisites

- **Node.js 18+** (for built-in `fetch`)
- **webcmd** installed globally:
  ```bash
  npm install -g @agentrhq/webcmd
  webcmd skills add
  ```
- **Producty backend** running at `http://localhost:8000`
- **Supabase JWT** (get from the frontend after login)

---

## Installation

```bash
cd layer0
npm install
```

---

## Usage

### Basic Command

```bash
npx tsx layer0/pull_play_reviews.ts \
  --app-id com.whatsapp \
  --limit 10 \
  --token "YOUR_SUPABASE_JWT"
```

### All Options

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--app-id <id>` | ✅ | — | Android package name (e.g., `com.whatsapp`) |
| `--limit <n>` | | `10` | Max reviews to pull (1–100) |
| `--token <jwt>` | | `$PRODUCTY_AUTH_TOKEN` | Supabase JWT for API auth (optional) |
| `--api-url <url>` | | `http://localhost:8000` | Producty backend URL |
| `--force-explore` | | `false` | Skip adapter reuse, force fresh browser exploration |
| `--help` | | | Show help |

### Environment Variables

```bash
export PRODUCTY_AUTH_TOKEN="eyJ..."         # Alternative to --token
export PRODUCTY_API_URL="http://localhost:8000"  # Alternative to --api-url
```

---

## Demo Workflow (webcmd Lifecycle)

### Step A — First Run: Explore

```bash
npx tsx layer0/pull_play_reviews.ts \
  --app-id com.whatsapp --limit 10 --token "$TOKEN" --force-explore
```

The script uses webcmd's browser to explore the Play Store page, discover the review section, and extract structured review data. **Narrate this**: "The agent is exploring an unfamiliar page — identifying the review list, figuring out how reviews are structured."

### Step B — Adapter Saved

After a successful exploration, webcmd's lifecycle retains the navigation knowledge as a reusable adapter. Check with:

```bash
webcmd list -f json | grep google-play
```

**Narrate**: "This exploration just became a reusable command."

### Step C — Second Run: Reuse

```bash
npx tsx layer0/pull_play_reviews.ts \
  --app-id com.whatsapp --limit 10 --token "$TOKEN"
```

This time the script detects the existing adapter and skips browser exploration — **visibly faster**. The summary output shows `Adapter reused: ✅ YES` with timing comparison.

### Step D — Recovery Demo

```bash
npx tsx layer0/pull_play_reviews.ts \
  --app-id com.some.obscure.app --limit 5 --token "$TOKEN"
```

If the adapter fails (different layout, missing fields, etc.), the script:
1. Logs the adapter failure
2. Falls back to a fresh explore pass automatically
3. Continues with whatever reviews it can extract
4. Reports `Fallback used: ⚠️ YES` in the summary

**Narrate**: "The adapter didn't work for this different app — the agent detected the mismatch and re-explored automatically."

---

## JSON Schema Produced

Each review is normalized to this exact shape before POSTing:

```json
{
  "review_id": "gplay-webcmd-a1b2c3d4e5f6",
  "content": "Great app but needs dark mode support",
  "author": "ReviewerName123",
  "rating": 4,
  "platform": "android",
  "title": "Mostly good",
  "review_date": "2026-08-15",
  "app_version": "2.4.1",
  "country": "US"
}
```

This matches `AppStoreReviewInput` from [`backend/src/types/feedback.ts`](/backend/src/types/feedback.ts). The backend normalizer then:
- Sets `source: 'google_play'`
- Stores `rating`, `app_version`, `country`, `review_id` in metadata
- Sets `external_id` to `review_id` for deduplication

---

## Output Example

```
═══════════════════════════════════════════════════════════════
  📦 Producty Layer 0 — Autonomous Play Store Review Ingestion
═══════════════════════════════════════════════════════════════
  App ID:        com.whatsapp
  Review limit:  10
  API URL:       http://localhost:8000
  Mode:          🔄 Auto (reuse adapter if available)
  Timestamp:     2026-08-22T12:00:00.000Z
────────────────────────────────────────────────────────────────

🏥 Checking backend health...
✅ Backend is healthy

📋 Checking for existing google-play adapter...
✅ Adapter found! Attempting reuse path (fast)...
✅ Adapter returned 10 reviews in 1,234ms

📦 webcmd returned 10 raw review(s)

🔧 Normalizing reviews to AppStoreReviewInput schema...
   ✅ 9 review(s) normalized
   ⚠️  1 review(s) skipped

📤 POSTing 9 reviews to http://localhost:8000/api/ingestion/appstore
✅ Backend response: Successfully ingested 9 app store review(s)

═══════════════════════════════════════════════════════════════
  📊 Layer 0 Run Summary
═══════════════════════════════════════════════════════════════
  App:                com.whatsapp
  Reviews found:      10
  Reviews normalized: 9
  Reviews skipped:    1 (Missing or empty "content" field)
  Reviews ingested:   9
  Ingestion errors:   0
────────────────────────────────────────────────────────────────
  Adapter reused:     ✅ YES (fast path)
  Extraction time:    1,234ms
  Total time:         2,456ms
═══════════════════════════════════════════════════════════════

  ✅ SUCCESS — 9 review(s) are now in Producty's pipeline.
     They will appear in the dashboard and are ready for Layer 2 clustering.
```

---

## Recovery Behavior

The script handles failures gracefully at every level:

| Failure | Behavior |
|---------|----------|
| webcmd adapter not found | Falls back to browser exploration |
| Adapter returns no data | Falls back to fresh explore |
| Adapter returns wrong shape | Normalizer skips bad items, continues batch |
| Review missing `content` or `author` | Skipped with warning, batch continues |
| Review missing optional field (date, rating) | Field omitted or defaults used |
| Backend returns 401 | Clear error message with JWT refresh instructions |
| Backend returns 422 | Reports which reviews failed validation |
| Backend unreachable | Clear error with startup instructions |

---

## Compliance Checklist

- [x] Read-only access to public Play Store review data only
- [x] No login, no purchases, no review interactions
- [x] Rate-limited (1 req/sec between webcmd interactions)
- [x] Manually triggered only (no background/cron)
- [x] No sensitive actions automated
- [x] Graceful degradation for missing/malformed data
