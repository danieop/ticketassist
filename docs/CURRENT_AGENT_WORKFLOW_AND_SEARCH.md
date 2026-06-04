# Current Agent Workflow And Search Strategy

This document describes the current implemented backend workflow in TicketAssist.

The app uses:

- Express backend in `backend/`
- Prisma + PostgreSQL for workflow persistence
- PostgreSQL + pgvector for repository vector search
- LangGraph JS for workflow orchestration
- OpenAI-compatible chat/completions for ticket analysis, priority classification, code context selection, fix proposal, and mentor draft generation
- OpenAI-compatible embeddings through `AI_BASE_URL`
- `text-embedding-3-small` as the configured embedding model

## Workflow Overview

The implemented workflow runs all six business agents and stops at developer confirmation. It generates a fix proposal and mentor draft, but it does not modify code or send customer replies automatically. The developer submits the draft to the mentor queue explicitly.

Execution order:

```text
START
-> ticketAnalyzerNode
-> priorityClassifierNode
-> repoSearchNode
-> codeContextNode
-> fixProposalNode
-> mentorDraftNode
-> END
```

Successful status flow:

```text
created
-> ticket_analyzed
-> priority_classified
-> repo_searched
-> code_context_ready
-> fix_proposed
-> mentor_draft_ready
-> waiting_for_review after developer confirmation
```

Failure flow:

```text
created / ticket_analyzed / priority_classified / repo_searched / code_context_ready / fix_proposed
-> failed
```

The graph is implemented in `backend/src/services/workflow.graph.ts` using `StateGraph` from `@langchain/langgraph`.

## API Entry Points

Run workflow:

```http
POST /api/workflows
```

Useful request fields:

```json
{
  "repositoryId": "optional repository id",
  "retrievalStrategy": "hybrid",
  "indexName": "default-repo-index",
  "forceReindex": false,
  "maxResults": 10,
  "ticket": {
    "title": "Checkout coupon order spinner",
    "description": "Checkout shows a spinner forever after a coupon is applied.",
    "reporterName": "Reporter",
    "source": "MANUAL"
  }
}
```

Build or reuse repository index:

```http
POST /api/repositories/:id/index
```

Body:

```json
{
  "indexName": "default-repo-index",
  "forceReindex": false
}
```

Submit a ready mentor draft to the mentor queue:

```http
POST /api/workflows/:id/submit
```

## Workflow State

The central runtime state is `TicketWorkflowState` in `backend/src/services/workflow-state.ts`.

Important fields:

- `status`: current workflow status
- `ticket`: input title, description, and metadata
- `repoConfig`: repository ID, path, retrieval strategy, index name, and result limit
- `analysis`: output from `TicketAnalyzerAgent`
- `priority`: output from `PriorityClassifierAgent`
- `repoSearch`: output from `RepoSearchAgent`
- `codeContext`: output from `CodeContextAgent`
- `fixProposal`: output from `FixProposalAgent`
- `mentorDraft`: output from `MentorDraftAgent`
- `errors`: structured node errors
- `trace`: started/completed/failed trace entries

After execution, the backend persists the state into existing Prisma models:

- `WorkflowRun`
- `WorkflowState`
- `AgentRun`
- `TraceLog`
- `RepoSearchResult`

Database enum values are uppercase, but API responses map workflow and agent statuses to lowercase.

## Agents

### 1. TicketAnalyzerAgent

Node: `ticketAnalyzerNode`

Responsibility:

- Validate ticket description.
- Extract structured bug-ticket analysis.
- Do not classify priority.
- Do not search the repository.

Current implementation:

- Uses the configured OpenAI-compatible chat/completions provider.
- Model: `AI_MODEL_ANALYZER`, currently `gpt-4.1-mini`.
- Requests JSON-only structured output.
- Validates the LLM response with Zod before storing it.
- Falls back to deterministic analysis only if the provider call or JSON validation fails.
- Splits the description into key facts.
- Detects a simple affected feature from known domain terms such as `checkout`, `coupon`, `payment`, `login`, `cart`, `order`, and `card`.

Output:

```json
{
  "summary": "Short summary",
  "keyFacts": ["Fact 1", "Fact 2"],
  "affectedFeature": "checkout",
  "suspectedFlow": "checkout flow",
  "missingInfo": [
    "Exact reproduction steps",
    "Affected environment/version",
    "Relevant logs or request IDs"
  ]
}
```

Success status:

```text
ticket_analyzed
```

### 2. PriorityClassifierAgent

Node: `priorityClassifierNode`

Responsibility:

- Validate that ticket analysis exists.
- Classify priority from ticket text and analysis.
- Do not search the repository.

Current implementation:

