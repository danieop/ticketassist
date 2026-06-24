# Evaluation Benchmarks Guide

TicketAssist includes an evaluation benchmarks system that measures AI quality across four dimensions:

- **Retrieval Precision/Recall**: Does the system find the right files for a given ticket?
- **Hallucination Rate**: Does the system fabricate file paths, snippets, or claims?
- **Proposal Quality**: Are fix proposals structurally complete and conceptually relevant?
- **Priority Accuracy**: Does the classifier assign the correct priority?

## Quick Start

```bash
# Run all 15 evaluation cases
npm run eval -w backend

# Run only retrieval tests
npm run eval:retrieval -w backend

# Run only hallucination tests
npm run eval:hallucination -w backend

# Run only proposal quality tests
npm run eval:proposal -w backend

# Run end-to-end tests
npm run eval:e2e -w backend
```

## Prerequisites

1. The backend must have a working database connection (`DATABASE_URL` in `.env`).
2. The CardSeller sample repository must be uploaded and indexed (this happens automatically if not already done).
3. For AI-powered evaluation, `OPENAI_API_KEY` must be set. Without it, agents will use deterministic fallbacks, which still runs but produces baseline-quality results.

## CLI Options

```bash
npm run eval -w backend -- [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--cases EVAL-001,EVAL-003` | Run specific case IDs only | All cases |
| `--category retrieval` | Filter by category | All categories |
| `--difficulty easy` | Filter by difficulty | All difficulties |
| `--strategy hybrid` | Retrieval strategy | `hybrid` |
| `--max-results 10` | Maximum search results | `10` |
| `--index-name NAME` | pgvector index name | `default-repo-index` |
| `--output-dir PATH` | Where to save reports | `backend/eval-results` |
| `--json-only` | Only output JSON, no console | `false` |
| `--no-save` | Don't save reports to disk | `false` |

## Evaluation Cases

The benchmark includes **15 test cases** covering the CardSeller Java/JSP e-commerce codebase:

| ID | Category | Difficulty | Description |
|----|----------|------------|-------------|
| EVAL-001 | retrieval | medium | Checkout total wrong after discount |
| EVAL-002 | retrieval | easy | Login fails with Google OAuth |
| EVAL-003 | retrieval | medium | VNPay payment error code 99 |
| EVAL-004 | retrieval | easy | Password reset email not received |
| EVAL-005 | retrieval | medium | Cart items disappear on refresh |
| EVAL-006 | retrieval | hard | Cannot delete product with active orders |
| EVAL-007 | retrieval | medium | Signup verification code expires too fast |
| EVAL-008 | end-to-end | hard | Discount applied twice at checkout |
| EVAL-009 | retrieval | easy | Order history wrong dates |
| EVAL-010 | retrieval | easy | Card price shows 0 in admin |
| EVAL-011 | proposal | medium | SQL injection in product search |
| EVAL-012 | proposal | hard | Server error 500 on large cart |
| EVAL-013 | hallucination | medium | Feedback submission fails for guests |
| EVAL-014 | hallucination | medium | Profile image upload corrupts file |
| EVAL-015 | end-to-end | hard | Order queue not following FIFO |

## Metrics

### Retrieval Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| **Precision** | \|returned ∩ expected\| / \|returned\| | ≥ 0.60 |
| **Recall** | \|returned ∩ mustInclude\| / \|mustInclude\| | ≥ 0.70 |
| **F1 Score** | 2 × (P × R) / (P + R) | ≥ 0.65 |
| **MRR** | 1 / rank of first relevant result | ≥ 0.70 |

### Hallucination Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| **Fabricated File Rate** | fabricated files / total returned files | ≤ 0.05 |
| **Overall Hallucination Rate** | weighted composite | ≤ 0.10 |

The overall hallucination rate is computed as:
```
0.50 × fabricatedFileRate + 0.30 × prohibitedClaimRate + 0.20 × fabricatedSnippetRate
```

### Proposal Quality Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| **Concept Coverage** | mentioned concepts / expected concepts | ≥ 0.60 |
| **Structural Score** | present fields / 4 required fields | ≥ 0.75 |
| **Overall Score** | weighted composite | ≥ 0.60 |

Overall proposal score weights:
```
0.40 × conceptCoverage + 0.30 × structuralScore + 0.15 × approachValidity + 0.15 × aiConfidence
```

### Priority Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| **Accuracy** | exact matches / total cases | ≥ 0.80 |
| **Acceptable Rate** | acceptable matches / total cases | ≥ 0.90 |

## Output

Reports are saved to `backend/eval-results/`:

```
backend/eval-results/
├── 2026-06-23T10-00-00Z.json       # Full structured results
├── 2026-06-23T10-00-00Z.md         # Formatted Markdown report
└── .gitkeep
```

JSON results contain the complete `EvalReport` object. Markdown reports include summary tables, per-case breakdowns, and pass/fail indicators.

## Adding New Evaluation Cases

Edit `backend/src/eval/eval-dataset.ts` and add a new `EvalCase` object:

```typescript
{
  id: "EVAL-016",
  category: "retrieval",
  difficulty: "medium",
  ticket: {
    title: "Your bug ticket title",
    description: "Detailed bug description...",
    reporterName: "QA Engineer",
    source: "MANUAL",
  },
  expectedPriority: {
    level: "high",
    acceptableAlternatives: ["medium"],
  },
  expectedRelevantFiles: {
    mustInclude: ["src/java/controller/SomeController.java"],
    shouldInclude: ["src/java/dal/someDAO.java"],
    mustNotInclude: [],
  },
  expectedProposal: {
    mustMentionConcepts: ["key concept 1", "key concept 2"],
    mustNotClaim: ["fixed", "resolved", "deployed", "patched", "the code has been updated"],
  },
  goldenAnalysis: {
    affectedFeature: "feature-name",
    suspectedFlow: "flow description",
  },
}
```

## Tuning Thresholds

Default thresholds are in `backend/src/eval/eval-config.ts`. Adjust the `EVAL_THRESHOLDS` object to match your quality requirements:

```typescript
export const EVAL_THRESHOLDS = {
  retrieval: {
    minPrecision: 0.60,
    minRecall: 0.70,
    minF1: 0.65,
    minMRR: 0.70,
  },
  hallucination: {
    maxOverallRate: 0.10,
    maxFabricatedFileRate: 0.05,
    maxFabricatedSnippetRate: 0.10,
  },
  proposal: {
    minConceptCoverage: 0.60,
    minStructuralScore: 0.75,
    minOverallScore: 0.60,
  },
  priority: {
    minAccuracy: 0.80,
    minAcceptableRate: 0.90,
  },
};
```

## Architecture

```text
backend/src/eval/
├── eval-config.ts                  # Types, interfaces, thresholds
├── eval-dataset.ts                 # 15 evaluation cases
├── eval-metrics.ts                 # Retrieval, proposal, priority metric computation
├── eval-hallucination-checker.ts   # Hallucination detection
├── eval-runner.ts                  # Orchestrates eval runs through workflow service
└── eval-reporter.ts                # Console, JSON, Markdown report generation

backend/src/scripts/
└── run-eval.ts                     # CLI entry point
```
