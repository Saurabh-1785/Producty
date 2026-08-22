# 🦍 ApeAI — Layers 3, 4 & 5: Complete Deep Dive

> **Scope**: This document covers the final three layers of ApeAI in full detail — Layer 3 (AI Generation Pipeline), Layer 4 (Publishing & External Integrations), and Layer 5 (Authentication & Workspace Access). Each section covers what the layer does, how it works, its architecture, every technology used (and why), alternatives considered, where the code lives, and how it appears in the frontend.

---

## Table of Contents

### Layer 3 — AI Generation Pipeline
1. [What Is Layer 3?](#1-what-is-layer-3)
2. [The GeminiClient — Centralized AI Gateway](#2-the-geminiclient--centralized-ai-gateway)
3. [Stage 0: Feedback Classification & Dynamic Thresholds](#3-stage-0-feedback-classification--dynamic-thresholds)
4. [Stage 1: Intelligent Clustering (`cluster_unprocessed_feedback`)](#4-stage-1-intelligent-clustering-cluster_unprocessed_feedback)
5. [Stage 2: AI Cluster Summarization](#5-stage-2-ai-cluster-summarization)
6. [Stage 3: BRD Generation](#6-stage-3-brd-generation)
7. [Stage 4: PRD Generation](#7-stage-4-prd-generation)
8. [Stage 5: User Story Generation](#8-stage-5-user-story-generation)
9. [Stage 6: Technical Task Breakdown](#9-stage-6-technical-task-breakdown)
10. [Prompt Templates — The Instruction Layer](#10-prompt-templates--the-instruction-layer)
11. [Layer 3 Technology Stack](#11-layer-3-technology-stack)
12. [Layer 3 Alternatives Considered](#12-layer-3-alternatives-considered)
13. [Layer 3 File Map](#13-layer-3-file-map)
14. [Layer 3 API Endpoints](#14-layer-3-api-endpoints)
15. [Layer 3 in the Frontend](#15-layer-3-in-the-frontend)

### Layer 4 — Publishing & External Integrations
16. [What Is Layer 4?](#16-what-is-layer-4)
17. [The Universal Task Format — The Publishing Abstraction](#17-the-universal-task-format--the-publishing-abstraction)
18. [The `publish_document` Orchestrator — 9-Step Flow](#18-the-publish_document-orchestrator--9-step-flow)
19. [Integration: GitHub Issues](#19-integration-github-issues)
20. [Integration: Jira Cloud](#20-integration-jira-cloud)
21. [Integration: Linear](#21-integration-linear)
22. [Dry Run Mode](#22-dry-run-mode)
23. [Layer 4 Technology Stack](#23-layer-4-technology-stack)
24. [Layer 4 Alternatives Considered](#24-layer-4-alternatives-considered)
25. [Layer 4 File Map](#25-layer-4-file-map)
26. [Layer 4 API Endpoints](#26-layer-4-api-endpoints)
27. [Layer 4 in the Frontend](#27-layer-4-in-the-frontend)

### Layer 5 — Authentication & Workspace Access
28. [What Is Layer 5?](#28-what-is-layer-5)
29. [Supabase Auth — The Auth Provider](#29-supabase-auth--the-auth-provider)
30. [Frontend Authentication Flow](#30-frontend-authentication-flow)
31. [Backend JWT Verification](#31-backend-jwt-verification)
32. [AuthContext — Global Session State](#32-authcontext--global-session-state)
33. [Route Protection](#33-route-protection)
34. [Layer 5 Technology Stack](#34-layer-5-technology-stack)
35. [Layer 5 Alternatives Considered](#35-layer-5-alternatives-considered)
36. [Layer 5 File Map](#36-layer-5-file-map)
37. [Layer 5 in the Frontend](#37-layer-5-in-the-frontend)

---

# ═══════════════════════════════════════
# LAYER 3 — AI GENERATION PIPELINE
# ═══════════════════════════════════════

## 1. What Is Layer 3?

**Layer 3 is ApeAI's AI brain.** It consumes the clusters and embeddings produced by Layer 2 and uses Google Gemini to automatically generate the full product documentation chain:

```
Cluster (Layer 2 output)
  → Summary (who is this cluster?)
  → BRD (what is the business problem?)
  → PRD (what exactly do we build?)
  → User Stories (what are the user scenarios?)
  → Technical Tasks (what do engineers actually do?)
```

Every stage produces a structured JSON document stored in Layer 2's `documents` table. Layer 3 does NOT:
- Ingest feedback (Layer 1)
- Store data (Layer 2)
- Push to external tools (Layer 4)
- Authenticate users (Layer 5)

**Layer 3 is purely generative**: it reads clusters, calls Gemini, and writes documents.

---

## 2. The GeminiClient — Centralized AI Gateway

**File**: [`backend/app/ai/gemini_client.py`](file:///home/Saurabh/apeai/backend/app/ai/gemini_client.py)

The `GeminiClient` is a **singleton** wrapper around `google.generativeai` that centralizes all Gemini access in one place.

```python
class GeminiClient:
    _instance = None  # Singleton enforcement
    _configured = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _configure(self):
        """Lazy configuration — only calls genai.configure() once."""
        if not self._configured:
            genai.configure(api_key=settings.google_api_key)
            self._configured = True

    def get_model(self, model_type: str = "flash", json_mode: bool = False):
        """Returns a GenerativeModel instance, optionally in JSON output mode."""
        self._configure()
        model_name = MODEL_MAPPING.get(model_type, MODEL_MAPPING["flash"])
        generation_config = {}
        if json_mode:
            generation_config["response_mime_type"] = "application/json"
        return genai.GenerativeModel(model_name=model_name, ...)
```

### Model Mapping

```python
MODEL_MAPPING = {
    "flash": "gemini-2.5-flash-lite",  # Speed — used for summarization & tasks
    "pro":   "gemini-2.5-flash-lite",  # Reasoning — used for BRD, PRD, stories (same model currently)
    "embedding": "models/gemini-embedding-2"  # Vector embeddings (Layer 2)
}
```

> **Design note**: Both `"flash"` and `"pro"` currently map to `gemini-2.5-flash-lite`. This is intentional — the architecture supports using a heavier model (e.g., `gemini-2.5-pro`) for complex document generation simply by updating this mapping, with zero changes to caller code.

### JSON Mode

When `json_mode=True`, the model is configured with `response_mime_type = "application/json"`:
- Gemini is instructed to **only produce valid JSON** — no markdown code fences, no preamble, no trailing text.
- This eliminates the need for parsing heuristics or stripping `\`\`\`json` blocks.
- Every Layer 3 generation call uses JSON mode to ensure clean `json.loads()` parsing.

### `generate_content_async`

All generation calls use the **async variant**:
```python
response = await model.generate_content_async(prompt)
data = json.loads(response.text)
```

`generate_content_async` is non-blocking — it releases the FastAPI event loop during the HTTP call to Gemini, allowing other requests to be served while waiting for the AI response.

---

## 3. Stage 0: Feedback Classification & Dynamic Thresholds

**File**: [`backend/app/ai/services/clustering_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/clustering_service.py)

Before clustering begins, each feedback item is **classified** to determine how strictly similar other feedback needs to be before it's placed in the same cluster:

```python
THRESHOLDS = {
    "bug": 0.90,           # Bugs must be very specific matches (same crash = same bug)
    "feature_request": 0.85, # Feature requests can be grouped more broadly
    "usability": 0.85,     # Usability issues similarly broad
    "default": 0.80        # Generic fallback
}

async def classify_feedback(content: str) -> str:
    content_lower = content.lower()
    if any(word in content_lower for word in ["bug", "error", "fail", "broken", "crash", "wrong"]):
        return "bug"
    if any(word in content_lower for word in ["feature", "add", "new", "want", "should", "could"]):
        return "feature_request"
    return "default"
```

**Why different thresholds?**

- **Bugs** use a high threshold (0.90) because two bug reports for different crashes can both mention "crash" — we don't want to group them unless they're truly describing the same failure.
- **Feature requests** use a lower threshold (0.85) because "can we add CSV export?" and "I want to download my data" should be grouped even without identical wording.

**Why keyword heuristics instead of Gemini?**

Classification is done per-item during the clustering loop, which may run on hundreds of items. Using Gemini for each classification would be expensive and slow. Keyword matching is O(n) per item, runs in microseconds, and is accurate enough for threshold selection. Gemini is reserved for the expensive document generation stages.

---

## 4. Stage 1: Intelligent Clustering (`cluster_unprocessed_feedback`)

**File**: [`backend/app/ai/services/clustering_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/clustering_service.py)

This is the master clustering orchestrator, triggered by `POST /pipeline/cluster`.

### The Full Algorithm

```
STEP 1: Ensure all feedback is embedded
  → Calls create_embeddings_batch() from embedding_service
  → Any feedback without a vector gets one now

STEP 2: Find unclustered feedback
  → All feedback IDs from feedback table
  → Minus any IDs already in cluster_feedback table
  → Remainder = "unprocessed"

STEP 3: Early exit if nothing to process
  → Return "All feedback is already clustered."

STEP 4: Check if embeddings exist (fallback guard)
  → If NO embeddings exist at all → _create_fallback_clusters()

STEP 5: For each unprocessed feedback item:
  a. Classify it (bug / feature_request / default)
  b. Select threshold from THRESHOLDS map
  c. Generate its embedding (or retrieve existing)
  d. Call match_feedback() pgvector RPC:
     → Find up to 5 similar items above threshold
     → Exclude the item itself from results
  e. Check if any match is already in a cluster:
     → If YES: add this item to that cluster
     → If NO: create a new cluster with just this item

STEP 6: Return summary statistics
  → {"processed": N, "new_clusters": M, "linked": L}
```

### Fallback Clustering

When no embeddings exist yet (e.g., first run, or Google API key not configured):

```python
async def _create_fallback_clusters(unprocessed):
    groups = {}
    for item in unprocessed:
        fb_type = await classify_feedback(item["content"])
        groups.setdefault(fb_type, []).append(item["id"])
    
    for fb_type, fids in groups.items():
        await create_cluster(
            title=f"{fb_type.replace('_', ' ').title()} Feedback Group",
            summary=f"Auto-grouped {len(fids)} {fb_type} items (fallback — no embeddings).",
            feedback_ids=fids,
            confidence_score=50.0
        )
```

Fallback clusters have `confidence_score=50.0` (vs. 100.0 for vector-based clusters) and are labeled as fallback in their summary, so PMs know they weren't semantically matched.

---

## 5. Stage 2: AI Cluster Summarization

**File**: [`backend/app/ai/services/generation_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/generation_service.py)
**Triggered by**: `POST /pipeline/summarize/{cluster_id}`

Takes a raw cluster and produces a human-readable, AI-generated summary and title.

```python
async def summarize_cluster(cluster_id: str) -> Dict[str, Any]:
    cluster = await get_cluster(cluster_id, include_feedback=True)
    feedback_items = cluster.get("feedback_items", [])
    
    # Format all feedback content for the prompt
    feedback_text = "\n".join([
        f"- {f['content']} (Source: {f['source']})" 
        for f in feedback_items
    ])
    
    prompt = CLUSTER_SUMMARY_PROMPT.format(feedback_text=feedback_text)
    model = gemini_client.get_model(model_type="flash", json_mode=True)
    response = await model.generate_content_async(prompt)
    data = json.loads(response.text)
    
    # Write summary back to cluster
    await update_cluster(cluster_id,
        title=data["title"],
        summary=data["summary"],
        status="clustered",
        confidence_score=95.0
    )
    return data
```

**Output format** (from `CLUSTER_SUMMARY_PROMPT`):
```json
{
    "title": "Mobile File Upload Failures",
    "summary": "Users consistently report that file uploads fail when...",
    "theme": "bug",
    "priority": "high",
    "key_points": ["5MB file size limit", "iOS-specific", "No error message shown"]
}
```

**Why Flash for summarization?**

Summarization is low-complexity — it's reading and condensing, not reasoning deeply. `gemini-2.5-flash-lite` is faster and cheaper than Pro, and the quality difference is negligible for summaries.

---

## 6. Stage 3: BRD Generation

**File**: [`backend/app/ai/services/generation_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/generation_service.py)
**Triggered by**: `POST /pipeline/generate-brd/{cluster_id}`

Takes the cluster's AI-generated summary and produces a **Business Requirements Document** — the business-level case for why this needs to be built.

```python
async def generate_brd(cluster_id: str) -> Dict[str, Any]:
    cluster = await get_cluster(cluster_id)
    summary = cluster.get("summary")
    if not summary:
        raise ValueError("Cluster must be summarized before generating BRD")
    
    prompt = BRD_PROMPT.format(cluster_summary=summary)
    model = gemini_client.get_model(model_type="pro", json_mode=True)  # Pro for reasoning
    response = await model.generate_content_async(prompt)
    data = json.loads(response.text)
    
    # Persist as a document
    doc = await create_document(
        cluster_id=cluster_id,
        doc_type="brd",
        title=data["title"],
        content=data   # Entire JSON structure saved as JSONB
    )
    
    await update_cluster(cluster_id, status="brd_generated")
    return doc
```

**BRD Output Format** (enforced by `BRD_PROMPT`):
```json
{
    "title": "Business Requirements Document: Mobile Upload Fix",
    "problem_statement": "Users cannot upload profile images larger than 5MB...",
    "business_impact": "High — 23% of users churn after upload failures...",
    "goals": ["Fix upload limit", "Add progress indicator", "Show clear error messages"],
    "target_stakeholders": ["Mobile users", "Customer Success", "Engineering"],
    "success_metrics": ["Upload success rate > 98%", "Support tickets reduced by 50%"]
}
```

**Guard**: The function checks that a `summary` exists before proceeding. You cannot generate a BRD without a summarized cluster — the pipeline enforces sequential ordering.

---

## 7. Stage 4: PRD Generation

**File**: [`backend/app/ai/services/generation_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/generation_service.py)
**Triggered by**: `POST /pipeline/generate-prd/{cluster_id}?brd_id={brd_id}`

Takes the BRD document and generates a **Product Requirements Document** — the technical and functional spec.

```python
async def generate_prd(cluster_id: str, brd_id: str) -> Dict[str, Any]:
    brd = await get_document(brd_id)
    
    # Feed the full BRD content as JSON into the prompt
    prompt = PRD_PROMPT.format(brd_content=json.dumps(brd["content"]))
    
    model = gemini_client.get_model(model_type="pro", json_mode=True)
    response = await model.generate_content_async(prompt)
    data = json.loads(response.text)
    
    doc = await create_document(
        cluster_id=cluster_id,
        doc_type="prd",
        title=data["title"],
        content=data,
        parent_id=brd_id   # PRD is a child of the BRD in the document tree
    )
    
    await update_cluster(cluster_id, status="prd_generated")
    return doc
```

**PRD Output Format**:
```json
{
    "title": "Product Requirements Document: Mobile Upload Fix",
    "user_flows": ["User taps Upload Photo", "User selects image > 5MB", "System shows compression prompt"],
    "functional_requirements": ["Support uploads up to 20MB", "Auto-compress images > 10MB"],
    "non_functional_requirements": ["Upload must complete in < 30s on 4G", "No data loss on failure"],
    "technical_constraints": ["Backend uses S3 presigned URLs", "Frontend is React Native"],
    "milestones": ["MVP: Fix 5MB limit", "v2: Add progress indicator"]
}
```

**Note on `parent_id`**: The PRD stores `parent_id = brd_id`. This enables the document tree: BRD → PRD → Stories → Tasks. The review workspace tab UI uses `documents.find(d => d.type === 'prd')` rather than the parent_id for display, but the tree is the canonical data structure for Layer 4 publishing.

---

## 8. Stage 5: User Story Generation

**File**: [`backend/app/ai/services/generation_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/generation_service.py)
**Triggered by**: `POST /pipeline/generate-stories/{cluster_id}?prd_id={prd_id}`

Takes the PRD and generates multiple **Agile User Stories** — one per feature/scenario. This is the first stage that produces **multiple documents** from a single AI call.

```python
async def generate_stories(cluster_id: str, prd_id: str) -> List[Dict[str, Any]]:
    prd = await get_document(prd_id)
    
    prompt = STORY_PROMPT.format(prd_content=json.dumps(prd["content"]))
    model = gemini_client.get_model(model_type="pro", json_mode=True)
    response = await model.generate_content_async(prompt)
    
    stories_data = json.loads(response.text)  # Returns a JSON array
    
    created_stories = []
    for story in stories_data:
        doc = await create_document(
            cluster_id=cluster_id,
            doc_type="story",
            title=story["title"],
            content=story,
            parent_id=prd_id   # Story → PRD → BRD → Cluster hierarchy
        )
        created_stories.append(doc)
    
    await update_cluster(cluster_id, status="stories_generated")
    return created_stories
```

**Each Story Output Format** (prompt returns a JSON array):
```json
[
    {
        "title": "Upload photo beyond 5MB limit",
        "user_role": "As a mobile user",
        "requirement": "I want to upload profile pictures larger than 5MB",
        "benefit": "so that I can use my high-resolution photos without manual resizing",
        "acceptance_criteria": [
            "Upload works for files up to 20MB",
            "Progress indicator is visible",
            "Friendly error shown for files > 20MB"
        ],
        "priority": "Must Have"
    }
]
```

**Key difference from other stages**: Gemini returns a **JSON array** here (not an object). Each element is saved as a separate `story` document. This is why `json.loads(response.text)` is iterated in a loop.

---

## 9. Stage 6: Technical Task Breakdown

**File**: [`backend/app/ai/services/generation_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/generation_service.py)
**Triggered by**: `POST /pipeline/generate-tasks/{story_id}?cluster_id={cluster_id}`

Takes a single User Story and breaks it down into concrete engineering tasks organized by discipline.

```python
async def generate_tasks(cluster_id: str, story_id: str) -> Dict[str, Any]:
    story = await get_document(story_id)
    
    prompt = TASK_PROMPT.format(story_content=json.dumps(story["content"]))
    model = gemini_client.get_model(model_type="flash", json_mode=True)  # Flash for tasks
    response = await model.generate_content_async(prompt)
    data = json.loads(response.text)
    
    doc = await create_document(
        cluster_id=cluster_id,
        doc_type="task",
        title=f"Technical Tasks: {story['title']}",
        content=data,
        parent_id=story_id  # Task's parent is the story
    )
    return doc
```

**Task Output Format**:
```json
{
    "story_title": "Upload photo beyond 5MB limit",
    "frontend_tasks": [
        "Update file picker to allow up to 20MB",
        "Add upload progress bar component",
        "Show compression modal for files > 10MB"
    ],
    "backend_tasks": [
        "Increase S3 presigned URL expiry to 120s",
        "Add file size validation middleware",
        "Implement async compression pipeline"
    ],
    "testing_tasks": [
        "Unit test file size validation",
        "E2E test upload flow on iOS and Android",
        "Load test with 100 concurrent uploads"
    ],
    "estimated_complexity": "Medium",
    "dependencies": ["S3 bucket policy update", "Compression library selection"]
}
```

**Why Flash for tasks instead of Pro?**

Task breakdown is structured decomposition — lower creativity required vs. BRD/PRD reasoning. Flash is faster and sufficiently capable for this stage. The priority prompt (`"Must Have | Should Have | Could Have"`) already constrains the output format, reducing the need for model reasoning.

---

## 10. Prompt Templates — The Instruction Layer

**File**: [`backend/app/ai/prompts/templates.py`](file:///home/Saurabh/apeai/backend/app/ai/prompts/templates.py)
**Init**: [`backend/app/ai/prompts/__init__.py`](file:///home/Saurabh/apeai/backend/app/ai/prompts/__init__.py)

All prompts follow two rules:
1. **Persona declaration first**: "You are a senior product manager..." gives Gemini a stable role.
2. **Strict JSON output format block**: The exact JSON schema is spelled out, with double-braced `{{}}` escaping (Python's `str.format()` escapes literal braces this way).

### Why Separate Prompt Templates From Service Code?

- Prompts are **high-churn, low-risk** — PMs and AI engineers tune prompts frequently without touching Python logic.
- Keeping prompts in `templates.py` means a non-engineer can iterate on prompt quality.
- The `__init__.py` re-exports all prompts so services can do clean one-line imports.

### The JSON Schema Enforcement Pattern

Each prompt includes the exact JSON schema expected, with example field names and descriptions:

```python
BRD_PROMPT = """
STRICT JSON OUTPUT FORMAT:
{{
    "title": "Business Requirements Document: [Topic]",
    "problem_statement": "...",
    ...
}}
"""
```

When combined with `json_mode=True` on the Gemini model, this creates a double guarantee:
1. The model *structurally* outputs JSON (enforced by API)
2. The model *semantically* uses the correct field names (enforced by prompt)

---

## 11. Layer 3 Technology Stack

### Google Gemini (`gemini-2.5-flash-lite`) — Text Generation

**Why Gemini for document generation?**
- **Structured JSON output mode**: `response_mime_type = "application/json"` guarantees parseable output — critical for automated pipelines.
- **`generate_content_async`**: Native async support for FastAPI's event loop.
- **Single API key**: The same `GOOGLE_API_KEY` used for embeddings (Layer 2) is used for text generation (Layer 3) — no extra credentials.
- **Flash is cost-effective**: For structured JSON tasks (not long-form reasoning), flash produces output comparable to Pro at a fraction of the cost.

### JSON Mode (`response_mime_type`)

This is the most important Gemini feature for Layer 3. Without it, the model sometimes wraps output in markdown code blocks (`\`\`\`json`) or adds preamble text ("Here is the BRD:"). With it, `response.text` is always clean JSON, ready for `json.loads()`.

### `generate_content_async` — Non-Blocking AI Calls

Gemini generation takes 1–10 seconds per call. Using `generate_content_async` means FastAPI can:
- Serve other HTTP requests while waiting
- Handle multiple simultaneous pipeline triggers
- Avoid blocking the single-threaded event loop

### Sequential Pipeline (Not Parallel)

Layer 3 enforces strict sequential ordering:
```
Summarize → BRD → PRD → Stories → Tasks
```

Each stage reads the **output of the previous stage** as its input. This means:
- Can't generate BRD without a summary (`if not summary: raise ValueError(...)`)
- Can't generate PRD without a BRD ID (required route parameter)
- Can't generate stories without a PRD ID

This is a deliberate design — parallelizing would require merging outputs from multiple AI calls, which adds complexity without enough benefit.

---

## 12. Layer 3 Alternatives Considered

### Alternative: OpenAI GPT-4o

**Why not used**: OpenAI requires a separate billing account. Google Gemini shares the same credentials used for embeddings (`GOOGLE_API_KEY`). The free tier from Google AI Studio removes the need for any payment for development, which removes billing-related blockers for new contributors.

The architecture is intentionally model-agnostic — the `GeminiClient` abstraction means swapping to OpenAI requires only:
1. A new `OpenAIClient` class with the same interface
2. Updating `MODEL_MAPPING`
3. Zero changes to `generation_service.py` or `clustering_service.py`

---

### Alternative: LangChain for Pipeline Orchestration

**What it is**: LangChain provides "chains" and "agents" for orchestrating multi-step AI workflows.

**Why not used**:
- LangChain adds significant abstraction overhead for what is essentially a simple sequential pipeline.
- The "chains" concept would obscure the actual prompts and make debugging harder.
- ApeAI's prompt templates are explicit and versioned — LangChain's templating system would replace this with another abstraction layer.
- LangChain's frequent breaking API changes (v0.1 → v0.2 → v0.3) are a maintenance risk in production systems.

---

### Alternative: Fine-tuning Instead of Prompting

**What it is**: Training a custom model on (cluster, BRD) pairs to generate BRDs without prompts.

**Why not used**:
- Fine-tuning requires thousands of labeled (input, output) pairs to be effective.
- At ApeAI's current stage, there isn't enough historical data.
- Prompt engineering with JSON mode + strong schema examples achieves high-quality output immediately.
- Prompts can be iterated in minutes; fine-tuning runs take hours/days.

---

### Alternative: Streaming Responses

**What it is**: Using `stream=True` on Gemini calls to return tokens incrementally to the frontend.

**Why not used**:
- All Layer 3 outputs must be valid, complete JSON before they can be parsed with `json.loads()`. Streaming partial JSON would fail parsing.
- The frontend currently shows a loading spinner while waiting — there's no UI for streamed token display.
- Streaming adds complexity (SSE or WebSocket infrastructure) for little current benefit.

---

## 13. Layer 3 File Map

```
/home/Saurabh/apeai/
│
└── backend/
    └── app/
        ├── ai/
        │   ├── gemini_client.py           ← Singleton Gemini wrapper, model mapping, JSON mode
        │   │
        │   ├── prompts/
        │   │   ├── __init__.py            ← Re-exports all named prompt constants
        │   │   └── templates.py           ← All 5 prompt templates (summary, BRD, PRD, story, task)
        │   │
        │   └── services/
        │       ├── clustering_service.py  ← cluster_unprocessed_feedback(), classify_feedback(), fallback
        │       └── generation_service.py  ← summarize_cluster(), generate_brd/prd/stories/tasks()
        │
        └── routes/
            └── pipeline.py               ← All /pipeline/* HTTP endpoints
```

### File Responsibilities

| File | Responsibility |
|---|---|
| [`gemini_client.py`](file:///home/Saurabh/apeai/backend/app/ai/gemini_client.py) | Singleton client, model selection, JSON mode, async embedding helper |
| [`prompts/__init__.py`](file:///home/Saurabh/apeai/backend/app/ai/prompts/__init__.py) | Exports all prompt constants for clean service imports |
| [`prompts/templates.py`](file:///home/Saurabh/apeai/backend/app/ai/prompts/templates.py) | All 5 prompt strings — tunable without touching Python logic |
| [`clustering_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/clustering_service.py) | Main clustering orchestrator + fallback clustering |
| [`generation_service.py`](file:///home/Saurabh/apeai/backend/app/ai/services/generation_service.py) | All 5 document generation stages |
| [`routes/pipeline.py`](file:///home/Saurabh/apeai/backend/app/routes/pipeline.py) | HTTP route handlers that call clustering/generation services |

---

## 14. Layer 3 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/pipeline/cluster` | Cluster all unprocessed feedback (triggers embedding + vector matching) |
| `POST` | `/pipeline/summarize/{cluster_id}` | Generate AI title and summary for a cluster |
| `POST` | `/pipeline/generate-brd/{cluster_id}` | Generate Business Requirements Document |
| `POST` | `/pipeline/generate-prd/{cluster_id}?brd_id=` | Generate Product Requirements Document |
| `POST` | `/pipeline/generate-stories/{cluster_id}?prd_id=` | Generate Agile User Stories (returns array) |
| `POST` | `/pipeline/generate-tasks/{story_id}?cluster_id=` | Generate Technical Task Breakdown |

All endpoints return the created/updated data as JSON. Errors surface as `400` (invalid input, missing prerequisites) or `500` (AI generation failure).

---

## 15. Layer 3 in the Frontend

### Landing Page — Demo Step 3 (AI Document Generation)

**File**: `frontend/app/page.tsx` — `{stepIndex === 2}` section

Step 3 of the homepage's 4-step demo shows Layer 3 visually — animated cards of BRD, PRD, and Story documents being generated in real time with typewriter effects and AI "thinking" indicators.

### Pipeline Tracker (`/pipeline/[cluster_id]`)

**File**: [`frontend/app/pipeline/[cluster_id]/page.tsx`](file:///home/Saurabh/apeai/frontend/app/pipeline/%5Bcluster_id%5D/page.tsx)

This is the **primary Layer 3 operator interface**. It shows the sequential stepper for every generation stage:

| Step | Layer | Trigger | Detection |
|---|---|---|---|
| 1 — Feedback Clustered | L2 | Auto | Cluster exists |
| 2 — AI Cluster Summary | L3 | Button | `cluster.summary` not null |
| 3 — Business Requirements (BRD) | L3 | Button | `documents.find(d => d.type === 'brd')` |
| 4 — Product Requirements (PRD) | L3 | Button | `documents.find(d => d.type === 'prd')` |
| 5 — Agile User Stories | L3 | Button | `documents.find(d => d.type === 'story')` |
| 6 — Technical Task Breakdown | L3 | Button | `documents.find(d => d.type === 'task')` |

Each step button is disabled ("Waiting on previous steps...") until the upstream prerequisite is complete. When clicked, it fires the corresponding `api.triggerXXX()` call and shows a spinner until the AI returns.

### Review Workspace (`/review/[cluster_id]`)

**File**: [`frontend/app/review/text.tsx`](file:///home/Saurabh/apeai/frontend/app/review/text.tsx)

Layer 3's outputs (BRD, PRD, Story, Task) are displayed and edited here. Document content (JSONB) is rendered as formatted JSON in a monospace textarea. PMs can edit the AI output before approving.

---

# ═══════════════════════════════════════
# LAYER 4 — PUBLISHING & EXTERNAL INTEGRATIONS
# ═══════════════════════════════════════

## 16. What Is Layer 4?

**Layer 4 is ApeAI's output gate.** It takes approved documents (BRDs, PRDs, User Stories, Technical Tasks) from Layer 2's `documents` table and publishes them as tickets to external project management tools:

```
Approved Document (Layer 2)
  ↓
Universal Task Format (Layer 4 abstraction)
  ↓
Platform-Specific Mapper (Layer 4)
  ↓
GitHub Issues API  ─────────┐
Jira Cloud REST API ────────┼──→ External Ticket Created
Linear GraphQL API  ────────┘
  ↓
ticket_links row created (Layer 2 storage)
Document status → "published"
Cluster status → "tickets_created"
```

Layer 4's three non-negotiable rules:
1. **Only approved documents can be published** — enforced by `status != "approved"` check
2. **No duplicate publishing** — enforced by `ticket_links` table check
3. **Rollback on failure** — document status reverts to `"approved"` if publishing fails, allowing retry

---

## 17. The Universal Task Format — The Publishing Abstraction

**File**: [`backend/app/services/publish_service.py`](file:///home/Saurabh/apeai/backend/app/services/publish_service.py) — `to_universal_format()`

The most important concept in Layer 4 is the **Universal Task Format** — a flat, platform-agnostic dictionary that all three integration mappers accept as input:

```python
{
    "title": str,        # Single-line issue title
    "description": str,  # Full markdown-formatted body
    "priority": str,     # "Must Have" | "Should Have" | "Could Have" | "Medium"
    "labels": List[str], # e.g., ["user-story", "story"] or ["technical-task", "task"]
    "assignee": None     # Reserved for future use
}
```

This format is generated by `to_universal_format(doc)`:

**For Story documents**:
```python
description = f"{user_role}\n{req}\n{benefit}\n\n### Acceptance Criteria\n"
for ac in ac_list:
    description += f"- {ac}\n"

return {"title": ..., "description": ..., "priority": priority, "labels": ["user-story", "story"]}
```

**For Task documents**:
```python
description = f"**Story Ref:** {story_title}\n\n### Frontend Tasks\n"
for t in frontend_tasks:
    description += f"- [ ] {t}\n"
# + backend_tasks, testing_tasks, complexity, dependencies

return {"title": ..., "description": ..., "priority": "Medium", "labels": ["technical-task", "task"]}
```

**Why this abstraction?**

Without it, each integration's `client.py` would need to understand ApeAI's internal document JSONB structure. Adding a new integration (e.g., Notion) would require reading `doc.content.get("user_role")` inside the Notion client — creating tight coupling.

With the Universal Task Format:
- Each client only receives `{"title": ..., "description": ..., "labels": ...}` — clean and simple
- All platform-specific details (Jira ADF, Linear GraphQL, GitHub Issues) stay in the mapper/client

---

## 18. The `publish_document` Orchestrator — 9-Step Flow

**File**: [`backend/app/services/publish_service.py`](file:///home/Saurabh/apeai/backend/app/services/publish_service.py)

Every publishing call goes through this single function, regardless of target platform:

```
STEP 1: Fetch document from DB
  → 404 if not found

STEP 2: Fetch integration config from DB
  → 404 if not found

STEP 3: DUPLICATE CHECK
  → SELECT from ticket_links WHERE document_id = X AND integration_id = Y
  → If found: raise ValueError("Already published") → 400 error

STEP 4: HUMAN-IN-THE-LOOP CHECK
  → if doc["status"] != "approved": raise ValueError(...)
  → Only approved docs may be published

STEP 5: Log the attempt

STEP 6: Convert document to Universal Task Format
  → to_universal_format(doc)

STEP 7: Dispatch to platform-specific client
  → if integration["type"] == "github": publish_to_github(universal_task, integration)
  → if integration["type"] == "jira":   publish_to_jira(universal_task, integration)
  → if integration["type"] == "linear": publish_to_linear(universal_task, integration)

STEP 8: Create ticket_link row
  → create_ticket_link(document_id, integration_id, external_id, external_url)
  → This also flips cluster status → "tickets_created"

STEP 9: Update document status → "published"
  → Return {success: True, ticket_link: ..., external_url: ..., external_id: ...}

ON FAILURE (any exception in steps 6-9):
  → Reset document status back to "approved"  ← ROLLBACK
  → Re-raise the exception
```

The rollback pattern (Step 9 on failure) is critical — without it, a failed publish attempt would leave the document in a `"published"` state even though no ticket was created, blocking future retry attempts.

---

## 19. Integration: GitHub Issues

**Files**:
- [`backend/app/integrations/github/routes.py`](file:///home/Saurabh/apeai/backend/app/integrations/github/routes.py) — HTTP route
- [`backend/app/integrations/github/client.py`](file:///home/Saurabh/apeai/backend/app/integrations/github/client.py) — API call
- [`backend/app/integrations/github/mapper.py`](file:///home/Saurabh/apeai/backend/app/integrations/github/mapper.py) — Format conversion

### Configuration Required

| Field | Description | Example |
|---|---|---|
| `api_key` | GitHub Personal Access Token (classic) with `repo` scope | `ghp_xxxxx` |
| `project_id` | Repository in `owner/repo` format | `"myorg/myapp"` |
| `api_url` | GitHub API base (defaults to public GitHub) | `"https://api.github.com"` |

### Payload Mapping

```python
def map_to_github(task: dict) -> dict:
    labels = list(task.get("labels", []))
    if task.get("priority"):
        labels.append(f"priority:{task['priority']}")
    
    return {
        "title": task.get("title", "AI Task"),
        "body": task.get("description", ""),
        "labels": labels
    }
```

The description (markdown-formatted with checkbox task lists `- [ ]`) maps directly to GitHub Issues' body field, which renders markdown natively.

### API Call

```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        f"{api_url}/repos/{project_id}/issues",
        json=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    )
    # Expected: 201 Created
    data = response.json()
    return {
        "external_id": str(data["number"]),   # e.g., "104"
        "external_url": data["html_url"],      # e.g., "https://github.com/org/repo/issues/104"
        "external_status": data["state"]       # "open"
    }
```

**Auto-resolve integration**: If `integration_id` is not provided in the request, the route automatically queries for the first active GitHub integration:
```python
res = db.table("integrations").select("id").eq("type", "github").eq("is_active", True).limit(1).execute()
```

---

## 20. Integration: Jira Cloud

**Files**:
- [`backend/app/integrations/jira/routes.py`](file:///home/Saurabh/apeai/backend/app/integrations/jira/routes.py)
- [`backend/app/integrations/jira/client.py`](file:///home/Saurabh/apeai/backend/app/integrations/jira/client.py)
- [`backend/app/integrations/jira/mapper.py`](file:///home/Saurabh/apeai/backend/app/integrations/jira/mapper.py)

### Configuration Required

| Field | Description | Example |
|---|---|---|
| `api_key` | Jira API Token | `ATATT3xxxxx` |
| `project_id` | Jira Project Key | `"PROJ"` or `"APE"` |
| `api_url` | Jira Cloud instance URL | `"https://myorg.atlassian.net"` |
| `config.email` | Email of the Atlassian account | `"pm@company.com"` |

### The Atlassian Document Format (ADF)

Jira's REST API v3 does **not** accept plain markdown for description. It requires **ADF** — a structured JSON format:

```python
def map_to_jira(task: dict, project_key: str) -> dict:
    # Convert plain text description to ADF paragraph nodes
    content_nodes = []
    for line in description_text.split("\n"):
        if line.strip():
            content_nodes.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": line}]
            })
    
    return {
        "fields": {
            "project": {"key": project_key},
            "summary": task.get("title"),
            "description": {
                "type": "doc",
                "version": 1,
                "content": content_nodes   # ADF node tree
            },
            "issuetype": {"name": "Task"},
            "priority": {"name": priority_name},  # "High" | "Medium" | "Low"
            "labels": [label.replace(" ", "-") for label in task.get("labels", [])]
        }
    }
```

**Labels**: Jira doesn't accept spaces in labels — `"user story"` becomes `"user-story"`.

**Authentication**: Jira uses **Basic Auth** (email + API token), not Bearer token:
```python
auth = (email, api_key)  # httpx handles base64 encoding
response = await client.post(url, json=payload, auth=auth, headers=headers)
```

---

## 21. Integration: Linear

**Files**:
- [`backend/app/integrations/linear/routes.py`](file:///home/Saurabh/apeai/backend/app/integrations/linear/routes.py)
- [`backend/app/integrations/linear/client.py`](file:///home/Saurabh/apeai/backend/app/integrations/linear/client.py)
- [`backend/app/integrations/linear/mapper.py`](file:///home/Saurabh/apeai/backend/app/integrations/linear/mapper.py)

### Configuration Required

| Field | Description | Example |
|---|---|---|
| `api_key` | Linear Personal Access Token | `lin_api_xxxxx` |
| `project_id` | Linear Team ID (UUID) | `"a1b2c3d4-..."` |
| `api_url` | Linear GraphQL endpoint | `"https://api.linear.app/graphql"` |

### GraphQL Mutation

Linear uses **GraphQL**, not REST. The mutation for creating an issue is:

```graphql
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      url
    }
  }
}
```

### Priority Mapping

Linear uses integer priority codes (unlike Jira's string names):
```python
# ApeAI priority string → Linear priority integer
priority_map = {
    "high" / "must":   2,   # High
    "medium" / "should": 3, # Medium
    "low" / "could":   4,   # Low
    (unmatched):        0   # No priority
}
```

### The Mapper

```python
def map_to_linear(task: dict, team_id: str) -> dict:
    return {
        "input": {
            "title": task.get("title"),
            "description": task.get("description"),
            "teamId": team_id,
            "priority": priority_num
        }
    }
```

This wraps the payload in `"input"` because GraphQL mutations require named variable inputs.

### Error Handling

Linear returns HTTP 200 even for errors — the errors are in `data.errors`:
```python
if "errors" in data:
    raise RuntimeError(f"Linear API error: {data['errors'][0]['message']}")
result = data["data"]["issueCreate"]
if not result["success"]:
    raise RuntimeError("Linear issue creation did not succeed.")
```

---

## 22. Dry Run Mode

All three integrations support a **dry run mode** that simulates publishing without making any real API calls:

```python
config = integration.get("config", {}) or {}
if config.get("dry_run") is True:
    logger.info(f"[GitHub Dry Run] Would publish to {url}: {payload}")
    return {
        "external_id": "MOCK-GH-123",
        "external_url": f"https://github.com/{project_id}/issues/123",
        "external_status": "open"
    }
```

To enable: set `config.dry_run = true` when creating or updating an integration via `PATCH /integrations/{id}`.

**Why dry run matters**: 
- Validate the full publishing pipeline without creating real tickets in Jira/GitHub
- Useful for demo environments, CI/CD testing, and staging setups
- The ticket_links row IS still created with mock IDs — so the duplicate prevention system still works

---

## 23. Layer 4 Technology Stack

### httpx — Async HTTP Client

**Why httpx over requests?**
- `httpx` supports `async with httpx.AsyncClient()` — non-blocking HTTP calls that release the FastAPI event loop.
- Using the `requests` library (synchronous) would block the event loop for the duration of the Jira/GitHub API call (typically 200–2000ms).
- `httpx` has the same API as `requests` so there's no learning curve.

**Why not aiohttp?**
- `httpx` has a cleaner, more consistent API and better timeout/retry configuration.
- `httpx` is already a dependency (listed in `requirements.txt`) and is used elsewhere.

### FastAPI Lazy Integration Resolution

Both the GitHub and Jira routes implement **auto-resolution** of the active integration when `integration_id` is not provided:

```python
if not integration_id:
    res = db.table("integrations").select("id").eq("type", "github").eq("is_active", True).limit(1).execute()
    integration_id = res.data[0]["id"]
```

This is a UX convenience — the frontend can call `POST /publish/github/{doc_id}` without needing to know which integration UUID to use, and Layer 4 automatically selects the first active one.

---

## 24. Layer 4 Alternatives Considered

### Alternative: Zapier / Make for Integration

**Why not used**: No-code tools can't implement the duplicate-prevention logic, Universal Task Format translation, the rollback-on-failure pattern, or the `ticket_links` database updates. Control over the exact payload sent to Jira/GitHub is essential for formatting quality.

---

### Alternative: Webhooks (Outbound) Instead of Direct API Calls

**What it is**: On approval, fire a webhook to a third-party service (e.g., Zapier) that then creates the ticket.

**Why not used**:
- Webhook delivery is inherently async and unreliable (retries needed, timeouts, etc.)
- We lose direct control over the `external_id` and `external_url` returned
- Error handling becomes significantly more complex

---

### Alternative: GraphQL for All Integrations (Not Just Linear)

**Why not used**: GitHub and Jira have excellent, stable REST APIs. Using GraphQL for them would add complexity without benefit. Linear's REST API is incomplete for issue creation — GraphQL is Linear's first-class API.

---

### Alternative: Worker Queue for Publishing

**What it is**: Put publishing jobs into a Redis/Celery queue so they run in the background.

**Why not used**: Publishing a single document is fast (< 2s). The user expects to see the result immediately in the review workspace. Backgrounding it would require a polling or WebSocket mechanism to show success/failure, adding significant complexity for marginal gain.

---

## 25. Layer 4 File Map

```
/home/Saurabh/apeai/
│
└── backend/
    └── app/
        ├── services/
        │   └── publish_service.py              ← Orchestrator: to_universal_format(), publish_document()
        │
        └── integrations/
            ├── github/
            │   ├── __init__.py
            │   ├── routes.py                   ← POST /publish/github/{document_id}
            │   ├── client.py                   ← publish_to_github(): GitHub Issues REST API call
            │   └── mapper.py                   ← map_to_github(): Universal → GitHub format
            │
            ├── jira/
            │   ├── __init__.py
            │   ├── routes.py                   ← POST /publish/jira/{document_id}
            │   ├── client.py                   ← publish_to_jira(): Jira Cloud REST API v3 + ADF
            │   └── mapper.py                   ← map_to_jira(): Universal → ADF format
            │
            └── linear/
                ├── __init__.py
                ├── routes.py                   ← POST /publish/linear/{document_id}
                ├── client.py                   ← publish_to_linear(): Linear GraphQL mutation
                └── mapper.py                   ← map_to_linear(): Universal → GraphQL variables
```

### File Responsibilities

| File | Responsibility |
|---|---|
| [`publish_service.py`](file:///home/Saurabh/apeai/backend/app/services/publish_service.py) | 9-step orchestrator: fetch, validate, convert, dispatch, record, update |
| [`github/routes.py`](file:///home/Saurabh/apeai/backend/app/integrations/github/routes.py) | HTTP route: auto-resolves integration, calls publish_document() |
| [`github/client.py`](file:///home/Saurabh/apeai/backend/app/integrations/github/client.py) | REST call to GitHub Issues API, bearer auth, dry run support |
| [`github/mapper.py`](file:///home/Saurabh/apeai/backend/app/integrations/github/mapper.py) | Universal → `{title, body, labels}` (GitHub Issues format) |
| [`jira/routes.py`](file:///home/Saurabh/apeai/backend/app/integrations/jira/routes.py) | HTTP route: auto-resolves integration, calls publish_document() |
| [`jira/client.py`](file:///home/Saurabh/apeai/backend/app/integrations/jira/client.py) | REST call to Jira Cloud v3 API, basic auth (email+token) |
| [`jira/mapper.py`](file:///home/Saurabh/apeai/backend/app/integrations/jira/mapper.py) | Universal → Atlassian Document Format (ADF) |
| [`linear/routes.py`](file:///home/Saurabh/apeai/backend/app/integrations/linear/routes.py) | HTTP route: auto-resolves integration, calls publish_document() |
| [`linear/client.py`](file:///home/Saurabh/apeai/backend/app/integrations/linear/client.py) | GraphQL IssueCreate mutation, checks data.errors |
| [`linear/mapper.py`](file:///home/Saurabh/apeai/backend/app/integrations/linear/mapper.py) | Universal → GraphQL `input` variable with integer priority |

---

## 26. Layer 4 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/publish/github/{document_id}` | Publish approved doc to GitHub Issues |
| `POST` | `/publish/jira/{document_id}` | Publish approved doc to Jira Cloud |
| `POST` | `/publish/linear/{document_id}` | Publish approved doc to Linear |

All endpoints accept an optional `?integration_id=<uuid>` query parameter. If omitted, the first active integration of the matching type is used automatically.

**Error responses**:
- `400 Bad Request` — not approved, already published, or missing configuration
- `500 Internal Server Error` — upstream API failure (after rollback to `"approved"`)

---

## 27. Layer 4 in the Frontend

### Review Workspace — Publishing Toolbar

**File**: [`frontend/app/review/text.tsx`](file:///home/Saurabh/apeai/frontend/app/review/text.tsx)

The publishing toolbar appears **only when a document is in `approved`, `publishing`, `published`, or `failed` status**. It shows three icon buttons:

```tsx
{['approved', 'publishing', 'published', 'failed'].includes(activeDocument.status) && (
  <div className="flex items-center gap-2">
    <button onClick={() => handlePublish('github')}>
      <Github className="w-4 h-4" />   {/* GitHub icon */}
    </button>
    <button onClick={() => handlePublish('jira')}>
      JIRA
    </button>
    <button onClick={() => handlePublish('linear')}>
      LIN
    </button>
  </div>
)}
```

**What happens on click**:
1. `setPublishingPlatform('github')` → shows spinner on the button
2. `api.publishToGitHub(activeDocument.id)` → `POST /publish/github/{id}`
3. On success: toast "Successfully published to github!" → `loadData()` refreshes the document
4. On failure: toast with error message, reloads data (document reverts to `approved`)

**After successful publish**:
The footer of the review workspace shows the ticket link:
```tsx
{activeDocument.ticket_links && activeDocument.ticket_links.length > 0 && (
  <div className="bg-emerald-50 ...">
    <span>Published ticket:</span>
    <a href={activeDocument.ticket_links[0].external_url}>
      {activeDocument.ticket_links[0].external_id}  {/* e.g., "APE-82" */}
      <ExternalLink />
    </a>
  </div>
)}
```

### Frontend API Calls

**File**: [`frontend/services/api.ts`](file:///home/Saurabh/apeai/frontend/services/api.ts)

```typescript
// INTEGRATIONS & PUBLISHING (Layer 4)
async publishToGitHub(documentId: string, integrationId?: string): Promise<any> {
    const url = `/publish/github/${documentId}${integrationId ? `?integration_id=${integrationId}` : ''}`;
    return request<any>(url, { method: 'POST' });
},
async publishToJira(documentId: string, integrationId?: string): Promise<any> { ... },
async publishToLinear(documentId: string, integrationId?: string): Promise<any> { ... },

// Integration management
async getIntegrations(): Promise<{ integrations: Integration[] }>
async createIntegration(payload): Promise<Integration>
async deleteIntegration(integrationId: string): Promise<any>
```

All these calls include the JWT `Authorization: Bearer <token>` header (injected by the `request()` helper in `api.ts`).

---

# ═══════════════════════════════════════
# LAYER 5 — AUTHENTICATION & WORKSPACE ACCESS
# ═══════════════════════════════════════

## 28. What Is Layer 5?

**Layer 5 is the identity and access control layer of ApeAI.** It ensures that:
1. Only registered users can access the dashboard, pipeline, and review workspace
2. Every API call to the backend carries a verified identity
3. Clusters and configurations are scoped to the authenticated user

Layer 5 spans both the **frontend** (authentication UI, session management, route protection) and the **backend** (JWT verification, user-scoped queries).

It is the **outermost layer** — it wraps all other layers. Without a valid session, none of Layers 1–4 are accessible.

---

## 29. Supabase Auth — The Auth Provider

**Why Supabase Auth?**

Supabase provides a complete authentication system bundled with the database:
- **Email/password** with email verification
- **OAuth** (Google, GitHub, etc.) with one-click setup
- **JWT tokens** issued on login, verifiable on the backend without a separate auth service
- **Same SDK** already used for database (`supabase-py` on backend, `@supabase/ssr` on frontend)
- **Free tier** includes unlimited monthly active users

The auth system issues **JSON Web Tokens (JWT)**. Every JWT is signed with a secret that Supabase holds. The backend can verify any JWT without a network call — pure cryptographic verification using `client.auth.get_user(token)`.

### The Auth Token Flow

```
1. User logs in (frontend)
2. Supabase issues: { access_token, refresh_token, user }
3. access_token is a JWT signed by Supabase

4. Frontend stores session (supabase-js handles this automatically)
5. Before every API request:
   supabase.auth.getSession() → returns session.access_token
   → Added as: "Authorization: Bearer {access_token}"

6. Backend receives request
   → get_current_user() dependency extracts token
   → client.auth.get_user(token) verifies signature + expiry
   → Returns user.id (UUID)

7. user.id is used to scope database queries:
   → db.table("clusters").eq("user_id", user_id)
```

---

## 30. Frontend Authentication Flow

### Login Page

**File**: [`frontend/app/login/page.tsx`](file:///home/Saurabh/apeai/frontend/app/login/page.tsx)

**Email/Password Login**:
```typescript
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (!error) router.push('/dashboard');
```

**Google OAuth**:
```typescript
await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` }
});
```

OAuth redirects the user to Google's consent screen. On return, Supabase automatically exchanges the authorization code for a session and redirects to `/dashboard`.

**Already logged in guard**:
```tsx
const { user } = useAuth();
if (user) { router.push('/dashboard'); return null; }
```

---

### Signup Page

**File**: [`frontend/app/signup/page.tsx`](file:///home/Saurabh/apeai/frontend/app/signup/page.tsx)

**Registration**:
```typescript
const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: { dob: dob }  // Custom user metadata (date of birth)
    }
});
```

On success, Supabase sends a **verification email**. The user must click the link to activate their account. After signup, the page shows:
```tsx
{success && (
    <div>
        <CheckCircle2 />
        <p>Check your email! We've sent you a verification link.</p>
    </div>
)}
```

**Validation before submission**:
- Password === confirmPassword (client-side check)
- Date of birth required
- Email format validated by `<input type="email">`

**Google signup** redirects to `/complete-profile` (a profile completion page for social logins).

---

## 31. Backend JWT Verification

**File**: [`backend/app/core/auth.py`](file:///home/Saurabh/apeai/backend/app/core/auth.py)

The backend uses a **FastAPI dependency** to verify the JWT:

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials  # The JWT string
    
    try:
        client = get_supabase_client()
        user_response = client.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return user_response.user.id  # Returns UUID string
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
```

**How `HTTPBearer` works**:
- FastAPI's `HTTPBearer()` security scheme automatically looks for the `Authorization: Bearer <token>` header
- If the header is missing, it returns `403 Forbidden` before even calling the dependency
- If the token is present but invalid, `get_current_user` raises `401 Unauthorized`

**`client.auth.get_user(token)`**:
- Calls Supabase's auth verification API
- Validates the JWT signature and expiry
- Returns the full user object (including `user.id`)

---

## 32. AuthContext — Global Session State

**File**: [`frontend/components/AuthContext.tsx`](file:///home/Saurabh/apeai/frontend/components/AuthContext.tsx)

The `AuthContext` is a React context that holds the current user session and makes it available throughout the app without prop drilling:

```typescript
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
```

**`onAuthStateChange` listener** is the key — it fires on:
- Successful login (new session)
- Logout (`session = null`)
- Token refresh (Supabase auto-refreshes the access_token before expiry)
- OAuth callback return

This means any component using `useAuth()` automatically re-renders when the auth state changes — no polling needed.

---

## 33. Route Protection

**Three-layer protection model:**

### 1. Frontend Route Guard (immediate redirect)

In both `login/page.tsx` and `signup/page.tsx`:
```tsx
const { user } = useAuth();
if (user) { router.push('/dashboard'); return null; }
```

Logged-in users are redirected away from auth pages before rendering.

### 2. Dashboard/Page-level Guard

Protected pages check for the user session:
```tsx
const { user, loading } = useAuth();
if (loading) return <LoadingSpinner />;
if (!user) { router.push('/login'); return null; }
```

### 3. Backend API Guard (`Depends(get_current_user)`)

Write operations on clusters and stats endpoints require a valid JWT:
```python
@router.post("/", response_model=ClusterResponse)
async def api_create_cluster(
    data: ClusterCreate, 
    user_id: str = Depends(get_current_user)  ← JWT required
):
    cluster = await create_cluster(..., user_id=user_id)
```

The `user_id` returned by `get_current_user` is passed to `create_cluster()`, which stores it in the `clusters.user_id` column for data isolation.

---

## 34. Layer 5 Technology Stack

### Supabase Auth

**Why Supabase Auth specifically?**
- **No separate auth service**: Auth is bundled with the same Supabase project used for the database. One URL, one API key, one billing account.
- **JWT-based**: Tokens are cryptographically verifiable by the backend without storing sessions in a database or making network calls to a separate auth server.
- **Auto-refresh**: `supabase-js` automatically refreshes the `access_token` before it expires (by default, tokens expire after 1 hour), using the `refresh_token`.
- **Social OAuth built-in**: Google, GitHub, etc. require only enabling the provider in the Supabase dashboard — no OAuth app registration complexity on the backend.
- **Email verification**: Built-in email templates and verification flow.

---

### `HTTPBearer` (FastAPI Security)

**Why `HTTPBearer` instead of custom middleware?**
- `HTTPBearer` is a FastAPI first-class security scheme that integrates with OpenAPI — the `/docs` Swagger UI shows a "Authorize" button where you can paste a JWT.
- It reads the `Authorization: Bearer <token>` header automatically.
- As a `Depends()` dependency, it's composable — adding it to a route is one line, removing it is one line.
- It raises `403 Forbidden` (not `401`) if the header is entirely missing — the correct HTTP semantics for "this endpoint requires authentication credentials."

---

### `@supabase/ssr` — Frontend Auth Client

**Why `@supabase/ssr` over `@supabase/supabase-js`?**
- `@supabase/ssr` is designed for Next.js App Router (the modern Next.js architecture used in ApeAI).
- It correctly handles server-side rendering and cookie-based session storage (important for Next.js middleware-based route protection).
- It provides `createBrowserClient` for client components and `createServerClient` for server components.

---

## 35. Layer 5 Alternatives Considered

### Alternative: Auth0 / Clerk / Firebase Auth

**Why not used**:
- All require a **separate, external auth service** — a third billing account, a third set of environment variables, and a third source of failure.
- Supabase Auth is included for free in the same Supabase project already required for the database.
- Auth0's pricing scales with monthly active users — expensive at scale.
- None provide the same "same SDK for database AND auth" developer experience.

---

### Alternative: Sessions + Cookies (JWT-less)

**What it is**: Traditional session-based auth where a `session_id` cookie is set on login, and the server validates it against a sessions table on every request.

**Why not used**:
- Sessions require a `sessions` table in the database and a lookup on every authenticated request.
- JWTs are stateless — the backend verifies the cryptographic signature without any database query.
- Supabase Auth uses JWTs by default and the `supabase-py` client already provides `get_user()` for verification.

---

### Alternative: API Keys Instead of JWTs

**What it is**: Issue each user a static API key stored in a database table; require `X-API-Key: <key>` on every request.

**Why not used**:
- API keys don't expire — a leaked key is a permanent security risk.
- JWTs expire (1 hour default), limiting the damage window of a leaked token.
- API keys require a database lookup per request to validate.
- JWTs carry the user identity payload (user_id) directly — no lookup needed.

---

## 36. Layer 5 File Map

```
/home/Saurabh/apeai/
│
├── backend/
│   └── app/
│       └── core/
│           └── auth.py                      ← get_current_user() FastAPI dependency + HTTPBearer
│
└── frontend/
    ├── lib/
    │   └── supabase.ts                      ← createBrowserClient() singleton for frontend
    │
    ├── components/
    │   └── AuthContext.tsx                  ← AuthProvider, useAuth() hook, onAuthStateChange listener
    │
    └── app/
        ├── login/
        │   └── page.tsx                     ← Email/password + Google OAuth login form
        └── signup/
            └── page.tsx                     ← Registration form with email verification flow
```

### File Responsibilities

| File | Responsibility |
|---|---|
| [`backend/app/core/auth.py`](file:///home/Saurabh/apeai/backend/app/core/auth.py) | FastAPI dependency: extracts + verifies JWT from Authorization header |
| `frontend/lib/supabase.ts` | Browser Supabase client singleton (used by auth and API calls) |
| `frontend/components/AuthContext.tsx` | Global React auth state, session listener, `useAuth()` hook |
| [`frontend/app/login/page.tsx`](file:///home/Saurabh/apeai/frontend/app/login/page.tsx) | Login UI: email/password + Google OAuth, redirects on success |
| [`frontend/app/signup/page.tsx`](file:///home/Saurabh/apeai/frontend/app/signup/page.tsx) | Signup UI: registration form, email verification, date of birth |

---

## 37. Layer 5 in the Frontend

### `/login` — Login Page

**Features**:
- Email + password form with validation and loading state
- Google OAuth button (one-click sign-in via Google)
- Redirects to `/dashboard` on success
- Shows error messages for wrong credentials
- Redirects already-authenticated users away immediately

---

### `/signup` — Registration Page

**Features**:
- Email, password, confirm password, and date of birth fields
- Client-side password match validation
- `supabase.auth.signUp()` with custom metadata (`dob`)
- Post-submit success state: "Check your email!" with a `CheckCircle2` icon
- Google OAuth path redirects to `/complete-profile`
- Redirects already-authenticated users

---

### Auth State in the Dashboard

The `useAuth()` hook is used throughout the app:

```tsx
// In any dashboard component:
const { user, loading } = useAuth();

if (loading) return <Spinner />;
if (!user) { router.push('/login'); return null; }

// user.email, user.id available for display
```

The JWT is automatically included in all `api.*` calls:
```typescript
// In frontend/services/api.ts:
async function getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;  // The JWT
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // ...
}
```

Every `api.getClusters()`, `api.triggerBRD()`, `api.publishToGitHub()` etc. automatically includes the JWT without any component needing to think about it.

---

# ═══════════════════════════════════════
# COMBINED QUICK REFERENCE CARDS
# ═══════════════════════════════════════

## Layer 3 — AI Generation Pipeline

| Item | Value |
|---|---|
| Purpose | Generate BRD, PRD, Stories, Tasks from clusters using Gemini AI |
| AI model | `gemini-2.5-flash-lite` (both Flash and Pro currently) |
| JSON enforcement | `response_mime_type = "application/json"` |
| Clustering algo | Iterative similarity search via pgvector `match_feedback()` RPC |
| Thresholds | Bug: 0.90, Feature: 0.85, Default: 0.80 |
| Sequential order | Summarize → BRD → PRD → Stories → Tasks |
| Fallback clustering | Keyword-based when no embeddings exist |
| Entry point | `POST /pipeline/cluster` |
| Document types | `brd`, `prd`, `story`, `task` |
| Frontend UI | `/pipeline/[cluster_id]` stepper page |

## Layer 4 — Publishing & External Integrations

| Item | Value |
|---|---|
| Purpose | Publish approved docs to GitHub, Jira, and Linear |
| Abstraction | Universal Task Format — single format all mappers consume |
| Auth (GitHub) | Bearer token (PAT) |
| Auth (Jira) | Basic auth (email + API token) |
| Auth (Linear) | Bearer token (PAT) |
| Jira description format | Atlassian Document Format (ADF) — structured JSON |
| Linear API | GraphQL IssueCreate mutation |
| Duplicate prevention | ticket_links table check before publishing |
| Rollback on failure | Document status resets to "approved" |
| Dry run | `config.dry_run = true` on integration config |
| HTTP client | httpx (async) |
| Entry points | `POST /publish/{github,jira,linear}/{document_id}` |
| Frontend UI | `/review/[cluster_id]` publishing toolbar |

## Layer 5 — Authentication & Workspace Access

| Item | Value |
|---|---|
| Purpose | User identity, session management, API security |
| Auth provider | Supabase Auth |
| Token type | JWT (access_token, 1hr expiry; auto-refreshed) |
| Login methods | Email/password, Google OAuth |
| Email verification | Yes — Supabase sends verification email on signup |
| Backend verification | `client.auth.get_user(token)` — cryptographic JWT check |
| FastAPI integration | `HTTPBearer()` + `Depends(get_current_user)` |
| Frontend hook | `useAuth()` from `AuthContext` |
| Session persistence | Supabase-js handles session storage automatically |
| Frontend pages | `/login`, `/signup` |
| User data scoping | `user_id` stored in `clusters` table, filtered on read |
