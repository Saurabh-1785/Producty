# 🦍 ApeAI — Layer 1: Ingestion Deep Dive

> **Scope**: This document covers everything about Layer 1 — the raw feedback ingestion subsystem — including what it does, how it works, its internal architecture, every technology used (and why), what alternatives exist (and why they weren't chosen), where the code lives, and how it is rendered in the frontend.

---

## Table of Contents

1. [What Is Layer 1?](#1-what-is-layer-1)
2. [What Problem Does It Solve?](#2-what-problem-does-it-solve)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Ingestion Sources](#4-ingestion-sources)
   - [4.1 Manual Text / Paste](#41-manual-text--paste)
   - [4.2 CSV Upload](#42-csv-upload)
5. [The Normalization Engine (The Heart of Layer 1)](#5-the-normalization-engine-the-heart-of-layer-1)
6. [The Unified FeedbackItem Format](#6-the-unified-feedbackitem-format)
7. [Storage: Where Does Layer 1 Data Go?](#7-storage-where-does-layer-1-data-go)
8. [Technology Stack — Why These Exact Choices?](#8-technology-stack--why-these-exact-choices)
9. [Alternatives Considered — And Why We Didn't Use Them](#9-alternatives-considered--and-why-we-didnt-use-them)
10. [Layer 1 File Map (Where Is Every File?)](#10-layer-1-file-map-where-is-every-file)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [Data Flow: End-to-End Journey](#12-data-flow-end-to-end-journey)
13. [Frontend: Where and How Layer 1 Is Shown](#13-frontend-where-and-how-layer-1-is-shown)
14. [Security Considerations](#14-security-considerations)
15. [Adding a New Ingestion Source](#15-adding-a-new-ingestion-source)

---

## 1. What Is Layer 1?

**Layer 1 is the entry gate of ApeAI.** It is the system responsible for **collecting raw customer feedback from every possible source** and converting it into a single, uniform, database-ready format.

Think of Layer 1 as a funnel:

```
Manual Text Input ──────┐
                       ├──▶ [NORMALIZE] ──▶ Unified FeedbackItem ──▶ Supabase DB
CSV Batch Upload ───────┘
```

**Without Layer 1, there is no data for the AI pipeline (Layer 3) to process.**

Layer 1's job ends the moment a normalized record is written to Supabase. It does NOT:
- Create embeddings (that's Layer 2)
- Cluster feedback (that's Layer 2/3)
- Generate BRDs or user stories (that's Layer 3)
- Push tickets to Jira/GitHub (that's Layer 4)

---

## 2. What Problem Does It Solve?

Product teams receive feedback from dozens of different surfaces — Slack DMs, GitHub issues, customer emails, support tickets, CSV exports from Zendesk, etc. **Each source has a completely different data shape**:

| Source | Raw Data Shape |
|---|---|
| Slack | `{ "text": "...", "user": "U123", "channel": "C456", "ts": "16xxx" }` |
| GitHub | `{ "action": "opened", "issue": { "title": "...", "body": "...", "user": {...} } }` |
| Email | `{ "From": "...", "Subject": "...", "TextBody": "..." }` |
| Manual | `{ "content": "...", "author": "..." }` |
| CSV | A row of delimited text with arbitrary columns |

**The core problem**: if each upstream source feeds its own raw format into Layer 2/3, then every AI step, every database schema, and every downstream process would need to know about every source format. Adding a new source (e.g., Discord) would break the entire pipeline.

**Layer 1's solution**: Every source has a **dedicated normalizer function** that strips and converts source-specific fields into one canonical `FeedbackItem` object. The rest of the system only ever talks to `FeedbackItem` — it doesn't know or care where the data came from.

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LAYER 1 — INGESTION                           │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐                                 │
│  │  /feedback/  │   │  /feedback/  │                                 │
│  │   manual     │   │     csv      │                                 │
│  │  [POST]      │   │  [POST]      │                                 │
│  └──────┬───────┘   └──────┬───────┘                                 │
│         │                  │                                         │
│         ▼                  ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │               normalize.py (Normalization Engine)        │        │
│  │   normalize_manual() | normalize_csv_row()               │        │
│  └──────────────────────────┬───────────────────────────────┘        │
│                             │  FeedbackItem (unified format)         │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │              save_feedback.py (Storage Service)          │        │
│  │      save_feedback() | save_feedback_batch()             │        │
│  └──────────────────────────┬───────────────────────────────┘        │
│                             │                                        │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Supabase DB        │
                   │  (feedback table)   │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  LAYER 2: Embeddings│
                   │  + Clustering       │
                   └─────────────────────┘
```

**Every ingestion path follows the exact same 3-step pattern:**
1. **Validate** — Pydantic model or manual checks catch malformed input early.
2. **Normalize** — Source-specific `normalize_X()` function converts raw payload to `FeedbackItem`.
3. **Save** — `save_feedback()` writes the `FeedbackItem` to Supabase's `feedback` table.

---

## 4. Ingestion Sources

### 4.1 Manual Text / Paste

**File**: [`backend/app/routes/manual.py`](file:///home/Saurabh/apeai/backend/app/routes/manual.py) — `POST /feedback/manual`

The simplest ingestion path. A user types or pastes free text directly into the ApeAI dashboard textarea.

**Request Body:**
```json
{
  "content": "The dashboard takes 6 seconds to load.",
  "author": "saurabh"
}
```

**Validation Rules:**
- `content` is required, 1–10,000 characters (enforced by Pydantic `ManualFeedbackInput`).
- `author` defaults to `"anonymous"` if not provided.

**What happens inside:**
1. FastAPI parses and validates the body via `ManualFeedbackInput` Pydantic model.
2. `normalize_manual(data)` wraps it in a `FeedbackItem` with `source="manual"` and metadata `submission_type: "text_paste"`.
3. `save_feedback(item)` inserts it to Supabase.

---

### 4.2 CSV Upload

**File**: [`backend/app/routes/manual.py`](file:///home/Saurabh/apeai/backend/app/routes/manual.py) — `POST /feedback/csv`

Allows bulk ingestion — ideal when a PM wants to import 50 customer survey responses at once.

**Expected CSV Format:**
```csv
content,author
"Dashboard is painfully slow","alice"
"Search returns irrelevant results","bob"
"Can we have dark mode please?",""
```

**What happens inside:**
1. FastAPI receives the `UploadFile`.
2. The file is decoded (UTF-8 first, Latin-1 as fallback).
3. `csv.DictReader` parses each row.
4. Each row is passed to `normalize_csv_row(row, row_number)`, which validates the `content` field and dumps any extra columns into `metadata`.
5. All valid rows are batch-inserted via `save_feedback_batch()` in a single Supabase call.
6. Rows with errors are tracked and returned in the response — they don't block the rest.

**Why batch insert matters**: A CSV with 200 rows would cause 200 DB round trips if done naively. `save_feedback_batch()` does it in 1 call.

---



---

## 5. The Normalization Engine (The Heart of Layer 1)

**File**: [`backend/app/services/normalize.py`](file:///home/Saurabh/apeai/backend/app/services/normalize.py)

The normalization engine is the most important piece of Layer 1. It contains **one function per source**:

| Function | Input Type | Source Tag |
|---|---|---|
| `normalize_manual(data)` | `ManualFeedbackInput` Pydantic model | `"manual"` |
| `normalize_csv_row(row, row_number)` | `dict` from CSV row | `"csv"` |

**Design principle**: Each function is **pure and single-purpose**. It takes raw source data in, returns a `FeedbackItem` out. It has no side effects, no database calls, no imports of other modules. This makes them trivially testable and replaceable.

**Adding a new source** (e.g., Zendesk) means:
1. Write one new `normalize_zendesk(payload)` function in this file.
2. Create a new route in `routes/zendesk.py`.
3. Mount the router in `main.py`.

**Nothing else in the codebase changes.**

---

## 6. The Unified FeedbackItem Format

**File**: [`backend/app/models/feedback.py`](file:///home/Saurabh/apeai/backend/app/models/feedback.py) — `FeedbackItem` class

Every normalizer in the system outputs exactly this:

```python
class FeedbackItem(BaseModel):
    source: str       # "manual" | "csv"
    author: str       # Who submitted it (defaults to "anonymous")
    content: str      # The actual feedback text (min 1 char)
    timestamp: datetime  # UTC datetime (when received)
    metadata: Dict[str, Any]  # Source-specific context (channel, repo, subject, etc.)
```

**Why is `metadata` a flexible dict instead of typed fields?**

Because every source has *completely different* extra context:
- Slack: `channel`, `thread_ts`, `is_thread_reply`
- GitHub: `repo`, `issue_number`, `issue_url`, `labels`
- Email: `sender_email`, `subject`, `mailbox_hash`
- CSV: `row_number`, arbitrary extra columns

If we tried to model this in typed fields, we'd end up with 20 optional fields on `FeedbackItem`, most of which would be `None` for every record. A `JSONB` column in Postgres stores this perfectly.

**The `to_db_dict()` method** converts the `FeedbackItem` into the exact format Supabase's insert API expects:
```python
def to_db_dict(self) -> Dict[str, Any]:
    return {
        "source": self.source,
        "author": self.author,
        "content": self.content,
        "timestamp": self.timestamp.isoformat(),
        "metadata": self.metadata,
    }
```

---

## 7. Storage: Where Does Layer 1 Data Go?

**File**: [`backend/app/services/save_feedback.py`](file:///home/Saurabh/apeai/backend/app/services/save_feedback.py)

After normalization, data is written to the `feedback` table in **Supabase (PostgreSQL)**:

### `feedback` Table Schema

```sql
CREATE TABLE feedback (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source    TEXT NOT NULL,                -- "manual" | "csv"
    author    TEXT NOT NULL DEFAULT 'anonymous',
    content   TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata  JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX idx_feedback_source ON feedback(source);
CREATE INDEX idx_feedback_timestamp ON feedback(timestamp);
```

**Why a UUID primary key?** UUIDs are globally unique and safe to expose in API responses without leaking sequential ID information (attacker can't infer total record count).

**Why is `timestamp` separate from `created_at`?**
- `created_at` = when ApeAI stored the record (always now).
- `timestamp` = when the original feedback was created/sent (e.g., a Slack message from yesterday).

**Where does it go after `feedback` table?**
```
feedback table
    │
    └──▶ Layer 2: Embedding Service reads feedback rows ──▶ embeddings table
    └──▶ Layer 2: Cluster Service groups similar feedback ──▶ clusters + cluster_feedback tables
    └──▶ Layer 3: AI Pipeline reads clusters ──▶ documents table (BRD, PRD, stories, tasks)
```

Layer 1 writes exactly one record per ingested feedback item. Everything downstream reads from that `feedback` table.

---

## 8. Technology Stack — Why These Exact Choices?

### FastAPI (Python) — Web Framework

**Why FastAPI?**
- **Automatic OpenAPI docs**: Every Layer 1 endpoint is self-documented at `/docs` with zero extra code. This makes it trivial to test webhook endpoints without writing a frontend.
- **Pydantic integration**: Request body validation is declarative. Just define `ManualFeedbackInput` with field constraints and FastAPI enforces them automatically — no `if not data.get("content"): raise...` boilerplate.
- **Async-native**: `async def` routes handle concurrent requests without blocking. This matters for webhook endpoints that may receive bursts of GitHub/Slack events.
- **Speed**: FastAPI is one of the fastest Python frameworks (on par with Node.js), built on Starlette + uvicorn.

**Compared to Flask**: Flask is synchronous, has no built-in validation, and requires separate packages for API documentation.

**Compared to Django**: Django brings ORM, auth, templates — all unnecessary overhead for a purely API-driven microservice.

---



---

### HMAC-SHA256 (GitHub Webhook Security)

**Why HMAC-SHA256?**
- GitHub signs every payload with a secret. Verifying the signature proves the request actually came from GitHub — not a spoofed request.
- `hmac.compare_digest()` prevents timing attacks that could leak the secret through response time differences.
- This is the **industry standard** for webhook authentication used by GitHub, Stripe, Shopify, etc.

---

### Supabase (PostgreSQL) — Storage

**Why Supabase for Layer 1 output?**
- Single platform for PostgreSQL + REST API + pgvector (needed by Layer 2) + authentication.
- The `supabase-py` client handles connection pooling, auth headers, and retry logic.
- The `feedback` table schema uses JSONB for `metadata`, which PostgreSQL handles natively with indexing and querying support.

---

### Pydantic v2 — Data Validation

**Why Pydantic?**
- Request body models (`ManualFeedbackInput`, `FeedbackItem`, `FeedbackResponse`) define validation rules declaratively.
- Field constraints like `min_length=1`, `max_length=10000` are enforced automatically.
- Serialization to/from dict/JSON is built-in — `item.to_db_dict()` is clean and explicit.
- FastAPI uses Pydantic models for automatic input validation and OpenAPI schema generation.

---

### pydantic-settings — Configuration

**Why pydantic-settings?**
- Loads `.env` file automatically.
- Validates that required env vars are present.
- Provides typed access: `settings.supabase_url` instead of `os.getenv("SUPABASE_URL")`.
- Properties like `settings.slack_configured` encapsulate readiness checks cleanly.

---

## 9. Alternatives Considered — And Why We Didn't Use Them

### Alternative: Celery / Task Queue for Ingestion

**What it is**: An async task queue (Celery + Redis/RabbitMQ) where each incoming webhook fires a background task for normalization and storage.

**Why not used**:
- Layer 1's operations (normalize + DB insert) are **very fast** — typically <50ms. There's no need to offload them to a background queue.
- Celery adds significant operational complexity: you need Redis or RabbitMQ running, Celery workers, monitoring dashboards, retry policies, dead-letter queues.
- The design philosophy of ApeAI is **minimal external dependencies per layer**. Celery would be overkill here.
- If throughput ever becomes a concern (millions of events/hour), Celery would be the right upgrade path — but that's premature optimization at the current stage.

---

### Alternative: Kafka / Event Streaming

**What it is**: Kafka is a distributed event streaming platform used by companies like LinkedIn and Uber for high-throughput event ingestion.

**Why not used**:
- Kafka requires running a Kafka broker (and typically ZooKeeper or KRaft). This is production-scale infrastructure.
- ApeAI's ingestion volume is human-scale (dozens to hundreds of feedback items per day, not millions per second).
- Kafka's strength is durability and replay — useful if multiple downstream consumers need the same events. ApeAI has one consumer (Supabase).
- The decoupled architecture can be upgraded to Kafka later by replacing `save_feedback()` with a Kafka producer — nothing else needs to change.

---

### Alternative: Flask instead of FastAPI

**Why not used**:
- Flask requires separate packages for async support (gevent, gunicorn), API docs (Flask-RESTX or Flasgger), and validation (marshmallow or WTForms).
- FastAPI gives all of this out of the box.
- Flask's synchronous-by-default model would require extra work to handle concurrent Slack events efficiently.

---

### Alternative: Zapier / Make (No-Code Automation)

**What it is**: Visual automation tools that can connect Slack, GitHub, Email → database without writing code.

**Why not used**:
- No-code tools are black boxes — you can't add custom normalization logic, HMAC verification, or complex CSV parsing.
- They charge per task/operation at scale.
- The entire value of ApeAI is the **normalization + AI pipeline**. Without code control over normalization, the downstream AI quality degrades.

---

### Alternative: Mailgun instead of Postmark (Email)

**Why not used**:
- Mailgun requires adding DNS TXT records to your domain to verify ownership before receiving inbound emails.
- Postmark's inbound sandbox works with zero DNS setup, which is much faster for development.
- Both are viable in production — switching would only require changing environment variables and potentially payload field names in `normalize_email()`.

---

### Alternative: GitHub App (instead of GitHub Webhook)

**What it is**: A GitHub App can subscribe to events across multiple repositories and organizations, authenticated via JWT.

**Why not used**:
- GitHub Apps require creating an app registration, handling JWT auth, and managing private keys. Significantly more complex setup.
- A simple webhook secret (HMAC) is sufficient for ApeAI's use case — monitoring one or a few repos.
- GitHub Apps would be the right choice if ApeAI needed org-wide access or marketplace distribution.

---

### Alternative: HTTP Polling instead of Socket Mode (Slack)

**What it is**: Periodically calling the Slack API to fetch recent messages in a channel.

**Why not used**:
- Polling introduces latency (feedback arrives minutes later instead of immediately).
- Polling requires storing the last-seen timestamp and handling pagination.
- Slack's rate limits would restrict how frequently you can poll.
- Socket Mode (push model) is real-time, stateless, and doesn't consume rate limits.

---

### Alternative: OpenAI API instead of Google Gemini (Note: Layer 3, but context for original `about.md`)

The `about.md` file originally referenced OpenAI's `text-embedding-3-small` and `GPT-4o`. The actual implementation uses **Google Gemini**:
- `models/gemini-embedding-2` (768-dimensional vectors) for embeddings in Layer 2.
- `gemini-2.5-flash-lite` for document generation in Layer 3.

**Why Gemini over OpenAI?**
- Google Gemini has a **free tier via Google AI Studio** — no credit card required to start.
- `gemini-2.5-flash-lite` is faster and cheaper per token than GPT-4o for structured JSON generation.
- Both are equally capable for this use case — the architecture is designed so swapping back to OpenAI means only changing the embedding/generation service files.

---

## 10. Layer 1 File Map (Where Is Every File?)

```
/home/Saurabh/apeai/
│
├── backend/
│   └── app/
│       │
│       ├── main.py                    ← App entry point; mounts all Layer 1 routers
│       │
│       ├── core/
│       │   └── config.py              ← Loads SLACK_BOT_TOKEN, GITHUB_WEBHOOK_SECRET, etc.
│       │
│       ├── models/
│       │   └── feedback.py            ← ManualFeedbackInput, FeedbackItem, FeedbackResponse, etc.
│       │
│       ├── routes/                    ← HTTP endpoints (one file per source)
│       │   └── manual.py              ← POST /feedback/manual, POST /feedback/csv
│       │
│       ├── services/                  ← Business logic
│       │   └── normalize.py           ← All 2 normalize_X() functions
│       │   └── save_feedback.py       ← save_feedback() + save_feedback_batch()
│       │
│       └── db/
│           ├── schema.sql             ← feedback table definition (Layer 1's output schema)
│           └── supabase_client.py     ← Supabase connection singleton
│
├── tests/
│   └── test_endpoints.sh              ← Shell script to test all Layer 1 HTTP endpoints
│
└── .env                               ← SUPABASE_URL, SUPABASE_KEY, SLACK_BOT_TOKEN, etc.
```

### File Responsibilities Summary

| File | Responsibility |
|---|---|
| [`main.py`](file:///home/Saurabh/apeai/backend/app/main.py) | Mount routers, start Slack listener, lifecycle management |
| [`config.py`](file:///home/Saurabh/apeai/backend/app/core/config.py) | Typed config from `.env` — Supabase, Slack, GitHub, Google credentials |
| [`models/feedback.py`](file:///home/Saurabh/apeai/backend/app/models/feedback.py) | Pydantic schemas for inputs, `FeedbackItem`, and response formats |
| [`routes/manual.py`](file:///home/Saurabh/apeai/backend/app/routes/manual.py) | `POST /feedback/manual` and `POST /feedback/csv` |
| [`services/normalize.py`](file:///home/Saurabh/apeai/backend/app/services/normalize.py) | All normalize functions — the core of Layer 1 |
| [`services/save_feedback.py`](file:///home/Saurabh/apeai/backend/app/services/save_feedback.py) | Supabase insert for single and batch feedback |
| [`db/schema.sql`](file:///home/Saurabh/apeai/backend/app/db/schema.sql) | `feedback` table DDL (Layer 1's persistent output) |
| [test_endpoints.sh](file:///home/Saurabh/apeai/tests/test_endpoints.sh) | `curl`-based test script for all Layer 1 endpoints |

---

## 11. API Endpoints Reference

All Layer 1 endpoints run on `http://localhost:8000` (dev).

| Method | Endpoint | Source | Description |
|---|---|---|---|
| `POST` | `/feedback/manual` | Manual | Submit a single text feedback |
| `POST` | `/feedback/csv` | CSV | Upload a CSV file with multiple feedback items |
| `GET` | `/feedback/stats` | System | Count of feedback records by source |
| `GET` | `/health` | System | Health check including Supabase connectivity |



Full interactive documentation is auto-generated at: `http://localhost:8000/docs`

---

## 12. Data Flow: End-to-End Journey

Here is the complete journey of a single piece of feedback from manual paste to the AI pipeline:

```
1. PM types in Feedback Ingestion Console:
   "The mobile app crashes when uploading a profile picture over 5MB"

2. PM clicks "Submit Signal" which issues POST /feedback/manual

3. manual.py: upload_manual_feedback() fires
   - Validates input length via ManualFeedbackInput
   - Calls normalize_manual(data)

4. normalize.py: normalize_manual()
   Returns FeedbackItem {
     source: "manual",
     author: "anonymous",
     content: "The mobile app crashes when uploading a profile picture over 5MB",
     timestamp: 2026-05-25T08:00:00Z,
     metadata: {
       submission_type: "text_paste"
     }
   }

5. save_feedback.py: save_feedback()
   - Calls supabase_client.table("feedback").insert({...}).execute()

6. Supabase writes to feedback table:
   id:        "a1b2c3d4-..."   ← UUID auto-generated
   source:    "manual"
   author:    "anonymous"
   content:   "The mobile app crashes..."
   timestamp: 2026-05-25 08:00:00+00
   metadata:  {"submission_type": "text_paste"}
   created_at: 2026-05-25 08:15:30+00

7. Layer 1 work is DONE. ✅

8. (Layer 2) Embedding service reads this row → generates 768-dim vector
9. (Layer 2) Cluster service groups this with similar feedback
10. (Layer 3) AI pipeline generates BRD / PRD / User Stories
11. (Layer 4) After human approval → published to Jira/GitHub
```

---

## 13. Frontend: Where and How Layer 1 Is Shown

Layer 1 is surfaced in the frontend in **three distinct places**:

---

### 13.1 Landing Page — Interactive Demo Sandbox (Step 1)

**File**: [`frontend/app/page.tsx`](file:///home/Saurabh/apeai/frontend/app/page.tsx) — lines 226–261

The very first screen a visitor sees on the homepage (at `http://localhost:3000`) is a 4-step animated demo. **Step 1 (index 0) is entirely Layer 1**.

It shows:
- **Left panel**: A simulated Slack message in `#customer-feedback` channel with a typewriter animation effect — the full message types character-by-character in real time.
- **Right panel**: A dark terminal-style panel showing the normalized JSON output in real time — `"source": "slack"`, `"raw": "..."`, `"meta": { "normalized": true, "timestamp": "..." }`.

This is the most **visual, consumer-facing** representation of Layer 1 — the "wow" moment that shows how raw Slack messages become structured data instantly.

---

### 13.2 Landing Page — Engine Stack Section (Layer 1: Pluggable Ingestion Row)

**File**: [`frontend/app/page.tsx`](file:///home/Saurabh/apeai/frontend/app/page.tsx) — lines 450–547

The "Engine Stack" zigzag section has a dedicated **Row 1 for Layer 1** with:
- **Text description**: "ApeAI integrates directly into customer surfaces. Connect Slack Webhooks, Zendesk portals, or GitHub Issue streams. Incoming payload signals are instantly formatted and normalized inside our robust FastAPI middleware."
- **Visual diagram** (rendered in pure JSX/SVG):
  - Left column: Three animated source cards — Slack (`#customer-feedback`), Zendesk Portal (`Ticket #108`), GitHub Issues (`Repo Issue Stream`) — each sliding with `group-hover:translate-x-1` micro-animations.
  - SVG connection lines: Animated dashed lines (`stroke-dasharray="4,4"` with CSS `routeDash` animation) flow from each source toward the center router.
  - Right card: Dark terminal panel labeled `INGESTION_ROUTER / Router API v1.0` showing the normalized JSON output `{ "source": "slack", "status": "valid", "data_id": "9218" }`.

---

### 13.3 Dashboard — Feedback Inbox (`/dashboard`)

**File**: [`frontend/app/dashboard/page.tsx`](file:///home/Saurabh/apeai/dashboard/page.tsx)

The `/dashboard` route is the **primary operator interface** for Layer 1. This is where real feedback is ingested and monitored.

**What it shows:**
1. **Metrics row** (top): Four stat cards pulled from `GET /feedback/stats` forming a symmetrical grid:
   - **Total Raw Signals** — total count of all rows in `feedback` table
   - **Active Clusters** — from Layer 2 (shows downstream progression)
   - **Manual Signals** — `stats.by_source.manual` count
   - **CSV Signals** — `stats.by_source.csv` count

2. **Ingest Raw Signal form** (left sidebar):
   - **Text Paste tab**: A textarea where a PM types or pastes feedback text. Calls `api.ingestManualFeedback(content)`.
   - **CSV Upload tab**: A drag-and-drop dropzone or select file component for bulk uploading `.csv` files. Calls `api.ingestCSVFeedback(file)`.
   - On success: toast notification + stats refresh.

3. **Active Feedback Clusters** (right, 2/3 width):
   - Shows clusters from Layer 2 (downstream of Layer 1).
   - Each card shows the cluster title, summary, feedback count, status badge, and links to the Pipeline Map and Review Gate.
   - This demonstrates what Layer 1 data becomes after AI processing.

**API calls made by the dashboard:**
```typescript
// Layer 1 — manual ingestion
api.ingestManualFeedback(content)  →  POST /feedback/manual
api.getFeedbackStats()             →  GET  /feedback/stats

// Layer 2 — shows what happens after Layer 1
api.getClusters()                  →  GET  /clusters/
api.triggerClustering()            →  POST /pipeline/cluster
```

**Frontend API service**: All Layer 1 API calls are defined in [`frontend/services/api.ts`](file:///home/Saurabh/apeai/frontend/services/api.ts) under the `INGESTION (Layer 1)` section.

---

### Summary: Layer 1 in the Frontend

| Frontend Location | Route | What Layer 1 Functionality Is Shown |
|---|---|---|
| Landing page hero demo | `/` | Animated demo of Slack → Normalized JSON (Step 1) |
| Landing page engine stack | `/#interactive-sandbox` | Visual diagram of all ingestion sources + router |
| Dashboard feedback inbox | `/dashboard` | Live manual ingestion form + real stats |

---

## 14. Security Considerations

| Risk | Layer 1 Defense |
|---|---|
| Empty/garbage feedback | Pydantic `min_length=1` constraint on `content` field |
| Oversized payloads | Pydantic `max_length=10000` constraint on manual input |
| CSV injection | Content is stored as text, never evaluated as code |
| Wrong CSV file type | File extension and MIME type validation on CSV upload |
| Cross-origin API access | CORS middleware configured in `main.py` (restrict `allow_origins` in production) |
| Database injection | All DB operations go through Supabase's typed client — no raw SQL in Layer 1 |

---

## 15. Adding a New Ingestion Source

To add a completely new source (e.g., **Zendesk**, **Discord**, **Intercom**):

**Step 1** — Add a normalizer function in [`services/normalize.py`](file:///home/Saurabh/apeai/backend/app/services/normalize.py):
```python
def normalize_zendesk(payload: Dict[str, Any]) -> FeedbackItem:
    content = payload.get("description", "").strip()
    if not content:
        raise ValueError("Zendesk ticket has no description")
    return FeedbackItem(
        source="zendesk",
        author=payload.get("requester", {}).get("email", "unknown"),
        content=content,
        timestamp=datetime.now(timezone.utc),
        metadata={
            "ticket_id": payload.get("id"),
            "subject": payload.get("subject"),
            "status": payload.get("status"),
        },
    )
```

**Step 2** — Create a new route file `routes/zendesk.py`:
```python
router = APIRouter(prefix="/feedback", tags=["Zendesk Ingestion"])

@router.post("/zendesk", response_model=FeedbackResponse)
async def zendesk_webhook(request: Request):
    payload = await request.json()
    item = normalize_zendesk(payload)
    saved = await save_feedback(item)
    return FeedbackResponse(...)
```

**Step 3** — Mount it in [`main.py`](file:///home/Saurabh/apeai/backend/app/main.py):
```python
from backend.app.routes import zendesk
app.include_router(zendesk.router)
```

**Step 4** — Add the API call in [`frontend/services/api.ts`](file:///home/Saurabh/apeai/frontend/services/api.ts) under `INGESTION (Layer 1)`.

**That's it.** Zero changes to Layer 2, 3, 4, or the database schema. This is the power of the normalization pattern.

---

## Quick Reference Card

| Item | Value |
|---|---|
| Layer purpose | Collect and normalize raw feedback from all sources |
| Primary language | Python 3.10+ |
| Web framework | FastAPI + uvicorn |
| Ingestion channels | Manual text, CSV batch |
| Normalization output | `FeedbackItem` — unified Python/Pydantic model |
| Storage destination | Supabase `feedback` table (PostgreSQL) |
| Security (CORS) | Configured in `main.py`, set to production domain |
| Backend entry point | `uvicorn backend.app.main:app --reload --port 8000` |
| Test script | `./tests/test_endpoints.sh` |
| Interactive API docs | `http://localhost:8000/docs` |
| Frontend ingestion UI | `http://localhost:3000/dashboard` |
| After Layer 1 | Data goes to Layer 2 (embeddings + clustering) |