- Uses the configured OpenAI-compatible chat/completions provider.
- Model: `AI_MODEL_PRIORITY`, currently `gpt-4.1-mini`.
- Sends the ticket plus prior analysis and explicit priority rules.
- Requests JSON-only structured output.
- Validates the LLM response with Zod before storing it.
- Falls back to deterministic rule-based classification only if the provider call or JSON validation fails.
- Critical signals include outage, crash, data loss, security, complete payment/auth failure, and many users blocked.
- High signals include production, multiple users, core feature, checkout, payment, login, no workaround, and blocked.
- Low signals include typo, visual, minor UI, logging, and cosmetic issues.

Output:

```json
{
  "level": "high",
  "reason": "The ticket affects a core or production workflow and indicates meaningful user impact.",
  "confidence": 0.8,
  "severity": "major",
  "businessImpact": "Important user workflow is degraded or blocked."
}
```

Success status:

```text
priority_classified
```

### 3. RepoSearchAgent

Node: `repoSearchNode`

Responsibility:

- Validate analysis, priority, and repository config.
- Generate search terms and a semantic query.
- Build or reuse a pgvector index.
- Run keyword, vector, or hybrid search.
- Return top-k snippets/chunks only.

The agent never sends the whole repository or whole files to an LLM.

Success status:

```text
repo_searched
```

### 4. CodeContextAgent

Node: `codeContextNode`

Responsibility:

- Validate repository search output.
- Select the most relevant files/chunks from search results.
- Explain why each file/chunk is relevant.
- Capture risk notes for mentor review.
- Do not propose a fix.

Current implementation:

- Uses the configured OpenAI-compatible chat/completions provider.
- Model: `AI_MODEL_ANALYZER`, currently `gpt-4.1-mini`.
- Sends only the top focused search results, not the whole repository.
- Falls back to deterministic selection from ranked search results if the provider call or JSON validation fails.

Success status:

```text
code_context_ready
```

### 5. FixProposalAgent

Node: `fixProposalNode`

Responsibility:

- Validate code context output.
- Draft hypotheses, recommended approach, risks, and verification steps.
- Do not modify source code.
- Do not claim the issue is fixed.

Current implementation:

- Uses the configured OpenAI-compatible chat/completions provider.
- Model: `AI_MODEL_ANALYZER`, currently `gpt-4.1-mini`.
- Falls back to a deterministic constrained proposal if the provider call or JSON validation fails.

Success status:

```text
fix_proposed
```

### 6. MentorDraftAgent

Node: `mentorDraftNode`

Responsibility:

- Validate fix proposal output.
- Generate a concise mentor-review draft and checklist.
- Mark the workflow ready for human review.
- Do not send a customer response automatically.

Current implementation:

- Uses the configured OpenAI-compatible chat/completions provider.
- Model: `AI_MODEL_ANALYZER`, currently `gpt-4.1-mini`.
- Falls back to a deterministic mentor draft if the provider call or JSON validation fails.

Success status:

```text
mentor_draft_ready
```

## Repository Indexing

Indexing is implemented in `backend/src/services/repo-search.service.ts`.

The index table is created by migration:

```text
backend/prisma/migrations/20260604094500_add_pgvector_code_chunks/migration.sql
```

Table:

```sql
code_chunks
```

Important columns:

- `id`
- `repository_id`
- `index_name`
- `file_path`
- `language`
- `start_line`
- `end_line`
- `content`
- `content_hash`
- `symbols`
- `metadata`
- `embedding vector`
- `indexed_at`

The migration also enables pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Index reuse rules:

- If chunks already exist for `(repository_id, index_name)` and `forceReindex` is false, reuse the existing index.
- If no chunks exist, build the index.
- If `forceReindex` is true, delete and rebuild chunks for that repository/index.

Current verified index:

```text
indexName: default-repo-index
embeddedChunks: 413
embeddingDimensions: 1536
embeddingModel: text-embedding-3-small
```

## Code Chunking

Chunking is line based.

Current behavior:

- Max chunk size: 120 lines
- Overlap: 15 lines
- Stores line range, language, content hash, symbols, and metadata
- Skips binary files
- Skips files over 500 KB
- Skips generated/build directories such as `node_modules`, `.git`, `dist`, `build`, `.next`, `target`, and `coverage`

Supported extensions include:

```text
.ts .tsx .js .jsx .py .java .jsp .go .rb .php .cs
.json .md .yml .yaml .css .scss .html .sql .xml .properties
```

The CardSeller sample repo is Java/JSP-heavy, so `.java`, `.jsp`, `.sql`, `.xml`, and `.properties` are included.

## Embedding Strategy

Embeddings are handled by `backend/src/services/embedding.service.ts`.

Environment:

```env
AI_BASE_URL=https://api.shopaikey.com/v1
OPENAI_API_KEY=...
AI_MODEL_ANALYZER=gpt-4.1-mini
AI_MODEL_PRIORITY=gpt-4.1-mini
EMBEDDING_MODEL=text-embedding-3-small
```

The embedding client calls the OpenAI-compatible endpoint:

```http
POST {AI_BASE_URL}/embeddings
```

