// ---------------------------------------------------------------------------
// CLI entry-point for running TicketAssist evaluations
// Usage:  tsx src/scripts/run-eval.ts [options]
// ---------------------------------------------------------------------------

import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { evalDataset } from "../eval/eval-dataset.js";
import { runEvaluation } from "../eval/eval-runner.js";
import {
  printConsoleReport,
  generateMarkdownReport,
  generateJsonReport,
} from "../eval/eval-reporter.js";
import type { EvalRunConfig, EvalCase } from "../eval/eval-config.js";

// ── Arg parsing helpers ────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Parse CLI arguments
  const casesArg = getArg("--cases");
  const categoryArg = getArg("--category") as
    | "retrieval"
    | "hallucination"
    | "proposal"
    | "priority"
    | "end-to-end"
    | undefined;
  const difficultyArg = getArg("--difficulty") as
    | "easy"
    | "medium"
    | "hard"
    | undefined;
  const strategyArg = (getArg("--strategy") ?? "hybrid") as
    | "hybrid"
    | "vector"
    | "keyword";
  const maxResults = Number(getArg("--max-results") ?? "10");
  const indexName = getArg("--index-name") ?? "default-repo-index";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const defaultOutputDir = path.resolve(__dirname, "../../eval-results");
  const outputDir = getArg("--output-dir") ?? defaultOutputDir;

  const jsonOnly = hasFlag("--json-only");
  const noSave = hasFlag("--no-save");

  // ── Filter dataset ─────────────────────────────────────────────────────

  let cases: EvalCase[] = [...evalDataset];

  if (casesArg) {
    const ids = new Set(casesArg.split(",").map((id) => id.trim()));
    cases = cases.filter((c) => ids.has(c.id));
  }

  if (categoryArg) {
    cases = cases.filter((c) => c.category === categoryArg);
  }

  if (difficultyArg) {
    cases = cases.filter((c) => c.difficulty === difficultyArg);
  }

  if (cases.length === 0) {
    console.error("No eval cases matched the provided filters.");
    process.exit(1);
  }

  // ── Print summary ──────────────────────────────────────────────────────

  console.log("\x1b[36m\x1b[1m");
  console.log("┌─────────────────────────────────────────┐");
  console.log("│       TicketAssist Eval Runner           │");
  console.log("└─────────────────────────────────────────┘");
  console.log("\x1b[0m");
  console.log(`  Strategy:    ${strategyArg}`);
  console.log(`  Max Results: ${maxResults}`);
  console.log(`  Index:       ${indexName}`);
  console.log(`  Cases:       ${cases.length}`);
  console.log(
    `  IDs:         ${cases.map((c) => c.id).join(", ")}`,
  );
  console.log(`  Output Dir:  ${noSave ? "(not saving)" : outputDir}`);
  console.log("");

  // ── Build run config ───────────────────────────────────────────────────

  const config: EvalRunConfig = {
    cases,
    indexName,
    retrievalStrategy: strategyArg,
    maxResults,
    concurrency: 1,
  };

  // ── Run evaluation ─────────────────────────────────────────────────────

  console.log("Running evaluation…\n");
  const report = await runEvaluation(config);

  // ── Console report ─────────────────────────────────────────────────────

  if (!jsonOnly) {
    printConsoleReport(report);
  } else {
    console.log(generateJsonReport(report));
  }

  // ── Save reports ───────────────────────────────────────────────────────

  if (!noSave) {
    await mkdir(outputDir, { recursive: true });

    const timestamp = report.timestamp.replace(/[:.]/g, "-");
    const baseName = `eval-${timestamp}`;

    const jsonPath = path.join(outputDir, `${baseName}.json`);
    const mdPath = path.join(outputDir, `${baseName}.md`);

    await writeFile(jsonPath, generateJsonReport(report), "utf-8");
    await writeFile(mdPath, generateMarkdownReport(report), "utf-8");

    console.log(`\n  Reports saved:`);
    console.log(`    JSON:     ${jsonPath}`);
    console.log(`    Markdown: ${mdPath}`);
  }

  // ── Exit code ──────────────────────────────────────────────────────────

  process.exit(report.overallPass ? 0 : 1);
}

main().catch((error) => {
  console.error("Eval run failed:", error);
  process.exit(1);
});
