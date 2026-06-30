# TicketAssist: An AI-Powered Multi-Agent System for Bug Ticket Resolution

---

**Project Report**

**Author:** Quang Dang Nguyen

**Date:** 30 June 2026

**Repository:** [github.com/danieop/ticketassist](https://github.com/danieop/ticketassist)

---

## Abstract

This report presents the design, implementation, and evaluation of **TicketAssist**, a prototype system that assists software developers in resolving bug tickets through a sequential multi-agent AI workflow. The system employs six specialised AI agents — orchestrated via LangGraph — that collaboratively analyse bug reports, classify priority, search relevant code, extract context, propose fixes, and generate mentor-review drafts. The architecture follows a three-tier model comprising a Next.js frontend, an Express/TypeScript backend, and a PostgreSQL database enhanced with pgvector for semantic code search. A human-in-the-loop design ensures that no automated code modifications or customer responses are made without explicit developer and mentor approval. End-to-end testing with Playwright validates authentication, role-based access control, workflow state transitions, notification delivery, and repository upload. An evaluation benchmarks system with 15 test cases measures retrieval precision, hallucination rate, proposal quality, and priority accuracy. The project was developed over a four-week sprint (June 2026) and demonstrates that a modular multi-agent approach, combined with hybrid keyword–vector code search, can meaningfully accelerate the bug triage and resolution workflow while maintaining human oversight.

---

## Acknowledgements

I would like to thank **Lê Hà An** for the collaborative development effort on the frontend interface, authentication system, and UI/UX refinements throughout this project. I also gratefully acknowledge the guidance and mentorship provided by the project supervisors who defined the sequential multi-agent workflow requirements and provided the sample codebase for evaluation.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Literature Review](#2-literature-review)
3. [Requirements and Specification](#3-requirements-and-specification)
4. [System Architecture](#4-system-architecture)
5. [Implementation](#5-implementation)
6. [Testing and Evaluation](#6-testing-and-evaluation)
7. [Results and Discussion](#7-results-and-discussion)
8. [Conclusions and Future Work](#8-conclusions-and-future-work)
9. [References](#9-references)
10. [Appendices](#10-appendices)

---

## 1. Introduction

### 1.1 Problem Statement

Software development teams handling customer-facing products routinely manage large volumes of bug tickets. Each ticket requires developers to: (a) understand the reported issue, (b) assess its severity, (c) locate relevant source code, (d) analyse the root cause, (e) propose a fix, and (f) communicate findings to senior reviewers. This process is time-consuming, context-heavy, and prone to inconsistency — particularly for junior developers or interns who may lack deep familiarity with the codebase.

### 1.2 Project Objectives

TicketAssist aims to accelerate this workflow by deploying a **sequential multi-agent AI pipeline** that automates the analytical and preparatory stages of bug resolution. The core objectives are:

1. **Modular agent design**: Decompose the resolution process into discrete, auditable steps rather than a single monolithic prompt.
2. **Codebase-aware search**: Index and search source code repositories using hybrid keyword–vector retrieval without sending entire repositories to the AI model.
3. **Human-in-the-loop**: Ensure that the system produces *analysis and drafts* only — never modifying code, sending customer responses, or concluding that a bug is resolved.
4. **Role-based collaboration**: Support Developer, Mentor, and Admin roles with appropriate access controls and review workflows.
5. **Measurable quality**: Provide an evaluation framework to benchmark retrieval precision, hallucination rates, and proposal quality.

### 1.3 Scope

The system is a prototype/proof-of-concept internal tool for software teams. It processes bug tickets through six AI agents, produces a mentor-review draft, and supports a full review lifecycle (approve, reject, request more information). The sample codebase used for demonstration and evaluation is a Java/JSP e-commerce application (CardSeller).

### 1.4 Report Structure

The remainder of this report is organised as follows: Section 2 reviews related work; Section 3 details requirements; Section 4 presents the system architecture; Section 5 describes the implementation; Section 6 covers testing and evaluation; Section 7 discusses results; and Section 8 concludes with future work.

---

## 2. Literature Review

### 2.1 Large Language Models in Software Engineering

Recent advances in Large Language Models (LLMs) such as GPT-4, Claude, and Codex have demonstrated significant capabilities in code understanding, generation, and bug localisation. Tools like GitHub Copilot and Cursor leverage these models for inline code suggestions. However, applying a single LLM prompt to the entire bug resolution process presents challenges: context window limitations, hallucination risks, and lack of auditability in the reasoning chain.

### 2.2 Multi-Agent Systems

The multi-agent paradigm addresses single-prompt limitations by decomposing complex tasks into specialised sub-tasks handled by dedicated agents. Frameworks such as **LangChain**, **LangGraph**, **AutoGen**, and **CrewAI** provide orchestration primitives for building agent pipelines. LangGraph, in particular, offers a `StateGraph` abstraction that models workflows as directed graphs with typed state channels — enabling both sequential and parallel execution patterns.

### 2.3 Code Search and Retrieval

Traditional code search relies on keyword matching (grep-style), which fails to capture semantic relationships. Modern approaches combine:

- **Embedding-based retrieval**: Code snippets are embedded into vector space using models like `text-embedding-3-small`, enabling semantic similarity search.
- **Hybrid retrieval**: Combining keyword search (e.g., PostgreSQL trigram matching and full-text search) with vector similarity search (e.g., pgvector cosine distance) through fusion techniques such as Reciprocal Rank Fusion (RRF).
- **Chunking strategies**: AST-aware chunking preserves code structure boundaries (classes, methods, functions), while sliding-window chunking provides coverage for files without recognisable structure.

### 2.4 Human-in-the-Loop AI Systems

Research consistently shows that AI systems in high-stakes domains benefit from human oversight. The "human-in-the-loop" pattern ensures that AI outputs are reviewed by domain experts before being acted upon, reducing the risk of hallucinated fixes or incorrect prioritisations. TicketAssist adopts this philosophy by mandating developer confirmation and mentor review before any workflow output is considered final.

### 2.5 Evaluation of AI Code Assistants

Evaluating AI-generated code analysis requires multi-dimensional metrics beyond simple accuracy. Established evaluation dimensions include retrieval precision/recall, hallucination detection, proposal structural completeness, and concept coverage. The RAGAS framework and similar benchmarking approaches provide structured methodologies for assessing retrieval-augmented generation systems.

---

## 3. Requirements and Specification

### 3.1 Functional Requirements

The project brief mandated the following functional requirements:

| ID | Requirement | Status |
|----|-------------|--------|
| FR-01 | Sequential multi-agent workflow (not a single monolithic prompt) | ✅ Implemented |
| FR-02 | System must not send entire repository to AI model | ✅ Implemented |
| FR-03 | System must not automatically modify source code | ✅ Implemented |
| FR-04 | System must not automatically send customer responses | ✅ Implemented |
| FR-05 | System must not conclude that a bug is resolved | ✅ Implemented |
| FR-06 | Final output is analysis + draft for mentor review | ✅ Implemented |
| FR-07 | Ticket intake and management (CRUD) | ✅ Implemented |
| FR-08 | Repository upload and indexing for code search | ✅ Implemented |
| FR-09 | Role-based access control (Developer, Mentor, Admin) | ✅ Implemented |
| FR-10 | Mentor review workflow (approve/reject/request changes) | ✅ Implemented |

### 3.2 Non-Functional Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-01 | Resilient to LLM provider failures (deterministic fallbacks) | ✅ Implemented |
| NFR-02 | Auditable workflow traces and agent logs | ✅ Implemented |
| NFR-03 | Secure API with JWT authentication | ✅ Implemented |
| NFR-04 | Real-time notifications for workflow events | ✅ Implemented |
| NFR-05 | Evaluation benchmarks for AI quality | ✅ Implemented |

### 3.3 Use Cases

The system defines three primary actors:

- **Developer/Intern**: Creates tickets, uploads repositories, runs workflows, reviews agent outputs (accept/rerun/edit), and submits drafts for mentor review.
- **Mentor**: Reviews submitted drafts, approves, rejects, or requests more information.
- **Admin**: Manages users, approves registration requests, and has full system access.

The use case model encompasses five packages: Ticket Intake, Repository Intake, Workflow Execution (including all six agents), Monitoring, and Mentor Review.

### 3.4 Deliverables

All deliverables specified in the project brief have been completed:

- ✅ Source code on GitHub
- ✅ README with setup instructions
- ✅ Architecture documentation
- ✅ Workflow state documentation
- ✅ Agent descriptions
- ✅ Orchestrator description
- ✅ Code search strategy documentation
- ✅ Error handling documentation
- ✅ User testing guide
- ✅ Limitations list
- ✅ Future development recommendations

---

## 4. System Architecture

### 4.1 High-Level Architecture

TicketAssist follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                         │
│          Next.js 15 + React + TypeScript            │
│     Pages: Login, Developer, Mentor, Admin,         │
│            Tickets, Codebase, Eval Dashboard        │
└─────────────────┬───────────────────────────────────┘
                  │ REST API (JWT Bearer Token)
┌─────────────────▼───────────────────────────────────┐
│                    Backend                          │
│          Express + TypeScript + LangGraph           │
│     Modules: Routes, Agents, Workflow, Services,    │
│              Middleware, Evaluation                  │
└─────────────────┬───────────────────────────────────┘
                  │ Prisma ORM + Raw SQL (pgvector)
┌─────────────────▼───────────────────────────────────┐
│                   Database                          │
│          PostgreSQL + pgvector Extension            │
│     Tables: User, Ticket, Workflow, WorkflowStep,   │
│     Agent, Notification, WorkflowJob, CodeChunk,    │
│     TicketEmbedding                                 │
└─────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15, React, TypeScript | Server-side rendered UI with role-based dashboards |
| Backend | Express, TypeScript | REST API server with JWT authentication |
| Orchestration | LangGraph JS (`@langchain/langgraph`) | Sequential/parallel agent workflow graph |
| AI Provider | OpenAI-compatible API | Chat completions for agents, embeddings for search |
| Database | PostgreSQL + Prisma ORM | Relational data storage and migrations |
| Vector Search | pgvector extension | Cosine similarity search over code embeddings |
| File Storage | Local filesystem / SFTP | Repository file storage |
| Testing | Playwright | End-to-end API and integration testing |

### 4.3 Entity-Relationship Model

The database comprises the following core entities and their relationships:

```mermaid
erDiagram
    USER ||--o{ TICKET : creates
    TICKET ||--o{ WORKFLOW_RUN : starts
    WORKFLOW_RUN ||--|| WORKFLOW_STATE : owns
    WORKFLOW_RUN ||--o{ AGENT_RUN : contains
    AGENT ||--o{ AGENT_RUN : executes
    WORKFLOW_RUN ||--o{ TRACE_LOG : records
    WORKFLOW_RUN ||--o{ REPO_SEARCH_RESULT : produces
    WORKFLOW_RUN ||--o| MENTOR_REVIEW : receives
    USER ||--o{ MENTOR_REVIEW : reviews

    USER {
        string id PK
        string name
        string email
        string role
        string status
    }

    TICKET {
        string id PK
        string title
        string description
        string reporterName
        string source
        datetime createdAt
    }

    WORKFLOW_RUN {
        string id PK
        string ticketId FK
        string status
        datetime startedAt
        datetime finishedAt
        string currentAgent
    }

    WORKFLOW_STATE {
        string id PK
        string workflowRunId FK
        json ticketAnalysis
        json priorityClassification
        json repoSearchResults
        json codeContext
        json fixProposal
        json mentorDraft
    }

    AGENT {
        string id PK
        string name
        string type
        int executionOrder
    }
```

Additional pgvector-backed tables:

- **`code_chunks`**: Stores indexed code snippets with 1536-dimensional embeddings for semantic search.
- **`ticket_embeddings`**: Stores ticket text embeddings for similar-ticket memory retrieval.

### 4.4 Workflow State Machine

The workflow progresses through a defined set of states:

```
PENDING → RUNNING → COMPLETED → SUBMITTED → MENTOR_REVIEWED
                  → FAILED
```

Detailed status flow during agent execution:

```
created → ticket_analyzed → priority_classified → repo_searched
        → code_context_ready → fix_proposed → mentor_draft_ready
        → waiting_for_review (after developer confirmation)
        → reviewed (after mentor decision)
```

### 4.5 Agent Pipeline

The six-agent sequential pipeline, orchestrated via LangGraph `StateGraph`:

```
START
  → TicketAnalyzerAgent
  → [PriorityClassifierAgent ∥ RepoSearchAgent]  (parallel)
  → CodeContextAgent
  → FixProposalAgent
  → MentorDraftAgent
  → END
```

Each agent:
1. Reads from the shared workflow state
2. Calls the AI provider with a specialised prompt
3. Validates the response with Zod schemas
4. Falls back to deterministic logic if the AI call fails
5. Saves output to a `WorkflowStep` record in the database
6. Appends trace entries for auditability

---

## 5. Implementation

### 5.1 Backend Implementation

#### 5.1.1 Server and Routing

The backend is an Express.js server (`backend/src/index.ts`) exposing RESTful API endpoints organised by domain:

| Route Group | Base Path | Key Endpoints |
|-------------|-----------|---------------|
| Authentication | `/api/auth` | `POST /register`, `POST /login`, `POST /refresh` |
| Users | `/api/users` | `GET /`, `PATCH /:id/role`, `PATCH /:id/status` |
| Tickets | `/api/tickets` | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| Workflows | `/api/workflows` | `POST /`, `GET /`, `GET /:id`, `POST /:id/accept`, `POST /:id/rerun`, `POST /:id/edit`, `POST /:id/submit-review`, `POST /:id/mentor-review` |
| Repositories | `/api/repositories` | `POST /upload`, `GET /`, `GET /:id/files`, `GET /:id/tree` |
| Notifications | `/api/notifications` | `GET /`, `GET /stream` (SSE), `PATCH /:id/read`, `POST /mark-all-read` |
| Evaluation | `/api/eval` | `GET /summary`, `GET /agents`, `GET /workflows/:id` |

#### 5.1.2 Authentication and Authorisation

- **JWT-based authentication** with access tokens (3-day expiry) and refresh tokens (30-day expiry).
- **Registration approval workflow**: New users register with `PENDING` status; Admin approves before they can log in.
- **Role-based access control**: Middleware guards enforce Developer, Mentor, and Admin permissions per endpoint.

#### 5.1.3 AI Agent Implementation

Each agent follows a consistent pattern:

```typescript
// Pseudocode for agent pattern
async function agentNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  // 1. Validate prerequisites
  if (!state.requiredPreviousOutput) throw new Error("Missing prerequisite");

  // 2. Construct specialised prompt
  const prompt = buildPrompt(state);

  // 3. Call AI provider
  try {
    const response = await aiClient.chat(prompt);
    const parsed = zodSchema.parse(JSON.parse(response));
    return { agentOutput: parsed, status: "next_status" };
  } catch {
    // 4. Deterministic fallback
    return { agentOutput: deterministicFallback(state), status: "next_status" };
  }
}
```

**Agent Details:**

| # | Agent | Model | Input | Output | Fallback |
|---|-------|-------|-------|--------|----------|
| 1 | TicketAnalyzerAgent | gpt-4.1-mini | Raw ticket text | `{ summary, keyFacts, affectedFeature, suspectedFlow, missingInfo }` | Keyword extraction + domain term matching |
| 2 | PriorityClassifierAgent | gpt-4.1-mini | Ticket + analysis | `{ level, reason, confidence, severity, businessImpact }` | Rule-based keyword scoring (critical/high/medium/low signals) |
| 3 | RepoSearchAgent | — | Analysis + priority + repo config | `{ results[], strategy, warnings }` | Keyword-only file search |
| 4 | CodeContextAgent | gpt-4.1-mini | Search results | `{ relevantFiles[], riskNotes }` | Top-ranked search results selection |
| 5 | FixProposalAgent | gpt-4.1-mini | Code context | `{ hypotheses, approach, risks, verificationSteps }` | Constrained template-based proposal |
| 6 | MentorDraftAgent | gpt-4.1-mini | All prior outputs | `{ summary, checklist, recommendation }` | Concatenated prior outputs with template |

#### 5.1.4 Repository Indexing and Code Search

**Indexing Pipeline:**

```
Repository Upload → File Extraction → Denylist Filtering → Chunking → Embedding → pgvector Storage
```

- **Denylist filtering**: Skips `node_modules`, `.git`, `dist`, `build`, `.next`, `target`, `coverage`, binary files, and files over 500 KB.
- **Chunking**: Structure-aware chunking (AST boundaries for Java/JSP, statement boundaries for SQL, heading boundaries for Markdown) with fallback to sliding-window (120 lines, 15-line overlap). Structured chunks use 96-line cap with 18-line overlap.
- **Embedding**: `text-embedding-3-small` model producing 1536-dimensional vectors.
- **Current index**: 413 embedded chunks from the CardSeller sample repository.

**Hybrid Search:**

```
┌──────────────┐     ┌───────────────┐
│ Keyword      │     │ Vector        │
│ Search       │     │ Search        │
│ (trigram +   │     │ (pgvector     │
│  ts_vector)  │     │  cosine)      │
└──────┬───────┘     └───────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
          ┌───────▼───────┐
          │ Reciprocal    │
          │ Rank Fusion   │
          │ + Dedup       │
          └───────┬───────┘
                  │
          ┌───────▼───────┐
          │ Top-K Results │
          └───────────────┘
```

Three search strategies are available: `keyword`, `vector`, and `hybrid` (default).

#### 5.1.5 Similar Ticket Memory

The system embeds ticket text (title + description) and stores it in the `ticket_embeddings` table. When a new workflow is created, the system retrieves the top-k most similar past tickets and their workflow results, providing additional context to agents for improved analysis.

#### 5.1.6 Job Queue

A persistent database-backed job queue (`WorkflowJob` table) manages workflow execution with:
- Priority-based scheduling
- Configurable retry logic with max attempts
- Polling interval with backoff
- Concurrent job limits
- Dead-letter handling for permanently failed jobs

#### 5.1.7 Real-Time Notifications

Server-Sent Events (SSE) deliver real-time notifications to connected clients:
- Workflow completion notifications to developers
- Review submission notifications to mentors
- Mark-as-read and batch-read operations

### 5.2 Frontend Implementation

#### 5.2.1 Page Architecture

The frontend uses Next.js 15 App Router with role-specific pages:

| Page | Path | Role | Functionality |
|------|------|------|---------------|
| Gateway | `/` | All | Landing page with role-based redirect |
| Login | `/login` | Public | JWT authentication |
| Register | `/register` | Public | New user registration |
| Developer | `/developer` | Developer | Workflow creation, agent output review, submission |
| Mentor | `/mentor` | Mentor | Review queue, approve/reject/request changes |
| Admin | `/admin` | Admin | User management, registration approval |
| Tickets | `/tickets` | Authenticated | Ticket CRUD operations |
| Codebase | `/codebase` | Authenticated | Repository upload and file browsing |

#### 5.2.2 Middleware

The `middleware.ts` intercepts all routes to:
1. Verify JWT access tokens from cookies
2. Redirect unauthenticated users to `/login`
3. Enforce role-based routing (e.g., prevent developers from accessing `/admin`)

#### 5.2.3 Key Components

- **NotificationBell**: SSE-powered real-time notification dropdown with unread count badge
- **WorkflowDetail**: Detailed workflow view with per-agent step cards showing output, status, and action buttons (accept/rerun/edit)
- **MentorReviewPanel**: Review interface with approve/reject/request-changes actions
- **EvalDashboard**: AI quality evaluation dashboard with per-agent accuracy charts and drill-down views
- **RepoBrowser**: File tree browser for uploaded repositories

### 5.3 Development Process

#### 5.3.1 Team and Timeline

| Member | Primary Responsibilities |
|--------|------------------------|
| Quang Dang Nguyen | Backend architecture, AI agents, workflow orchestration, code search, evaluation benchmarks, testing, database design |
| Lê Hà An | Frontend UI/UX, authentication pages, workflow review components, admin interface, component styling |

**Development timeline** (June 2026):

| Week | Key Milestones |
|------|---------------|
| Week 1 (1–7 Jun) | Initial setup, ERD, use cases, backend skeleton, frontend base, ticket CRUD, first 3 agents, basic UI |
| Week 2 (8–14 Jun) | Repository indexing, hybrid search, chunking improvements, workflow UI refinements, async execution, auth hardening |
| Week 3 (15–21 Jun) | Evaluation dashboard, SSE notifications, persistent job queue, file indexing refactor, Playwright tests |
| Week 4 (22–30 Jun) | Evaluation benchmarks system, similar ticket memory (pgvector), final documentation, integration testing |

#### 5.3.2 Version Control

The project used Git with a branching strategy:
- **`main`** branch for stable releases
- **`haan`** branch for frontend development (Lê Hà An)
- **`dang`** branch for backend development (Quang Dang Nguyen)
- **24 pull requests** merged over the project duration
- **72 commits** from 2 contributors

---

## 6. Testing and Evaluation

### 6.1 End-to-End Testing

The project uses **Playwright** for hybrid E2E and API integration testing. The test suite comprises **~69 test cases** across six specification files:

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `auth.spec.ts` | 12 | Registration lifecycle, login, token refresh, auth guards |
| `role-guards.spec.ts` | ~20 | RBAC enforcement across all API endpoints for Developer, Mentor, Admin |
| `workflow-transitions.spec.ts` | ~10 | Full 6-agent pipeline, state machine transitions, edit/rerun/submit/review |
| `repo-upload.spec.ts` | 7 | Repository upload, listing, file tree, file content, auth/role checks |
| `notifications.spec.ts` | 8 | Notification API, SSE stream, mark-as-read, UI bell |
| `full-workflow-notifications.spec.ts` | 12 | Multi-user workflow + notification integration |

**Test infrastructure:**
- Auto-starts both backend and frontend dev servers
- Serial execution (1 worker) to prevent state conflicts
- Separate browser contexts for multi-user scenarios
- Polling-based workflow status checks with configurable timeouts (up to 360 seconds)
- Per-test user creation with cleanup

### 6.2 AI Quality Evaluation Benchmarks

The evaluation system measures AI output quality across four dimensions using **15 test cases** based on the CardSeller Java/JSP codebase:

#### 6.2.1 Retrieval Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Precision | \|returned ∩ expected\| / \|returned\| | ≥ 0.60 |
| Recall | \|returned ∩ mustInclude\| / \|mustInclude\| | ≥ 0.70 |
| F1 Score | 2 × (P × R) / (P + R) | ≥ 0.65 |
| MRR | 1 / rank of first relevant result | ≥ 0.70 |

#### 6.2.2 Hallucination Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Fabricated File Rate | fabricated files / total returned files | ≤ 0.05 |
| Overall Hallucination Rate | 0.50 × fabricatedFileRate + 0.30 × prohibitedClaimRate + 0.20 × fabricatedSnippetRate | ≤ 0.10 |

#### 6.2.3 Proposal Quality Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Concept Coverage | mentioned concepts / expected concepts | ≥ 0.60 |
| Structural Score | present fields / 4 required fields | ≥ 0.75 |
| Overall Score | 0.40 × conceptCoverage + 0.30 × structuralScore + 0.15 × approachValidity + 0.15 × aiConfidence | ≥ 0.60 |

#### 6.2.4 Priority Accuracy

| Metric | Formula | Target |
|--------|---------|--------|
| Accuracy | exact matches / total cases | ≥ 0.80 |
| Acceptable Rate | acceptable matches / total cases | ≥ 0.90 |

#### 6.2.5 Evaluation Test Cases

The 15 evaluation cases span three difficulty levels and four categories:

| Category | Easy | Medium | Hard | Total |
|----------|------|--------|------|-------|
| Retrieval | 4 | 3 | 1 | 8 |
| Proposal | — | 1 | 1 | 2 |
| Hallucination | — | 2 | — | 2 |
| End-to-End | — | — | 2 | 2 |
| **Total** | **4** | **6** | **4** | **15** |

### 6.3 Workflow Validation

The full workflow pipeline has been validated through service-layer testing:

```
Hybrid Test Result:
  Status: mentor_draft_ready
  Agents: All 6 succeeded
  Trace entries: 12
  Search results: 10
  Indexed chunks: 413
  Embedding model: text-embedding-3-small
  Warnings: []
```

---

## 7. Results and Discussion

### 7.1 Functional Achievement

All core functional requirements have been met:

1. **Multi-agent decomposition**: The system successfully decomposes bug resolution into six discrete, auditable agent steps rather than relying on a single monolithic prompt.
2. **Codebase-aware search**: The hybrid keyword–vector search successfully retrieves relevant code snippets without sending entire repositories to the AI model. The pgvector index of 413 chunks with 1536-dimensional embeddings provides meaningful semantic retrieval.
3. **Human-in-the-loop**: The system strictly adheres to the constraint that it produces analysis and drafts only. No code modifications or customer responses are automated.
4. **Role-based collaboration**: The RBAC system correctly enforces role boundaries, as validated by 20+ role-guard test cases.
5. **Evaluation framework**: The 15-case benchmark system provides quantitative measures of retrieval quality, hallucination rates, and proposal completeness.

### 7.2 Architectural Strengths

- **Modularity**: Each agent is independently testable, replaceable, and configurable (model, prompts, fallback logic).
- **Resilience**: Deterministic fallbacks ensure the system remains functional even without an LLM API key, enabling local demo and testing scenarios.
- **Auditability**: Every agent execution produces trace entries, enabling debugging and quality analysis.
- **Parallelism**: PriorityClassifierAgent and RepoSearchAgent execute in parallel, reducing overall workflow latency.
- **Persistence**: The DB-backed job queue ensures workflow jobs survive server restarts, with retry logic and dead-letter handling.

### 7.3 Known Limitations

1. **Chunking granularity**: Code chunking is primarily line-based with heuristic structure detection, not full AST parsing. This means some chunks may split code across logical boundaries.
2. **Search ranking**: Hybrid ranking uses simple score normalisation and Reciprocal Rank Fusion. More sophisticated re-ranking (e.g., cross-encoder models) could improve precision.
3. **No automated code application**: By design, the system does not create pull requests, apply patches, or run test suites. This limits end-to-end automation but preserves safety.
4. **Dependency analysis**: The dependency graph is inferred from layer/path/symbol conventions rather than static analysis, which may miss non-obvious dependencies.
5. **Unit test coverage**: The project relies on E2E API tests; unit tests for individual services and agents are not present.

### 7.4 Development Insights

- **Parallel agent execution** (PriorityClassifier ∥ RepoSearch) reduced perceived latency without introducing state conflicts.
- **Denylist-based file filtering** proved more maintainable than whitelist-based approaches as new file types were encountered.
- **Server-Sent Events** provided a lightweight real-time notification mechanism without the complexity of WebSocket infrastructure.
- **Zod schema validation** at agent output boundaries caught malformed AI responses before they propagated through the workflow.

---

## 8. Conclusions and Future Work

### 8.1 Conclusions

TicketAssist demonstrates that a modular, multi-agent approach to bug ticket resolution is both feasible and beneficial. The sequential pipeline — with parallel optimisation for independent agents — provides a structured, auditable process that enhances developer productivity while maintaining human oversight. The hybrid keyword–vector code search, backed by pgvector, delivers meaningful code retrieval without requiring the entire codebase to be sent to an LLM. The evaluation benchmarks system provides a foundation for ongoing quality measurement and improvement.

The prototype successfully meets all project requirements: sequential multi-agent workflow, codebase-aware search, human-in-the-loop design, role-based access control, and comprehensive documentation. The 69-test E2E suite and 15-case evaluation benchmark provide confidence in system correctness and AI quality.

### 8.2 Future Work

The following enhancements are recommended for future development:

1. **AST-based code chunking**: Integrate tree-sitter or similar parsers for Java, TypeScript, Python, and JavaScript to produce semantically meaningful code chunks aligned with class/method boundaries.
2. **Cross-encoder re-ranking**: Replace simple RRF with a cross-encoder model to improve search result relevance.
3. **Redis/BullMQ job queue**: Migrate from DB-based polling to a dedicated job queue for better throughput, retry semantics, and observability.
4. **CI/CD pipeline**: Add automated testing and deployment via GitHub Actions.
5. **Jira/GitHub integration**: Enable export of approved mentor reviews as Jira comments or GitHub issue updates.
6. **PR generation**: After mentor approval, optionally generate pull request drafts with proposed fixes (still requiring human merge approval).
7. **Unit test coverage**: Add unit tests for individual agents, services, and utility functions.
8. **Multi-repository support**: Enable cross-repository search for microservice architectures.
9. **Fine-tuned models**: Explore fine-tuning embedding and completion models on domain-specific codebases for improved retrieval and analysis quality.
10. **WebSocket migration**: Replace SSE with WebSocket for bidirectional real-time communication.

---

## 9. References

1. LangChain. *LangGraph: Build Stateful Multi-Agent Applications*. https://langchain-ai.github.io/langgraphjs/
2. OpenAI. *Text Embedding Models*. https://platform.openai.com/docs/guides/embeddings
3. pgvector. *Open-Source Vector Similarity Search for PostgreSQL*. https://github.com/pgvector/pgvector
4. Prisma. *Next-Generation ORM for Node.js and TypeScript*. https://www.prisma.io/
5. Next.js. *The React Framework for the Web*. https://nextjs.org/
6. Playwright. *Reliable End-to-End Testing for Modern Web Apps*. https://playwright.dev/
7. Robertson, S. & Zaragoza, H. *The Probabilistic Relevance Framework: BM25 and Beyond*. Foundations and Trends in Information Retrieval, 2009.
8. Cormack, G. V., Clarke, C. L. A., & Buettcher, S. *Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods*. SIGIR 2009.
9. Vaswani, A. et al. *Attention Is All You Need*. NeurIPS 2017.
10. Chen, M. et al. *Evaluating Large Language Models Trained on Code*. arXiv:2107.03374, 2021.
11. Es, S. et al. *RAGAS: Automated Evaluation of Retrieval Augmented Generation*. arXiv:2309.15217, 2023.

---

## 10. Appendices

### Appendix A: API Endpoint Reference

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/register` | — | — | Register new user |
| POST | `/api/auth/login` | — | — | Login and receive tokens |
| POST | `/api/auth/refresh` | — | — | Refresh access token |
| GET | `/api/users` | ✅ | Admin | List all users |
| PATCH | `/api/users/:id/role` | ✅ | Admin | Change user role |
| PATCH | `/api/users/:id/status` | ✅ | Admin | Approve/deactivate user |
| GET | `/api/tickets` | ✅ | All | List tickets |
| POST | `/api/tickets` | ✅ | Dev/Admin | Create ticket |
| GET | `/api/tickets/:id` | ✅ | All | Get ticket details |
| PATCH | `/api/tickets/:id` | ✅ | Dev/Admin | Update ticket |
| DELETE | `/api/tickets/:id` | ✅ | Dev/Admin | Delete ticket |
| POST | `/api/workflows` | ✅ | Dev/Admin | Create and run workflow |
| GET | `/api/workflows` | ✅ | All | List workflows |
| GET | `/api/workflows/:id` | ✅ | All | Get workflow details |
| POST | `/api/workflows/:id/accept` | ✅ | Dev/Admin | Accept agent output |
| POST | `/api/workflows/:id/rerun` | ✅ | Dev/Admin | Rerun agent step |
| POST | `/api/workflows/:id/edit` | ✅ | Dev/Admin | Edit agent output |
| POST | `/api/workflows/:id/submit-review` | ✅ | Dev/Admin | Submit for mentor review |
| POST | `/api/workflows/:id/mentor-review` | ✅ | Mentor/Admin | Submit mentor decision |
| POST | `/api/repositories/upload` | ✅ | Dev/Admin | Upload repository |
| GET | `/api/repositories` | ✅ | All | List repositories |
| GET | `/api/repositories/:id/files` | ✅ | All | Get repository files |
| GET | `/api/repositories/:id/tree` | ✅ | All | Get repository file tree |
| GET | `/api/agents` | ✅ | All | List agents |
| GET | `/api/notifications` | ✅ | All | List notifications |
| GET | `/api/notifications/stream` | ✅ | All | SSE notification stream |
| PATCH | `/api/notifications/:id/read` | ✅ | All | Mark notification read |
| POST | `/api/notifications/mark-all-read` | ✅ | All | Mark all notifications read |
| GET | `/api/eval/summary` | ✅ | All | Evaluation summary |
| GET | `/api/eval/agents` | ✅ | All | Per-agent evaluation |
| GET | `/api/eval/workflows/:id` | ✅ | All | Workflow evaluation detail |

### Appendix B: Workflow State Diagram

```mermaid
flowchart TD
    A["User submits Ticket"] --> B["Orchestrator initialises Workflow State"]
    B --> S0["Status: created"]

    S0 --> D{"Validate input ticket"}
    D -- Invalid --> ERR["Status: failed"]
    D -- Valid --> A1["TicketAnalyzerAgent"]

    A1 --> S1["Status: ticket_analyzed"]
    S1 --> A2["PriorityClassifierAgent"]
    S1 --> A3["RepoSearchAgent"]

    A2 --> S2["Status: priority_classified"]
    A3 --> S3["Status: repo_searched"]

    S2 & S3 --> A4["CodeContextAgent"]
    A4 --> S4["Status: code_context_ready"]
    S4 --> A5["FixProposalAgent"]
    A5 --> S5["Status: fix_proposed"]
    S5 --> A6["MentorDraftAgent"]
    A6 --> S6["Status: mentor_draft_ready"]
    S6 --> REVIEW["Status: waiting_for_review"]

    REVIEW --> M{"Mentor Review"}
    M -- Approve --> R1["APPROVED"]
    M -- Reject --> R2["REJECTED"]
    M -- Need More Info --> R3["NEED_MORE_INFORMATION"]

    A1 -. Agent fail .-> ERR
    A2 -. Agent fail .-> ERR
    A3 -. Agent fail .-> ERR
    A4 -. Agent fail .-> ERR
    A5 -. Agent fail .-> ERR
    A6 -. Agent fail .-> ERR
```

### Appendix C: Project Directory Structure

```
ticketassist/
├── backend/
│   ├── src/
│   │   ├── agents/               # 6 AI agent implementations
│   │   │   ├── ticketAnalyzerAgent.ts
│   │   │   ├── priorityClassifierAgent.ts
│   │   │   ├── repoSearchAgent.ts
│   │   │   ├── codeContextAgent.ts
│   │   │   ├── fixProposalAgent.ts
│   │   │   └── mentorDraftAgent.ts
│   │   ├── workflow/             # LangGraph orchestration
│   │   │   ├── graph.ts
│   │   │   ├── state.ts
│   │   │   └── jobQueue.ts
│   │   ├── routes/               # REST API endpoints
│   │   ├── middleware/           # Auth + role guards
│   │   ├── services/            # Business logic services
│   │   │   ├── repoIndexService.ts
│   │   │   ├── embeddingService.ts
│   │   │   ├── vectorSearchService.ts
│   │   │   ├── notificationService.ts
│   │   │   └── ticketMemoryService.ts
│   │   ├── eval/                # Evaluation benchmarks
│   │   │   ├── eval-config.ts
│   │   │   ├── eval-dataset.ts
│   │   │   ├── eval-metrics.ts
│   │   │   ├── eval-hallucination-checker.ts
│   │   │   ├── eval-runner.ts
│   │   │   └── eval-reporter.ts
│   │   └── index.ts             # Server entry point
│   ├── prisma/                  # Database schema + migrations
│   ├── codebasetest/            # Sample Java/JSP codebase
│   └── eval-results/            # Generated evaluation reports
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   ├── lib/                     # API client + auth utilities
│   ├── types/                   # TypeScript interfaces
│   └── middleware.ts            # Route protection
├── tests/                       # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── role-guards.spec.ts
│   ├── workflow-transitions.spec.ts
│   ├── repo-upload.spec.ts
│   ├── notifications.spec.ts
│   ├── full-workflow-notifications.spec.ts
│   └── helpers/
├── docs/                        # Project documentation
├── package.json                 # Root workspace config
├── playwright.config.ts         # Test configuration
└── README.md                    # Setup guide
```

### Appendix D: Environment Configuration

```env
# Server
PORT=4000

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ticketassist?schema=public

# Storage
STORAGE_DRIVER=sftp
NETWORK_FILE_STORAGE=/opt/ticketassist/storage
SFTP_HOST=YOUR_DROPLET_IP
SFTP_PORT=22

# Authentication
JWT_SECRET=replace-with-at-least-16-characters
JWT_ACCESS_EXPIRES_IN=3d
JWT_REFRESH_EXPIRES_IN=30d

# AI Provider
OPENAI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small

# Per-Agent Model Configuration
AI_MODEL_ANALYZER=gpt-4.1-mini
AI_MODEL_PRIORITY=gpt-4.1-mini
AI_MODEL_CODE_CONTEXT=gpt-4.1-mini
AI_MODEL_FIX_PROPOSAL=gpt-4.1-mini
AI_MODEL_MENTOR_DRAFT=gpt-4.1-mini

# Vector Search
REPO_INDEX_NAME=default-repo-index
PGVECTOR_CODE_CHUNKS_TABLE=code_chunks

# Frontend
CLIENT_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### Appendix E: Evaluation Cases Summary

| ID | Category | Difficulty | Description |
|----|----------|------------|-------------|
| EVAL-001 | Retrieval | Medium | Checkout total wrong after discount |
| EVAL-002 | Retrieval | Easy | Login fails with Google OAuth |
| EVAL-003 | Retrieval | Medium | VNPay payment error code 99 |
| EVAL-004 | Retrieval | Easy | Password reset email not received |
| EVAL-005 | Retrieval | Medium | Cart items disappear on refresh |
| EVAL-006 | Retrieval | Hard | Cannot delete product with active orders |
| EVAL-007 | Retrieval | Medium | Signup verification code expires too fast |
| EVAL-008 | End-to-End | Hard | Discount applied twice at checkout |
| EVAL-009 | Retrieval | Easy | Order history wrong dates |
| EVAL-010 | Retrieval | Easy | Card price shows 0 in admin |
| EVAL-011 | Proposal | Medium | SQL injection in product search |
| EVAL-012 | Proposal | Hard | Server error 500 on large cart |
| EVAL-013 | Hallucination | Medium | Feedback submission fails for guests |
| EVAL-014 | Hallucination | Medium | Profile image upload corrupts file |
| EVAL-015 | End-to-End | Hard | Order queue not following FIFO |

### Appendix F: Git Commit History Summary

| Period | Key Commits |
|--------|-------------|
| 1 Jun 2026 | Initial project setup, ERD, use cases, workflow diagrams |
| 2–3 Jun 2026 | Backend base, frontend base, login, user management, upload repository, ticket CRUD |
| 4 Jun 2026 | First 3 agents (TicketAnalyzer, PriorityClassifier, RepoSearch), remaining 3 agents, basic UI, full workflow |
| 5 Jun 2026 | UI improvements, workflow handoff fixes |
| 8 Jun 2026 | Chunking improvements, async workflow, indexing upgrade, repo intelligence |
| 9 Jun 2026 | Auth hardening, parallel agent execution, workflow review UI refactor |
| 11 Jun 2026 | Persistent database job queue |
| 16 Jun 2026 | AI Quality Evaluation Dashboard |
| 17 Jun 2026 | Real-time notification system (SSE) |
| 18 Jun 2026 | File indexing denylist refactor |
| 19 Jun 2026 | Playwright test suite, concurrency fixes |
| 24 Jun 2026 | Evaluation benchmarks system (15 test cases) |
| 29 Jun 2026 | Similar Ticket Memory (pgvector), Prisma migrations, final merge |

---

*End of Report*
