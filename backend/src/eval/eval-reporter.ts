// ---------------------------------------------------------------------------
// Eval reporter – human-readable reports from evaluation results
// ---------------------------------------------------------------------------

import type {
  EvalReport,
  EvalResult,
  ThresholdResult,
  AggregateMetrics,
} from "./eval-config.js";

// ── ANSI helpers ───────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

const pass = `${c.green}✅${c.reset}`;
const fail = `${c.red}❌${c.reset}`;

function colorize(text: string, color: string): string {
  return `${color}${text}${c.reset}`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 3) + "...";
}

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

// ── Console Report ─────────────────────────────────────────────────────────

/**
 * Print a beautiful console report with box-drawing, colors, and tables.
 */
export function printConsoleReport(report: EvalReport): void {
  const lines: string[] = [];
  const W = 65; // inner width of the header box

  // ── Header box ───────────────────────────────────────────────────────
  const title = "TicketAssist Evaluation Benchmark";
  const subtitle = `${report.timestamp.slice(0, 10)} | ${report.config.retrievalStrategy} | ${report.config.totalCases} cases`;

  lines.push("");
  lines.push(colorize(`╔${"═".repeat(W)}╗`, c.cyan));
  lines.push(colorize(`║${centerText(title, W)}║`, c.cyan));
  lines.push(colorize(`║${centerText(subtitle, W)}║`, c.cyan));
  lines.push(colorize(`╚${"═".repeat(W)}╝`, c.cyan));
  lines.push("");

  // ── Aggregate metrics table ──────────────────────────────────────────
  const metricCol = 27;
  const valueCol = 36;

  lines.push(colorize(`${c.bold}  Aggregate Metrics`, c.cyan));
  lines.push(`  ┌${"─".repeat(metricCol)}┬${"─".repeat(valueCol)}┐`);
  lines.push(`  │${pad(" Metric", metricCol)}│${pad(" Value", valueCol)}│`);
  lines.push(`  ├${"─".repeat(metricCol)}┼${"─".repeat(valueCol)}┤`);

  for (const t of report.thresholdResults) {
    const icon = t.pass ? pass : fail;
    const dir = t.direction === "min" ? "≥" : "≤";
    const valueStr = ` ${fmt(t.value)} (target: ${dir}${fmt(t.threshold)})`;
    const label = ` ${metricLabel(t.metric)}`;
    const colorFn = t.pass ? c.green : c.red;

    lines.push(
      `  │${pad(label, metricCol)}│${colorize(pad(valueStr, valueCol - 4), colorFn)} ${icon} │`,
    );
  }

  lines.push(`  └${"─".repeat(metricCol)}┴${"─".repeat(valueCol)}┘`);
  lines.push("");

  // ── Per-case summary table ───────────────────────────────────────────
  lines.push(colorize(`${c.bold}  Per-Case Summary`, c.cyan));
  lines.push(
    `  ${pad("ID", 10)}│ ${pad("Title", 32)}│ ${pad("P", 5)}│ ${pad("R", 5)}│ ${pad("F1", 5)}│ ${pad("H", 5)}│ ${pad("Q", 5)}│ Pri`,
  );
  lines.push(`  ${"─".repeat(10)}┼${"─".repeat(33)}┼${"─".repeat(5)}┼${"─".repeat(5)}┼${"─".repeat(5)}┼${"─".repeat(5)}┼${"─".repeat(5)}┼${"─".repeat(4)}`);

  for (const r of report.results) {
    const priIcon = r.priority.isAcceptable ? pass : fail;
    lines.push(
      `  ${pad(r.caseId, 10)}│ ${pad(truncate(r.ticketTitle, 30), 32)}│ ${pad(fmt(r.retrieval.precision), 5)}│ ${pad(fmt(r.retrieval.recall), 5)}│ ${pad(fmt(r.retrieval.f1Score), 5)}│ ${pad(fmt(r.hallucination.overallHallucinationRate), 5)}│ ${pad(fmt(r.proposal.overallScore), 5)}│ ${priIcon}`,
    );
  }

  lines.push("");

  // ── Overall result ───────────────────────────────────────────────────
  const passed = report.thresholdResults.filter((t) => t.pass).length;
  const total = report.thresholdResults.length;
  const overallIcon = report.overallPass ? pass : fail;
  const overallWord = report.overallPass ? "PASS" : "FAIL";
  const overallColor = report.overallPass ? c.green : c.red;

  lines.push(
    colorize(
      `  ${c.bold}OVERALL: ${passed}/${total} targets met — ${overallWord} `,
      overallColor,
    ) + overallIcon,
  );
  lines.push("");

  console.log(lines.join("\n"));
}