Request shape:

```json
{
  "model": "text-embedding-3-small",
  "input": ["chunk text"]
}
```

Verified behavior:

- Provider call works.
- `text-embedding-3-small` returns 1536-dimensional vectors.
- Stored pgvector rows currently have 1536-dimensional embeddings.

Fallback:

- If `OPENAI_API_KEY` is missing, the service uses a deterministic local hash embedding.
- This fallback is for local/demo resilience only.
- With the configured provider key, fallback is not used.

## Search Query Generation

RepoSearchAgent generates both:

### Semantic Query

A concise natural-language query built from:

- ticket title
- ticket description
- analysis summary
- key facts
- affected feature
- suspected flow
- priority level
- priority reason

Example:

```text
Checkout coupon order spinner; checkout shows a spinner forever after a coupon is applied; high priority: production workflow impact.
```

### Keyword Terms

Terms are generated from:

- ticket title
- ticket description
- analysis summary
- key facts
- affected feature
- suspected flow

Normalization:

- lowercase
- remove punctuation
- remove common stop words
- deduplicate
- keep domain terms like `checkout`, `coupon`, `order`, `payment`, `cart`, and `login`

## Search Strategies

The request can choose:

```text
keyword
vector
hybrid
```

Default:

```text
hybrid
```

### Keyword Search

Keyword search reads repository files through existing `CodeRepositoryFile` records and file-storage helpers.

It searches:

- file paths
- file names
- source lines

It scores higher for:

- filename/path matches
- multiple matched terms
- matches near code-like lines, such as class/function/export/service/controller/DAO lines

It returns:

- file path
- score
- line range
- matched lines
- snippet
- symbols
- metadata

### Vector Search

Vector search:

1. Embeds the semantic query.
2. Queries `code_chunks` using pgvector cosine distance.
3. Filters by `repository_id` and `index_name`.
4. Returns top-k semantic chunks.

Current SQL scoring:

```sql
1 - (embedding <=> query_embedding)
```

Returned result type:

```text
semantic
```

### Hybrid Search

Hybrid search runs both:

- vector search
- keyword search

Then it merges and reranks results.

Deduplication key:

- `chunkId`, if available
- otherwise `filePath:startLine:endLine`

Hybrid scoring:

- combines provider scores
- adds an overlap bonus if the same result appears from multiple providers
- preserves matched lines from keyword results when available
- preserves snippet and symbols

Returned result type can be:

```text
semantic
keyword
filename
hybrid
```

In current tests, hybrid completed successfully with pgvector index reuse and no warnings, but the top results were keyword/path dominated for the sample ticket. Vector-only tests confirmed the semantic pgvector branch returns semantic results.

## Error And Fallback Behavior

Critical failures:

- missing repository
- repository not ready
- missing analysis before priority
- missing priority before repo search
- no useful search provider available

Recoverable behavior:

- if vector search fails but keyword search works, the workflow continues
- warning is stored in `repoSearch.warnings`
- no search results is not a workflow failure; it returns an empty result list with a warning

Each node:

- appends `started` trace
- appends `completed` trace on success
- appends `failed` trace on failure
- records errors in state
- sets workflow status to `failed` for critical failures

## Current Test Results

The full workflow has been tested through the service layer.

Hybrid test:

```text
status: mentor_draft_ready
agents:
  TICKET_ANALYZER:success
  PRIORITY_CLASSIFIER:success
  REPO_SEARCH:success
  CODE_CONTEXT:success
  FIX_PROPOSAL:success
  MENTOR_DRAFT:success
traceCount: 12
repoSearchResults: 10
indexName: default-repo-index
indexedChunks: 413
embeddingModel: text-embedding-3-small
warnings: []
codeContext: present
fixProposal: present
mentorDraft: present
```

LLM workflow test:

```text
status: mentor_draft_ready
agents:
  TICKET_ANALYZER:success
  PRIORITY_CLASSIFIER:success
  REPO_SEARCH:success
  CODE_CONTEXT:success
  FIX_PROPOSAL:success
  MENTOR_DRAFT:success
TicketAnalyzerAgent trace: LLM gpt-4.1-mini
PriorityClassifierAgent trace: LLM gpt-4.1-mini
```

Vector-only test:

```text
status: repo_searched
agents:
  TICKET_ANALYZER:success
  PRIORITY_CLASSIFIER:success
  REPO_SEARCH:success
repoSearchResults: 5
resultMatchType: semantic
```

DB vector check:

```text
indexName: default-repo-index
dimensions: 1536
count: 413
```

## Current Limitations

- Ticket analysis, priority classification, code context selection, fix proposal, and mentor draft generation use LLM calls, but still fall back to deterministic logic if the provider fails.
- Chunking is line-based, not AST-based.
- Hybrid ranking is simple and deterministic.
- The workflow does not modify source code.
- The workflow does not send mentor/customer responses.
