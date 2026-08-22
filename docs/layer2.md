# 🦍 ApeAI — Layer 2: Storage & Vector Database Deep Dive

> **Scope**: This document covers everything about Layer 2 — the storage, vector embedding, clustering, document management, approval, and integration configuration subsystem. It explains what it does, how it works, its internal architecture, every technology used (and why), what alternatives exist (and why they weren't chosen), where the code lives, and how it is rendered in the frontend.

---

## Table of Contents

1. [What Is Layer 2?](#1-what-is-layer-2)
2. [What Problem Does It Solve?](#2-what-problem-does-it-solve)
3. [High-Level Architecture](#3-high-level-architecture)
4. [The 8 Database Tables (Complete Schema Reference)](#4-the-8-database-tables-complete-schema-reference)
5. [Subsystem 1 — Embeddings (Vector Generation)](#5-subsystem-1--embeddings-vector-generation)
6. [Subsystem 2 — Similarity Clustering](#6-subsystem-2--similarity-clustering)
7. [Subsystem 3 — Documents (AI-Generated Artifacts)](#7-subsystem-3--documents-ai-generated-artifacts)
8. [Subsystem 4 — Approvals (Human Review Gate Storage)](#8-subsystem-4--approvals-human-review-gate-storage)
9. [Subsystem 5 — Integration Config Storage](#9-subsystem-5--integration-config-storage)
10. [Subsystem 6 — Ticket Links (Duplicate Prevention)](#10-subsystem-6--ticket-links-duplicate-prevention)
11. [Subsystem 7 — Pipeline Status Overview](#11-subsystem-7--pipeline-status-overview)
12. [Technology Stack — Why These Exact Choices?](#12-technology-stack--why-these-exact-choices)
13. [Alternatives Considered — And Why We Didn't Use Them](#13-alternatives-considered--and-why-we-didnt-use-them)
14. [Layer 2 File Map (Where Is Every File?)](#14-layer-2-file-map-where-is-every-file)
15. [API Endpoints Reference](#15-api-endpoints-reference)
16. [Data Flow: How Layer 1 Data Becomes Layer 3 Input](#16-data-flow-how-layer-1-data-becomes-layer-3-input)
17. [Frontend: Where and How Layer 2 Is Shown](#17-frontend-where-and-how-layer-2-is-shown)
18. [Cluster Status State Machine](#18-cluster-status-state-machine)
19. [Document Lifecycle State Machine](#19-document-lifecycle-state-machine)
20. [Security Considerations](#20-security-considerations)

---

## 1. What Is Layer 2?

**Layer 2 is the persistent memory and intelligence backbone of ApeAI.** It receives raw normalized feedback records from Layer 1 and transforms them into something the AI pipeline (Layer 3) can reason about — grouped, semantically-aware clusters with vector-indexed embeddings.

Layer 2 has **two distinct roles**:

1. **Storage layer** — All data in ApeAI lives here. Every table, every row, every vector, every document, every approval decision. Nothing persists anywhere else.

2. **Intelligence substrate** — By storing 768-dimensional vector embeddings and running cosine similarity queries with `pgvector`, Layer 2 enables ApeAI to automatically discover that "the app crashes when uploading images" and "file uploads fail after the 5MB limit" are describing the same underlying issue — without any keyword matching.

Layer 2 does NOT:
- Generate the actual BRD, PRD, or user stories (that's Layer 3's job)
- Push tickets to Jira/GitHub/Linear (that's Layer 4)
- Collect feedback from users (that's Layer 1)

---

## 2. What Problem Does It Solve?

### Problem 1: Raw feedback is unsorted noise
After Layer 1, the `feedback` table has 200 raw text records — each a complaint, request, or bug report from a different person on a different channel. They are unrelated as stored. Before AI can synthesize anything meaningful, **related feedback must be grouped together**.

Layer 2 solves this with **semantic vector clustering**: it converts every feedback string into a 768-dimensional embedding vector (a point in mathematical space where semantically similar text lands close together), then finds all feedback that lands within a cosine distance threshold of each other and groups them into clusters.

### Problem 2: AI outputs need versioning, lifecycle management, and human gates
AI-generated BRDs and user stories can't just be written and immediately published to Jira. They need:
- **Versioning**: When a PM edits a BRD, the old version must be preserved.
- **Status tracking**: Is this document `draft`? `review`? `approved`? `rejected`? `published`?
- **Human approval**: No document can be published until explicitly approved by a human.
- **Diff logging**: When a human edits AI output, the original and edited versions must both be stored for prompt improvement feedback loops.

Layer 2 provides the `documents` and `approvals` tables to handle all of this.

### Problem 3: Duplicate ticket protection
If the "Export to CSV" feature request gets published to Jira as APE-82, ApeAI must never create APE-83 for the same cluster again. Layer 2's `ticket_links` table maps documents → external ticket IDs and blocks duplicate publishing.

---

## 3. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          LAYER 2 — STORAGE & VECTOR DB                    │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    SUPABASE (PostgreSQL + pgvector)                  │ │
│  │                                                                      │ │
│  │  feedback ──── embeddings ──── cluster_feedback ──── clusters        │ │
│  │     (Layer 1 output)    (768-dim vectors)   (many-to-many)           │ │
│  │                                                      │               │ │
│  │                                                      ▼               │ │
│  │                                                  documents           │ │
│  │                                         (BRD, PRD, stories, tasks)  │ │
│  │                                                      │               │ │
│  │                                            ┌─────────┴─────────┐    │ │
│  │                                        approvals          ticket_links│ │
│  │                                      (review gate)    (duplicate block)│ │
│  │                                                                      │ │
│  │                                           integrations              │ │
│  │                                      (Jira/GitHub/Linear credentials)│ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────┐ │
│  │  embedding_service  │   │  cluster_service     │   │ document_service│ │
│  │  (Google Gemini AI) │   │  (pgvector SQL)      │   │ (CRUD + approval│ │
│  │  768-dim vectors    │   │  match_feedback()    │   │  lifecycle)     │ │
│  └─────────────────────┘   └─────────────────────┘   └─────────────────┘ │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
         │                           │                        │
         ▼                           ▼                        ▼
   /embeddings/*              /clusters/*             /documents/*
   /embeddings/search         /pipeline/status        /approvals/*
                                                      /integrations/*
                                                      /ticket-links/*
```

---

## 4. The 8 Database Tables (Complete Schema Reference)

**File**: [`backend/app/db/schema.sql`](file:///home/Saurabh/apeai/backend/app/db/schema.sql)

Layer 2 manages **8 PostgreSQL tables**. Here's what each does:

### Table 1: `feedback` ← from Layer 1
```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,          -- "manual" | "slack" | "github" | "email" | "csv"
    author TEXT NOT NULL DEFAULT 'anonymous',
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Written by Layer 1. **Layer 2 reads from this table** to generate embeddings and build clusters. Indexed on `source` and `timestamp`.

---

### Table 2: `embeddings`
```sql
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL,          -- The 768-dim vector
    model TEXT NOT NULL DEFAULT 'text-embedding-004',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(feedback_id)                      -- One embedding per feedback item
);
```
**One row per feedback item**. Stores the 768-dimensional float vector from Google Gemini. The `VECTOR(768)` column type is provided by the `pgvector` extension. `ON DELETE CASCADE` means if a feedback item is deleted, its embedding is automatically deleted too.

**Why a separate table from `feedback`?** Vector queries (cosine similarity searches) are computationally heavy. Keeping them in a separate table means regular feedback queries (listing, filtering) are not slowed down by the vector column.

---

### Table 3: `clusters`
```sql
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,                    -- AI-generated theme title
    summary TEXT,                  -- AI-generated cluster summary
    feedback_count INT DEFAULT 0,  -- Number of items in this cluster
    confidence_score FLOAT DEFAULT 0.0,  -- AI confidence (0-100)
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN (
            'new', 'clustered', 'brd_generated', 'prd_generated',
            'stories_generated', 'tasks_generated', 'approved',
            'tickets_created', 'archived'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**A cluster = a group of semantically related feedback items**. The `status` field drives the entire pipeline progression. The 9-value `CHECK` constraint enforces valid pipeline states at the database level — invalid state transitions are rejected by PostgreSQL, not just by application code.

---

### Table 4: `cluster_feedback` (Junction Table)
```sql
CREATE TABLE cluster_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    similarity_score FLOAT,        -- Cosine similarity when added to cluster
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(cluster_id, feedback_id)  -- Each feedback appears once per cluster
);
```
**Many-to-many relationship** between clusters and feedback. Stores the actual similarity score that caused this feedback to be added to this cluster — useful for auditing clustering decisions and building confidence scores. `CASCADE` on both foreign keys ensures orphaned links are auto-cleaned.

---

### Table 5: `documents`
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    type TEXT NOT NULL
        CHECK (type IN ('brd', 'prd', 'epic', 'story', 'task', 'sprint_plan')),
    title TEXT,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,   -- Flexible AI output
    version INT NOT NULL DEFAULT 1,
    parent_id UUID REFERENCES documents(id) ON DELETE SET NULL,  -- Tree structure
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'review', 'approved', 'rejected', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**AI-generated deliverables**. The `JSONB` content field is the most important design decision here — AI output structure evolves as prompts are tuned, and JSONB accommodates arbitrary structure without schema migrations. The `parent_id` self-reference enables a tree: an `epic` has child `story` documents, which have child `task` documents. Version increments when a PM edits content, preserving the edit history implicitly. Indexed on `cluster_id`, `type`, `status`, and `parent_id`.

---

### Table 6: `approvals`
```sql
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    approved BOOLEAN,              -- true = approved, false = rejected
    reviewed_by TEXT,              -- PM name or ID
    review_notes TEXT,             -- Reviewer's notes
    original_content JSONB,        -- AI's original output (before edits)
    edited_content JSONB,          -- Reviewer's edited version
    reviewed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**The human-in-the-loop audit log**. Every review decision is stored here. Crucially, both `original_content` and `edited_content` are stored — when a PM edits the AI's BRD before approving, you have both versions side by side. This powers the **Prompt Feedback Loop** feature: over time, these pairs become few-shot examples to improve AI prompts.

---

### Table 7: `integrations`
```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('jira', 'github', 'linear', 'notion')),
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,         -- Encrypted in production
    api_url TEXT,                  -- Jira instance URL, etc.
    project_id TEXT,               -- Jira project key, GitHub repo, etc.
    config JSONB DEFAULT '{}'::jsonb,  -- Extra platform-specific settings
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Integration credential storage**. Stores API keys and configuration for external publishing targets. API keys are masked (`"***masked***"`) in all GET responses — they are write-only from the API perspective. The `is_active` toggle allows disabling an integration without deleting it.

---

### Table 8: `ticket_links`
```sql
CREATE TABLE ticket_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,     -- e.g., "APE-82" or "104"
    external_url TEXT,             -- e.g., "https://github.com/org/repo/issues/104"
    external_status TEXT,          -- Status of the ticket on the external platform
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Duplicate-prevention registry**. Before Layer 4 publishes a document, it checks this table. If an entry already exists for this `document_id` + `integration_id` combination, the publish is blocked with a `409 Conflict` error. The `external_url` lets the frontend show a direct link to the created ticket.

---

### Auto-update Triggers

Layer 2 also installs PostgreSQL triggers that automatically update the `updated_at` column on any row change in `clusters`, `documents`, and `integrations`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**Why triggers instead of application code?** If any service updates a row (even directly via Supabase dashboard), `updated_at` is always accurate. Application-level `updated_at` management can be missed or bypassed.

---

### The `match_feedback` Cosine Similarity Function

```sql
CREATE OR REPLACE FUNCTION match_feedback(
    query_embedding VECTOR(768),
    match_count INT DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE (feedback_id UUID, content TEXT, source TEXT, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.feedback_id,
        f.content,
        f.source,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    JOIN feedback f ON f.id = e.feedback_id
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

This is a **custom PostgreSQL function** that wraps pgvector's `<=>` cosine distance operator. `<=>` returns the *distance* (0=identical, 1=opposite). We convert to *similarity* with `1 - distance`. Results above `match_threshold` (default 0.8) are returned, ordered by closest match first. This function is called from Python via `db.rpc("match_feedback", {...})`.

---

## 5. Subsystem 1 — Embeddings (Vector Generation)

**Service**: [`backend/app/services/embedding_service.py`](file:///home/Saurabh/apeai/backend/app/services/embedding_service.py)
**Routes**: [`backend/app/routes/embeddings.py`](file:///home/Saurabh/apeai/backend/app/routes/embeddings.py)

### What It Does

Takes each raw `content` string from the `feedback` table and converts it into a **768-dimensional floating point vector** using Google Gemini's `models/gemini-embedding-2` model. This vector is then stored in the `embeddings` table via pgvector.

### How It Works (Step by Step)

**Step 1 — API Call to Gemini:**
```python
response = genai.embed_content(
    model="models/gemini-embedding-2",
    content=text,
    task_type="clustering",       # Optimizes embedding for clustering tasks
    output_dimensionality=768     # Explicit truncation to 768 dims
)
embedding_vector = list(response['embedding'])[:768]
```

The `task_type="clustering"` parameter is critically important — Gemini can optimize its embedding representation for different downstream tasks (semantic search, classification, clustering). Clustering mode produces vectors that group semantically similar content more tightly.

**Step 2 — Async Wrapping:**
Gemini's Python SDK is synchronous (blocking). Running it directly in an `async def` FastAPI handler would block the event loop. The solution:
```python
loop = asyncio.get_event_loop()
response = await loop.run_in_executor(None, _call_gemini)
```
`run_in_executor` runs the blocking call in a thread pool worker, freeing the event loop to handle other requests while waiting.

**Step 3 — Vector Storage:**
```python
vector_str = f"[{','.join(str(v) for v in embedding_768)}]"
db.table("embeddings").insert({
    "feedback_id": feedback_id,
    "embedding": vector_str,
    "model": "gemini-embedding-2",
}).execute()
```

The vector is serialized as a string `[0.014, -0.098, ..., 0.812]` (the format pgvector's PostgreSQL extension expects for VECTOR type inserts via the REST API).

**Step 4 — Deduplication Guard:**
Before generating any embedding, the service first checks if one already exists:
```python
existing = db.table("embeddings").select("id").eq("feedback_id", feedback_id).execute()
if existing.data:
    return existing.data[0]  # Skip — already embedded
```
This makes the endpoint idempotent — safe to call multiple times on the same feedback item.

### Batch Mode (Backfill)

```python
async def create_embeddings_batch(feedback_ids=None):
    if feedback_ids is None:
        # Auto-discover all feedback without embeddings
        all_feedback = db.table("feedback").select("id").execute()
        existing_ids = {e["feedback_id"] for e in db.table("embeddings").select("feedback_id").execute().data}
        feedback_ids = [f["id"] for f in all_feedback.data if f["id"] not in existing_ids]
    # Then embed each one
```

When called without arguments, automatically finds and processes every feedback item that hasn't been embedded yet. This is the **backfill operation** — useful when you've ingested a batch of feedback and want to embed all of it at once.

### Similarity Search

```python
result = db.rpc("match_feedback", {
    "query_embedding": vector_str,
    "match_count": match_count,
    "match_threshold": match_threshold,  # Default 0.5 for Gemini
}).execute()
```

Calls the `match_feedback` PostgreSQL function, returning the N most similar feedback items above the similarity threshold. This is the core engine behind clustering.

**Why is the threshold 0.5 for Gemini but typically 0.8 for OpenAI?**  
Different embedding models produce vectors with different absolute similarity value distributions. Gemini's similarity values tend to cluster in a different range than OpenAI's. The threshold is tuned per-model to avoid empty result sets.

---

## 6. Subsystem 2 — Similarity Clustering

**Service**: [`backend/app/services/cluster_service.py`](file:///home/Saurabh/apeai/backend/app/services/cluster_service.py)
**Routes**: [`backend/app/routes/clusters.py`](file:///home/Saurabh/apeai/backend/app/routes/clusters.py)

### What It Does

Groups related feedback items into thematic **clusters** by using the vector similarity data from the `embeddings` table. A cluster represents a single "theme" — e.g., "Mobile app performance issues" or "Export functionality requests".

### Cluster Lifecycle (Status State Machine)

A cluster progresses through these states as the pipeline advances:

```
new → clustered → brd_generated → prd_generated → stories_generated → tasks_generated → approved → tickets_created
  └──────────────────────────────────────────────────────────────────────────────────────────────────→ archived
```

The `status` field is the single source of truth for where a cluster is in the pipeline. Layer 3 reads this to decide what's ready to process, and Layer 4 checks for `approved` status before publishing.

### CRUD Operations

The cluster service exposes the full CRUD lifecycle:

| Function | What It Does |
|---|---|
| `create_cluster()` | Creates a new cluster with title, summary, optional feedback IDs, confidence score |
| `get_cluster()` | Fetches cluster + optionally joins its feedback items (2-query join) |
| `list_clusters()` | Lists clusters with status filter and pagination |
| `update_cluster()` | Updates title, summary, status, or confidence score (partial update) |
| `delete_cluster()` | Deletes cluster + cascades to cluster_feedback and documents |
| `add_feedback_to_cluster()` | Inserts rows into cluster_feedback, updates feedback_count |
| `remove_feedback_from_cluster()` | Removes rows, recounts and updates feedback_count |
| `get_cluster_stats()` | Returns count breakdown by status |

### Confidence Scoring

Each cluster has a `confidence_score` (0–100). Higher scores mean the AI is more certain about the cluster's theme:

- Clusters with many feedback items (5+) get higher scores
- Clusters built from high-similarity matches (>0.9 cosine similarity) get higher scores
- Low-item clusters (<3 feedback) receive low scores (shown as warnings in the frontend)

This score is displayed in the frontend as a reliability indicator next to each cluster, telling PMs when to double-check the AI's grouping.

---

## 7. Subsystem 3 — Documents (AI-Generated Artifacts)

**Service**: [`backend/app/services/document_service.py`](file:///home/Saurabh/apeai/backend/app/services/document_service.py)
**Routes**: [`backend/app/routes/documents.py`](file:///home/Saurabh/apeai/backend/app/routes/documents.py)

### What It Does

Stores and manages all AI-generated documents — BRDs, PRDs, Epics, User Stories, and Technical Tasks — with versioning, status tracking, and a hierarchical parent-child relationship.

### Document Types and Hierarchy

```
cluster
  └── brd (Business Requirements Document)
  └── prd (Product Requirements Document)
  └── epic (Feature epic)
       └── story (User story)
            └── task (Technical task — frontend, backend, QA)
  └── sprint_plan
```

The `parent_id` field enables this tree. When Layer 3 generates stories from a PRD, each story has `parent_id = prd.id`. When it generates tasks from a story, each task has `parent_id = story.id`.

### Content as JSONB

All document content is stored as `JSONB`, not as plain text. This is because AI-generated documents have rich structure:

```json
{
  "problem_statement": "Users are requesting...",
  "business_objective": "Increase retention by...",
  "scope": { "in_scope": [...], "out_of_scope": [...] },
  "success_metrics": [...],
  "stakeholders": [...]
}
```

The schema of this content changes as prompts are refined. JSONB avoids schema migration headaches — you can add new keys to the AI output without changing the database schema.

### Versioning

Every time a PM edits a document's content, the `version` counter increments:

```python
if content is not None:
    current = await get_document(document_id)
    update_data["version"] = current.get("version", 1) + 1
```

This is visible in the frontend review workspace (shown as `v2`, `v3`, etc. next to each document tab) so PMs can track how many rounds of editing a document has gone through.

### Status Cascade on Approval

When a document is approved, the parent cluster's status is automatically updated:

```python
status_map = {
    "brd": "brd_generated",
    "prd": "prd_generated",
    "story": "stories_generated",
    "task": "tasks_generated",
}
if doc_type in status_map:
    db.table("clusters").update({"status": status_map[doc_type]}).eq("id", cluster_id).execute()
```

This keeps the cluster's pipeline status synchronized automatically — approving a BRD moves the cluster from `clustered` to `brd_generated` without any separate API call.

---

## 8. Subsystem 4 — Approvals (Human Review Gate Storage)

**Part of**: [`backend/app/services/document_service.py`](file:///home/Saurabh/apeai/backend/app/services/document_service.py)
**Routes**: [`backend/app/routes/documents.py`](file:///home/Saurabh/apeai/backend/app/routes/documents.py) — `approval_router`

### What It Does

Stores the complete history of every human review decision on every AI-generated document. This is the storage backbone of the human-in-the-loop gate.

### The Approval Flow

```
1. PM opens the review workspace for a document
2. PM reads the AI-generated content
3. PM optionally edits the content inline
4. PM clicks "Approve & Publish Gate" or "Reject"
5. POST /approvals/ → create_approval() is called
6. original_content and edited_content are both stored
7. Document status flips to "approved" or "rejected"
8. Cluster status updates automatically (see §7)
9. If approved: Layer 4 publishing becomes available
```

### The Feedback Loop Feature

The most forward-looking aspect of the approvals table:

```python
approval_data = {
    "document_id": document_id,
    "approved": approved,
    "reviewed_by": reviewed_by,
    "original_content": original_content,  # What the AI generated
    "edited_content": edited_content,       # What the PM changed it to
}
```

Every time a PM changes the AI's output before approving, both versions are stored. Over time, these (original, edited) pairs become a dataset that can be used as **few-shot examples** in Layer 3 prompts — teaching the AI to produce output closer to what PMs actually want, without any retraining.

---

## 9. Subsystem 5 — Integration Config Storage

**Part of**: [`backend/app/services/document_service.py`](file:///home/Saurabh/apeai/backend/app/services/document_service.py)
**Routes**: [`backend/app/routes/documents.py`](file:///home/Saurabh/apeai/backend/app/routes/documents.py) — `integration_router`

### What It Does

Stores API credentials and configuration for external publishing platforms (Jira, GitHub, Linear, Notion). These credentials are then read by Layer 4 to authenticate when creating tickets.

### Security: API Key Masking

API keys are **always masked in GET responses**:
```python
for row in (result.data or []):
    row["api_key"] = "***masked***"
    integrations.append(row)
```

The raw key is stored in the database and used internally by Layer 4, but never returned to the frontend. This prevents credential leaks through the browser network tab or API logs.

### JSONB Config Field

The `config` JSONB column stores platform-specific settings that don't fit standard fields:
- Jira: `{ "board_id": "...", "sprint_id": "..." }`
- GitHub: `{ "labels": ["enhancement", "feedback"] }`
- Linear: `{ "team_id": "...", "priority": 2 }`

---

## 10. Subsystem 6 — Ticket Links (Duplicate Prevention)

**Part of**: [`backend/app/services/document_service.py`](file:///home/Saurabh/apeai/backend/app/services/document_service.py)
**Routes**: [`backend/app/routes/documents.py`](file:///home/Saurabh/apeai/backend/app/routes/documents.py) — `ticket_router`

### What It Does

Records every document-to-external-ticket relationship. Layer 4 writes here after successfully creating a ticket. Before creating any ticket, Layer 4 checks this table for an existing record.

### Duplicate Prevention Mechanism

```python
# Layer 4 checks before publishing:
existing = db.table("ticket_links")
    .select("id")
    .eq("document_id", document_id)
    .eq("integration_id", integration_id)
    .execute()
    
if existing.data:
    raise HTTPException(status_code=409, detail="Document already published to this integration")
```

This produces the `409 CONFLICT` response shown in the landing page's "Duplicate Blockers" feature card.

### Status Cascade on Ticket Creation

When a ticket link is created, the cluster status automatically advances to `tickets_created`:
```python
db.table("clusters").update({"status": "tickets_created"}).eq("id", cluster_id).execute()
```

---

## 11. Subsystem 7 — Pipeline Status Overview

**Part of**: [`backend/app/services/document_service.py`](file:///home/Saurabh/apeai/backend/app/services/document_service.py)
**Routes**: [`backend/app/routes/documents.py`](file:///home/Saurabh/apeai/backend/app/routes/documents.py) — separate `pipeline_router` in [`backend/app/routes/pipeline.py`](file:///home/Saurabh/apeai/backend/app/routes/pipeline.py)

### What It Does

Aggregates a full snapshot of the entire pipeline state in a single API call:

```python
return {
    "total_feedback": feedback_count,        # Layer 1 records
    "total_embedded": embedded_count,        # Embedded feedback items
    "total_unembedded": ...,                 # Feedback not yet vectorized
    "total_clusters": ...,                   # Total cluster count
    "clusters_by_status": {                  # Breakdown by pipeline stage
        "new": 3, "clustered": 2, "brd_generated": 1, ...
    },
    "total_documents": ...,
    "documents_by_type": {"brd": 2, "prd": 1, "story": 5, "task": 12},
    "documents_by_status": {"draft": 8, "approved": 4, "published": 2},
    "total_approvals": ...,
    "pending_reviews": ...,                  # Documents in 'review' status
}
```

This powers the pipeline visualization in the dashboard — one endpoint, full picture.

---

## 12. Technology Stack — Why These Exact Choices?

### Supabase (PostgreSQL + pgvector + REST API)

**Why Supabase?**

Supabase is a deliberate consolidation choice. Instead of running separate services for each concern, Supabase provides all of these in a single managed platform:

| Concern | Standalone Alternative | Supabase Equivalent |
|---|---|---|
| Relational database | Self-hosted PostgreSQL | PostgreSQL (managed) |
| Vector database | Pinecone, Weaviate, Qdrant | `pgvector` extension |
| REST API | Custom FastAPI routes for DB | Auto-generated PostgREST API |
| Authentication | Auth0, Firebase Auth | Supabase Auth |
| Real-time | Pusher, Socket.IO | Supabase Realtime |

**For ApeAI specifically:**
- `pgvector` lets us do vector similarity search *inside the same database* as relational queries — no data duplication, no cross-service joins.
- Supabase's Python client (`supabase-py`) wraps the PostgREST REST API cleanly.
- Free tier covers the data volume of typical early-stage usage.
- No infrastructure to manage — no Docker, no Postgres server setup.

---

### pgvector Extension

**Why pgvector over a dedicated vector database?**

pgvector adds `VECTOR(n)` column types and distance operators (`<=>` cosine, `<->` Euclidean, `<#>` inner product) directly to PostgreSQL.

**Advantages:**
- **Colocation**: Vector data lives in the same DB as relational data. A single SQL query can filter by `source = 'slack'` AND rank by cosine similarity — impossible if the vector DB is separate.
- **Transactions**: Vector inserts and relational inserts happen in the same ACID transaction.
- **No extra infra**: No separate Pinecone/Weaviate cluster to manage, pay for, or keep in sync.
- **Custom SQL functions**: The `match_feedback()` function can join vectors with feedback content in one query.

**Limitation**: pgvector's ANN (Approximate Nearest Neighbor) index (`ivfflat`) requires a minimum data volume to build efficiently. The schema comment acknowledges this:
```sql
-- NOTE: This index requires at least some data to exist before creation.
-- Run this AFTER inserting your first batch of embeddings:
-- CREATE INDEX ... ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

For datasets under ~10,000 feedback items, an exact scan (no index) is fast enough. The `ivfflat` index is a production scaling upgrade.

---

### Google Gemini Embeddings (`models/gemini-embedding-2`)

**Why Gemini for embeddings specifically?**

- **768 dimensions** — significantly smaller than OpenAI's 1536-dim `text-embedding-3-small`, halving storage and computation cost while retaining excellent clustering quality.
- **`task_type="clustering"` parameter** — Gemini's API lets you declare intent. The model optimizes the vector representation specifically for clustering, which directly improves cluster cohesion.
- **Free API access** via Google AI Studio — no credit card required for development.
- **Same API key** used for embeddings and text generation in Layer 3 — one credential, one billing account.

---

### supabase-py Client

**Why use the Supabase Python client instead of raw psycopg2?**

- The Supabase client wraps PostgREST's REST API — queries like `.select("*").eq("status", "new").order("created_at", desc=True)` are method chains that generate proper HTTP requests.
- Built-in connection management: the singleton pattern in `supabase_client.py` means one client instance is reused across all requests.
- The `.rpc("match_feedback", {...})` method calls the custom PostgreSQL function from Python without writing raw SQL strings.

**Singleton Pattern:**
```python
_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client  # Reuse existing connection
    _supabase_client = create_client(settings.supabase_url, settings.supabase_key)
    return _supabase_client
```

This prevents creating a new HTTP connection on every request.

---

### Pydantic v2 — Storage Models

**File**: [`backend/app/models/storage.py`](file:///home/Saurabh/apeai/backend/app/models/storage.py)

Every Layer 2 entity has three Pydantic models:

| Model Type | Purpose |
|---|---|
| `XCreate` | Input schema for POST (create) requests |
| `XUpdate` | Input schema for PATCH (update) requests — all optional fields |
| `XResponse` | Output schema returned by API — controls what gets exposed |

**Enums enforce type safety at the API boundary:**
```python
class ClusterStatus(str, Enum):
    NEW = "new"
    CLUSTERED = "clustered"
    BRD_GENERATED = "brd_generated"
    # ...

class DocumentStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    # ...
```

Passing `"invalid_status"` to a PATCH endpoint returns a Pydantic validation error (422) before any DB query runs.

---

### FastAPI — Layer 2 Routes

Layer 2 exposes a proper RESTful API following HTTP conventions:

| HTTP Method | Meaning | Layer 2 Usage |
|---|---|---|
| `GET` | Read/list | `GET /clusters/`, `GET /documents/{id}` |
| `POST` | Create | `POST /embeddings/create`, `POST /approvals/` |
| `PATCH` | Partial update | `PATCH /clusters/{id}`, `PATCH /documents/{id}` |
| `DELETE` | Delete | `DELETE /clusters/{id}`, `DELETE /integrations/{id}` |

Each entity is its own `APIRouter` with a dedicated `prefix` and `tags`, all mounted in `main.py`. This keeps each subsystem independently navigable in the `/docs` Swagger UI.

---

## 13. Alternatives Considered — And Why We Didn't Use Them

### Alternative: Pinecone / Weaviate / Qdrant (Dedicated Vector Database)

**What they are**: Managed vector databases purpose-built for embedding storage and ANN search. Pinecone is the most popular.

**Why not used**:
- **Separate service = data split**: Embeddings would live in Pinecone, relational data in PostgreSQL. Filtering by both (e.g., "find similar feedback from Slack only") would require two queries and application-side joining.
- **Extra cost**: Pinecone's free tier has strict dimension and vector limits. Supabase's pgvector is included in the existing database plan.
- **Operational complexity**: Two connection strings, two authentication systems, two failure domains.
- **Upgrade path exists**: If ApeAI reaches millions of vectors, migrating to Pinecone while keeping relational data in Supabase is achievable — the embedding service is the only file to change.

---

### Alternative: Redis + RedisVSS (In-Memory Vector Search)

**What it is**: Redis with the RediSearch module supports vector similarity search entirely in memory.

**Why not used**:
- Redis is primarily an in-memory store — durability requires extra configuration (AOF, RDB snapshots).
- Losing the Redis server means losing all embeddings, requiring a full re-embed run.
- Memory is expensive at scale: 768 floats × 4 bytes × 100,000 items = ~300MB just for vectors, before any other Redis usage.
- PostgreSQL with pgvector is durable by default and scales to disk.

---

### Alternative: S3/Object Storage for Document Content

**What it is**: Storing BRD/PRD/story content as JSON files in AWS S3 or Google Cloud Storage instead of JSONB in PostgreSQL.

**Why not used**:
- PostgreSQL JSONB is queryable — you can filter documents by content fields (`WHERE content->>'status' = 'active'`).
- Object storage requires a separate API call for each document read/write vs. a single DB query.
- Supabase already provides PostgreSQL with JSONB — adding S3 would be a third service.
- JSONB indexes support fast queries on nested fields when needed.

---

### Alternative: SQLAlchemy ORM instead of supabase-py

**What it is**: SQLAlchemy is the standard Python ORM for PostgreSQL.

**Why not used**:
- SQLAlchemy requires a direct psycopg2 connection to PostgreSQL, which means managing connection strings, connection pooling, and Supabase's connection limits.
- `supabase-py` uses the PostgREST REST API — this works identically in both local development (with Supabase CLI) and cloud production (Supabase hosted), with no connection string management.
- The project's strict "communicate via HTTP" principle means using the REST API is architecturally consistent.
- Supabase's `.rpc()` method still allows calling custom SQL functions when raw PostgreSQL power is needed (e.g., `match_feedback()`).

---

### Alternative: Elasticsearch for Similarity Search

**What it is**: Elasticsearch has vector search capabilities (`dense_vector` fields + `knn` queries).

**Why not used**:
- Elasticsearch is a separate heavyweight service (JVM-based, ~1GB+ RAM minimum).
- The use case (768-dim cosine similarity for clustering) is exactly what pgvector was designed for at ApeAI's scale.
- Elasticsearch adds licensing complexity (Elastic License vs. Apache 2.0 for older versions).

---

### Alternative: MongoDB Atlas (for Document Storage)

**What it is**: MongoDB Atlas is a managed NoSQL database with native JSON document storage and vector search capabilities.

**Why not used**:
- MongoDB lacks the relational integrity guarantees (foreign keys, constraints) that Layer 2 relies on heavily.
- The cascade delete behavior (`ON DELETE CASCADE`) on `cluster_feedback`, `documents`, `approvals`, and `ticket_links` is critical for data integrity — MongoDB's document model doesn't have this.
- PostgreSQL's JSONB column gives MongoDB-style flexible content storage *inside* a relational database — best of both worlds.

---

## 14. Layer 2 File Map (Where Is Every File?)

```
/home/Saurabh/apeai/
│
├── backend/
│   └── app/
│       │
│       ├── db/
│       │   ├── schema.sql             ← All 8 table definitions + pgvector + match_feedback()
│       │   └── supabase_client.py     ← Singleton Supabase client factory
│       │
│       ├── models/
│       │   └── storage.py             ← All Pydantic models for Layer 2 (enums, create/update/response)
│       │
│       ├── routes/
│       │   ├── embeddings.py          ← POST /embeddings/create, /batch, /search; GET /stats
│       │   ├── clusters.py            ← Full CRUD for /clusters/* + feedback linking
│       │   ├── documents.py           ← CRUD for /documents/*, /approvals/*, /integrations/*, /ticket-links/*
│       │   └── pipeline.py            ← POST /pipeline/cluster and generate-* (orchestrates Layer 2→3)
│       │
│       └── services/
│           ├── embedding_service.py   ← Google Gemini embedding calls + pgvector storage + similarity search
│           ├── cluster_service.py     ← Cluster CRUD + feedback linking + stats
│           └── document_service.py    ← Document CRUD + approval flow + integration config + ticket links + pipeline status
│
├── tests/
│   ├── test_layer2.sh                 ← Shell script testing all Layer 2 HTTP endpoints
│   └── verify_integration.sh          ← End-to-end test: ingest → embed → cluster → status check
└── .env                               ← Environment configuration file
```

### File Responsibilities Summary

| File | Responsibility |
|---|---|
| [`schema.sql`](file:///home/Saurabh/apeai/backend/app/db/schema.sql) | All DDL: 8 tables, indexes, triggers, `match_feedback()` function |
| [`supabase_client.py`](file:///home/Saurabh/apeai/backend/app/db/supabase_client.py) | Singleton client, health check query |
| [`models/storage.py`](file:///home/Saurabh/apeai/backend/app/models/storage.py) | All Pydantic schemas: enums, create/update/response for every entity |
| [`routes/embeddings.py`](file:///home/Saurabh/apeai/backend/app/routes/embeddings.py) | HTTP routes for embedding operations |
| [`routes/clusters.py`](file:///home/Saurabh/apeai/backend/app/routes/clusters.py) | HTTP routes for cluster CRUD + feedback linking |
| [`routes/documents.py`](file:///home/Saurabh/apeai/backend/app/routes/documents.py) | HTTP routes for documents, approvals, integrations, ticket links |
| [`routes/pipeline.py`](file:///home/Saurabh/apeai/backend/app/routes/pipeline.py) | HTTP routes for triggering AI pipeline stages |
| [`services/embedding_service.py`](file:///home/Saurabh/apeai/backend/app/services/embedding_service.py) | Gemini API calls, vector formatting, batch embedding, similarity search |
| [`services/cluster_service.py`](file:///home/Saurabh/apeai/backend/app/services/cluster_service.py) | Cluster CRUD, feedback linking, count management, stats |
| [`services/document_service.py`](file:///home/Saurabh/apeai/backend/app/services/document_service.py) | Document CRUD, approval logic, integration config, ticket links, pipeline status |

---

## 15. API Endpoints Reference

All Layer 2 endpoints run on `http://localhost:8000` (dev).

### Embeddings

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/embeddings/create` | Generate embedding for a single feedback item |
| `POST` | `/embeddings/batch` | Generate embeddings for all un-embedded feedback |
| `POST` | `/embeddings/search` | Find similar feedback by text or feedback_id |
| `GET` | `/embeddings/stats` | Count of total/embedded/unembedded feedback |

### Clusters

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/clusters/` | Create a new cluster |
| `GET` | `/clusters/` | List clusters (filter by status, paginate) |
| `GET` | `/clusters/stats` | Cluster count breakdown by status |
| `GET` | `/clusters/{id}` | Get cluster with its feedback items |
| `PATCH` | `/clusters/{id}` | Update title, summary, status, or confidence |
| `DELETE` | `/clusters/{id}` | Delete cluster and all its links |
| `POST` | `/clusters/{id}/feedback` | Add feedback items to cluster |
| `DELETE` | `/clusters/{id}/feedback` | Remove feedback from cluster |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/` | Create a new document |
| `GET` | `/documents/` | List documents (filter by cluster, type, status) |
| `GET` | `/documents/{id}` | Get a single document |
| `PATCH` | `/documents/{id}` | Update title, content, or status (increments version) |
| `DELETE` | `/documents/{id}` | Delete document |

### Approvals

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/approvals/` | Submit approval or rejection |
| `GET` | `/approvals/` | List approvals (filter by document) |

### Integrations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/integrations/` | Configure a new integration |
| `GET` | `/integrations/` | List active integrations (keys masked) |
| `PATCH` | `/integrations/{id}` | Update integration config |
| `DELETE` | `/integrations/{id}` | Delete integration |

### Ticket Links

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ticket-links/` | Record a new document→ticket mapping |
| `GET` | `/ticket-links/` | List ticket links (filter by document) |

### Pipeline

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pipeline/status` | Full pipeline snapshot (all counts and breakdowns) |
| `POST` | `/pipeline/cluster` | Trigger clustering of all unprocessed feedback |
| `POST` | `/pipeline/summarize/{cluster_id}` | Generate AI summary for a cluster |
| `POST` | `/pipeline/generate-brd/{cluster_id}` | Generate BRD document |
| `POST` | `/pipeline/generate-prd/{cluster_id}` | Generate PRD document |
| `POST` | `/pipeline/generate-stories/{cluster_id}` | Generate User Stories |
| `POST` | `/pipeline/generate-tasks/{story_id}` | Generate Technical Tasks |

---

## 16. Data Flow: How Layer 1 Data Becomes Layer 3 Input

Here is the complete journey from raw feedback record to a clustered, AI-ready group:

```
LAYER 1 OUTPUT:
  feedback table row:
    id: "a1b2c3..."
    source: "slack"
    content: "The mobile app crashes when uploading a profile picture over 5MB"
    timestamp: 2026-05-25T08:00:00Z

    ↓ POST /embeddings/create

STEP 1 — EMBEDDING:
  embedding_service.py calls genai.embed_content(
    model="models/gemini-embedding-2",
    content="The mobile app crashes...",
    task_type="clustering",
    output_dimensionality=768
  )
  → Returns [0.0142, -0.0984, 0.3821, ..., 0.8123]  (768 floats)

  embeddings table row:
    feedback_id: "a1b2c3..."
    embedding: [0.0142, -0.0984, ..., 0.8123]
    model: "gemini-embedding-2"

    ↓ POST /pipeline/cluster

STEP 2 — SIMILARITY SEARCH:
  For each un-clustered feedback item:
    db.rpc("match_feedback", {
      "query_embedding": [0.0142, ...],
      "match_count": 10,
      "match_threshold": 0.5
    })
  → Returns: [{feedback_id: "b2c3d4...", similarity: 0.92}, ...]
  → "Users can't upload photos larger than 5MB"  (similarity: 0.92) ✓
  → "File upload breaks on images over 5MB"       (similarity: 0.89) ✓

STEP 3 — CLUSTER CREATION:
  cluster_service.create_cluster(
    title="Mobile File Upload Issues",
    feedback_ids=["a1b2c3...", "b2c3d4...", "c3d4e5..."],
    confidence_score=87.5
  )

  clusters table row:
    id: "x1y2z3..."
    title: "Mobile File Upload Issues"
    feedback_count: 3
    confidence_score: 87.5
    status: "clustered"

  cluster_feedback rows:
    (x1y2z3, a1b2c3, similarity: 1.0)   ← Seed item
    (x1y2z3, b2c3d4, similarity: 0.92)
    (x1y2z3, c3d4e5, similarity: 0.89)

    ↓ (Layer 3 reads this cluster)

LAYER 3 INPUT:
  Cluster "Mobile File Upload Issues"
  Content: 3 feedback items grouped by semantic similarity
  → Layer 3 generates BRD, PRD, stories, tasks
  → Stored back in documents table
```

---

## 17. Frontend: Where and How Layer 2 Is Shown

Layer 2 is surfaced across **four distinct frontend locations**:

---

### 17.1 Landing Page — Interactive Demo Sandbox (Step 2)

**File**: [`frontend/app/page.tsx`](file:///home/Saurabh/apeai/frontend/app/page.tsx) — `{stepIndex === 1 && <PgVectorStage />}`

**Component**: [`frontend/components/PgVectorStage.tsx`](file:///home/Saurabh/apeai/frontend/components/PgVectorStage.tsx)

Step 2 of the homepage demo (the 4-step animated sandbox) is entirely devoted to Layer 2's vector clustering. It shows:

- **Left panel**: An SVG coordinate space showing three labeled clusters (Bugs & Crashes in red, Auth & Billing in cyan, Analytics Features in slate) with a new incoming blue query vector. Animated laser lines (`stroke-dasharray` CSS animation) draw from the query point to matching nodes as they're discovered.

- **Right panel**: A terminal-style console showing the live execution: Gemini embedding call → SQL cosine query → "Found 2 coordinate neighbors" → deduplication gate triggered with exact cosine distance values (0.9419, 0.8870).

The full animation cycle runs every 6 seconds with carefully sequenced CSS `@keyframes` (`queryFadeIn`, `radarSweep`, `laserDraw`, `matchGlow1`, `matchGlow2`, `cosineArc`).

---

### 17.2 Landing Page — Engine Stack Section (Layer 2: Relational Memory Row)

**File**: [`frontend/app/page.tsx`](file:///home/Saurabh/apeai/frontend/app/page.tsx) — Row 2 of the Engine Stack section

**Component**: [`frontend/components/PgVectorSimilarityLayer.tsx`](file:///home/Saurabh/apeai/frontend/components/PgVectorSimilarityLayer.tsx)

The second row of the "Engine Stack" zigzag section describes Layer 2:

- **Text description**: "We leverage Supabase and the Postgres `pgvector` extension. Our engine creates 768-dimensional embeddings using Gemini, performing instant cosine-similarity queries to match and group thousands of disjointed customer requests autonomously."

- **Visual component**: A 2-panel visualization:
  - **Left (7 cols)**: 2D scatter plot with three labeled clusters (purple: Features, amber: Security, emerald: current target group). Animated dashed connector lines from the incoming blue "Input Vector" to two green match nodes (`APE-210 (0.94 sim)`, `Issue #421 (0.89 sim)`), with expanding radar ripple rings around the query point.
  - **Right (5 cols)**: SQL console showing the actual pgvector query `SELECT id, sim FROM embeddings ORDER BY val <=> :query LIMIT 2;` and the match results, cycling through three states every 4 seconds.

---

### 17.3 Dashboard — Feedback Inbox (`/dashboard`)

**File**: [`frontend/app/dashboard/page.tsx`](file:///home/Saurabh/apeai/frontend/app/dashboard/page.tsx)

The dashboard shows:

1. **Active Clusters panel**: Displays all clusters from `GET /clusters/`. Each cluster card shows title, summary, status badge (with color-coded left border), feedback count, and creation date. Two action buttons: "Pipeline Map" → `/pipeline/{id}` and "Review Gate" → `/review/{id}`.

2. **Trigger AI Clustering button**: Calls `POST /pipeline/cluster` → shows toast on completion.

3. **Stats metrics**: "Active Clusters" count pulled from `GET /clusters/`.

---

### 17.4 Pipeline Tracker (`/pipeline/[cluster_id]`)

**File**: [`frontend/app/pipeline/[cluster_id]/page.tsx`](file:///home/Saurabh/apeai/frontend/app/pipeline/%5Bcluster_id%5D/page.tsx)

The pipeline tracker page is the **primary Layer 2 operator interface**. It shows a vertical stepper with 6 stages:

| Step | Layer | What It Shows |
|---|---|---|
| 1 — Feedback Clustered | Layer 2 | Always complete (cluster exists) |
| 2 — AI Cluster Summary | Layer 2/3 | `POST /pipeline/summarize/{id}` |
| 3 — Business Requirements (BRD) | Layer 3 | `POST /pipeline/generate-brd/{id}` |
| 4 — Product Requirements (PRD) | Layer 3 | `POST /pipeline/generate-prd/{id}` |
| 5 — Agile User Stories | Layer 3 | `POST /pipeline/generate-stories/{id}` |
| 6 — Technical Task Breakdown | Layer 3 | `POST /pipeline/generate-tasks/{story_id}` |

Each step detects its completion state by checking `GET /documents/?cluster_id={id}` for the presence of the corresponding document type. Steps are `complete` (green check), `active` (black with action button), or `pending` (greyed out, "Waiting on previous steps...").

---

### 17.5 Review Workspace (`/review/[cluster_id]`)

**File**: [`frontend/app/review/text.tsx`](file:///home/Saurabh/apeai/frontend/app/review/text.tsx)

The review workspace is the **human-in-the-loop interface** where Layer 2's approval system is operated:

- **Document tabs**: BRD / PRD / STORY / TASK — each tab shows the document from `GET /documents/?cluster_id={id}&type={tab}`, with a version badge (`v2`, `v3`).
- **Inline editor**: Title input + JSON content textarea. The content is the raw JSONB from the `documents` table, displayed formatted.
- **"Save Changes" button**: Calls `PATCH /documents/{id}` with updated content, increments version.
- **"Approve & Publish Gate" button**: Calls `POST /approvals/` + `PATCH /documents/{id}` with `status: "approved"`. Unlocks the publishing toolbar.
- **Publishing toolbar**: Three icon buttons (GitHub, Jira, Linear) — enabled only after approval. Each calls the corresponding Layer 4 publish route.
- **Ticket link display**: After publishing, shows the external ticket ID and URL with a green badge and direct link.

---

### Summary: Layer 2 in the Frontend

| Frontend Location | Route | What Layer 2 Functionality Is Shown |
|---|---|---|
| Landing page demo | `/` | Animated pgvector clustering + cosine similarity search (Step 2) |
| Landing page engine stack | `/` | PgVectorSimilarityLayer component with SQL + scatter plot |
| Dashboard Feedback Inbox | `/dashboard` | Live cluster list + trigger clustering button |
| Pipeline Tracker | `/pipeline/[cluster_id]` | Step-by-step stepper with document generation triggers |
| Review Workspace | `/review/[cluster_id]` | Document editor + approval gate + publishing toolbar |

---

## 18. Cluster Status State Machine

The `status` field on the `clusters` table is the backbone of the entire pipeline:

```
                        ┌──────────────────────────────────────────────────┐
                        │                   CLUSTER LIFECYCLE               │
                        └──────────────────────────────────────────────────┘

  Layer 2 clustering → [new] → [clustered]
  Layer 3 summarize  →        [clustered] → (summary generated, no status change)
  Layer 3 BRD        →                    → [brd_generated]
  Layer 3 PRD        →                                 → [prd_generated]
  Layer 3 stories    →                                              → [stories_generated]
  Layer 3 tasks      →                                                           → [tasks_generated]
  Human approval     →                                                                        → [approved]
  Layer 4 publish    →                                                                                  → [tickets_created]
  
  At any point       →                                                → [archived]
```

**Status transitions are triggered automatically** when documents are approved in `document_service.create_approval()`:
```python
status_map = { "brd": "brd_generated", "prd": "prd_generated", ... }
```

And when ticket links are created in `document_service.create_ticket_link()`.

---

## 19. Document Lifecycle State Machine

```
AI generates document → [draft]
                           │
                           ├─ PM views in review workspace
                           │
                           ├─ PM edits content → version+1, still [draft]
                           │
                           ├─ PM clicks "Approve" → [approved]
                           │     └─ Cluster status updates automatically
                           │     └─ Publishing buttons unlock
                           │
                           └─ PM clicks "Reject" → [rejected]
                                 └─ Layer 3 can regenerate → new [draft]
                                 
[approved]
     │
     ├─ Layer 4 publishes → [published]
     │     └─ ticket_links row created
     │     └─ Cluster → [tickets_created]
     │
     └─ Publishing fails → [failed]
           └─ Retry allowed
```

---

## 20. Security Considerations

| Risk | Layer 2 Defense |
|---|---|
| Invalid pipeline status transitions | `CHECK` constraints in PostgreSQL schema enforce valid status values |
| Orphaned records on deletion | `ON DELETE CASCADE` on all foreign keys — deleting a cluster deletes everything downstream |
| API key leaks in GET responses | `api_key` field is always replaced with `"***masked***"` in `list_integrations()` |
| Duplicate ticket publishing | `ticket_links` table check before every publish — `409 Conflict` on duplicate |
| SQL injection via vector strings | Vector values are Python floats serialized to strings — no user input flows into the SQL |
| Unauthorized cluster modification | `Depends(get_current_user)` on write operations (visible in `clusters.py`) |
| Concurrent embedding requests | `UNIQUE(feedback_id)` constraint on `embeddings` table prevents duplicate embedding rows from race conditions |
| Updated_at staleness | PostgreSQL triggers update `updated_at` on every row change, even direct DB edits |

---

## Quick Reference Card

| Item | Value |
|---|---|
| Layer purpose | Store, vectorize, cluster, and manage all pipeline data |
| Primary database | Supabase (PostgreSQL) |
| Vector extension | pgvector (`VECTOR(768)` columns, `<=>` cosine distance) |
| Embedding model | Google Gemini `models/gemini-embedding-2` (768 dimensions) |
| Total tables | 8 (`feedback`, `embeddings`, `clusters`, `cluster_feedback`, `documents`, `approvals`, `integrations`, `ticket_links`) |
| Similarity function | Custom `match_feedback()` PostgreSQL RPC |
| API key security | Masked in all GET responses |
| Document versioning | Auto-increment on content change in `update_document()` |
| Status enforcement | PostgreSQL `CHECK` constraints + application-level enums |
| Cascade behavior | `ON DELETE CASCADE` on all FK relationships |
| Singleton pattern | `get_supabase_client()` lazy-initialized module-level variable |
| Frontend pages | `/dashboard`, `/pipeline/[cluster_id]`, `/review/[cluster_id]` |
| After Layer 2 | Clustered data is consumed by Layer 3 (AI generation pipeline) |