// ── Markdown Report ────────────────────────────────────────────────────────

/**
 * Generate a full Markdown report string.
 */
export function generateMarkdownReport(report: EvalReport): string {
  const lines: string[] = [];

  // Title & metadata
  lines.push(`# TicketAssist Evaluation Report`);
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| **Run ID** | \`${report.runId}\` |`);
  lines.push(`| **Date** | ${report.timestamp} |`);
  lines.push(`| **Strategy** | ${report.config.retrievalStrategy} |`);
  lines.push(`| **Max Results** | ${report.config.maxResults} |`);
  lines.push(`| **Index** | ${report.config.indexName} |`);
  lines.push(`| **Cases** | ${report.config.totalCases} |`);
  lines.push(`| **Overall** | ${report.overallPass ? "✅ PASS" : "❌ FAIL"} |`);
  lines.push("");

  // Aggregate metrics table
  lines.push(`## Aggregate Metrics`);
  lines.push("");
  lines.push(`| Metric | Value | Target | Status |`);
  lines.push(`|--------|------:|-------:|--------|`);

  for (const t of report.thresholdResults) {
    const dir = t.direction === "min" ? "≥" : "≤";
    const icon = t.pass ? "✅" : "❌";
    lines.push(
      `| ${metricLabel(t.metric)} | ${fmt(t.value)} | ${dir} ${fmt(t.threshold)} | ${icon} |`,
    );
  }

  lines.push("");

  // Per-case results table
  lines.push(`## Per-Case Results`);
  lines.push("");
  lines.push(
    `| ID | Title | Precision | Recall | F1 | Hallucination | Proposal | Priority | Duration |`,
  );
  lines.push(
    `|----|-------|----------:|-------:|---:|--------------:|---------:|----------|----------|`,
  );

  for (const r of report.results) {
    const priIcon = r.priority.isAcceptable ? "✅" : "❌";
    const dur = `${(r.durationMs / 1000).toFixed(1)}s`;
    lines.push(
      `| ${r.caseId} | ${truncate(r.ticketTitle, 40)} | ${fmt(r.retrieval.precision)} | ${fmt(r.retrieval.recall)} | ${fmt(r.retrieval.f1Score)} | ${fmt(r.hallucination.overallHallucinationRate)} | ${fmt(r.proposal.overallScore)} | ${priIcon} ${r.priority.actual} | ${dur} |`,
    );
  }

  lines.push("");

  // Detailed per-case breakdowns
  lines.push(`## Detailed Case Breakdowns`);
  lines.push("");

  for (const r of report.results) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>${r.caseId}</strong> — ${r.ticketTitle}</summary>`);
    lines.push("");

    // Retrieval details
    lines.push(`### Retrieval`);
    lines.push("");
    lines.push(`- **Precision**: ${fmt(r.retrieval.precision)} | **Recall**: ${fmt(r.retrieval.recall)} | **F1**: ${fmt(r.retrieval.f1Score)} | **MRR**: ${fmt(r.retrieval.mrr)}`);

    if (r.retrieval.truePositives.length > 0) {
      lines.push(`- **True Positives**: ${r.retrieval.truePositives.map((f) => `\`${f}\``).join(", ")}`);
    }

    if (r.retrieval.falsePositives.length > 0) {
      lines.push(`- **False Positives**: ${r.retrieval.falsePositives.map((f) => `\`${f}\``).join(", ")}`);
    }

    if (r.retrieval.falseNegatives.length > 0) {
      lines.push(`- **False Negatives**: ${r.retrieval.falseNegatives.map((f) => `\`${f}\``).join(", ")}`);
    }

    lines.push("");

    // Hallucination details
    lines.push(`### Hallucination`);
    lines.push("");
    lines.push(`- **Overall Rate**: ${fmt(r.hallucination.overallHallucinationRate)}`);
    lines.push(`- **Fabricated File Rate**: ${fmt(r.hallucination.fabricatedFileRate)}`);
    lines.push(`- **Fabricated Snippet Rate**: ${fmt(r.hallucination.fabricatedSnippetRate)}`);

    if (r.hallucination.fabricatedFilePaths.length > 0) {
      lines.push(`- **Fabricated Files**: ${r.hallucination.fabricatedFilePaths.map((f) => `\`${f}\``).join(", ")}`);
    }

    if (r.hallucination.fabricatedSnippets.length > 0) {
      lines.push(`- **Fabricated Snippets**:`);
      for (const s of r.hallucination.fabricatedSnippets) {
        lines.push(`  - \`${s.filePath}\`: claimed \`${s.claimed}\`, actual: ${s.actual === null ? "_file not found_" : `\`${s.actual}\``}`);
      }
    }

    if (r.hallucination.prohibitedClaims.length > 0) {
      lines.push(`- **Prohibited Claims Found**: ${r.hallucination.prohibitedClaims.map((cl) => `"${cl}"`).join(", ")}`);
    }

    lines.push("");

    // Proposal quality breakdown
    lines.push(`### Proposal Quality`);
    lines.push("");
    lines.push(`- **Overall Score**: ${fmt(r.proposal.overallScore)}`);
    lines.push(`- **Concept Coverage**: ${fmt(r.proposal.conceptCoverage)}`);
    lines.push(`- **Structural Score**: ${fmt(r.proposal.structuralScore)}`);
    lines.push(`- **Has Hypotheses**: ${r.proposal.hasHypotheses ? "Yes" : "No"}`);
    lines.push(`- **Has Steps**: ${r.proposal.hasSteps ? "Yes" : "No"}`);
    lines.push(`- **Has Risks**: ${r.proposal.hasRisks ? "Yes" : "No"}`);
    lines.push(`- **Has Verification Steps**: ${r.proposal.hasVerificationSteps ? "Yes" : "No"}`);
    lines.push(`- **Approach Valid**: ${r.proposal.approachValid === null ? "N/A" : r.proposal.approachValid ? "Yes" : "No"}`);
    lines.push(`- **AI Confidence**: ${fmt(r.proposal.aiConfidence)}`);

    if (r.proposal.missingConcepts.length > 0) {
      lines.push(`- **Missing Concepts**: ${r.proposal.missingConcepts.map((mc) => `"${mc}"`).join(", ")}`);
    }

    lines.push("");

    // Priority
    lines.push(`### Priority`);
    lines.push("");
    lines.push(`- **Expected**: ${r.priority.expected} | **Actual**: ${r.priority.actual}`);
    lines.push(`- **Exact Match**: ${r.priority.isExactMatch ? "Yes" : "No"} | **Acceptable**: ${r.priority.isAcceptable ? "Yes ✅" : "No ❌"}`);
    lines.push("");

    lines.push(`</details>`);
    lines.push("");
  }

  // Threshold results summary
  lines.push(`## Threshold Results`);
  lines.push("");

  const passed = report.thresholdResults.filter((t) => t.pass).length;
  const total = report.thresholdResults.length;

  lines.push(
    `**${passed}/${total}** targets met — **${report.overallPass ? "PASS ✅" : "FAIL ❌"}**`,
  );
  lines.push("");
  lines.push(`| Metric | Value | Target | Result |`);
  lines.push(`|--------|------:|-------:|--------|`);

  for (const t of report.thresholdResults) {
    const dir = t.direction === "min" ? "≥" : "≤";
    const icon = t.pass ? "✅ Pass" : "❌ Fail";
    lines.push(
      `| ${metricLabel(t.metric)} | ${fmt(t.value)} | ${dir} ${fmt(t.threshold)} | ${icon} |`,
    );
  }

  lines.push("");
  lines.push("---");
  lines.push(`*Generated by TicketAssist Eval at ${report.timestamp}*`);
  lines.push("");

  return lines.join("\n");
}

// ── JSON Report ────────────────────────────────────────────────────────────

/**
 * Return the report as pretty-printed JSON.
 */
export function generateJsonReport(report: EvalReport): string {
  return JSON.stringify(report, null, 2);
}

// ── Internal helpers ───────────────────────────────────────────────────────

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  const rightPad = width - text.length - leftPad;
  return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}

const METRIC_LABELS: Record<string, string> = {
  "retrieval.precision": "Retrieval Precision",
  "retrieval.recall": "Retrieval Recall",
  "retrieval.f1": "Retrieval F1",
  "retrieval.mrr": "Retrieval MRR",
  "hallucination.overallRate": "Hallucination Rate",
  "hallucination.fabricatedFileRate": "Fabricated File Rate",
  "proposal.overallScore": "Proposal Score",
  "priority.accuracy": "Priority Accuracy",
  "priority.acceptableRate": "Priority Acceptable Rate",
};

function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key;
}
