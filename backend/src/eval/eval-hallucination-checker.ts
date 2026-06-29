import type { EvalCase, HallucinationMetrics } from "./eval-config.js";

/* ------------------------------------------------------------------ */
/*  Path helpers (exported for reuse)                                 */
/* ------------------------------------------------------------------ */

/**
 * Normalize a file path for comparison:
 * lowercase, forward slashes, trim leading `./`.
 */
export function normalizeFilePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .toLowerCase();
}

/**
 * Returns `true` when one normalized path ends with the other
 * (or they are equal after normalization).
 * Handles partial paths like `src/controller/Cart.java` matching
 * `CardSeller/src/controller/Cart.java`.
 */
export function filePathsMatch(path1: string, path2: string): boolean {
  const a = normalizeFilePath(path1);
  const b = normalizeFilePath(path2);
  return a === b || a.endsWith("/" + b) || b.endsWith("/" + a);
}

/* ------------------------------------------------------------------ */
/*  Generic prohibited phrases                                        */
/* ------------------------------------------------------------------ */

const GENERIC_PROHIBITED_PHRASES: string[] = [
  "I have fixed",
  "the bug is now resolved",
  "deployed to",
  "the code has been updated",
  "patch applied",
  "issue is fixed",
];

/* ------------------------------------------------------------------ */
/*  Hallucination metrics                                             */
/* ------------------------------------------------------------------ */

export function computeHallucinationMetrics(options: {
  repoSearchResults: Array<{ filePath: string; snippet?: string }>;
  codeContextFiles: Array<{ filePath: string; excerpt?: string }>;
  fixProposalText: string;
  repoFilePaths: string[];
  evalCase: EvalCase;
}): HallucinationMetrics {
  const {
    repoSearchResults,
    codeContextFiles,
    fixProposalText,
    repoFilePaths,
    evalCase,
  } = options;

  // ------------------------------------------------------------------
  // 1. Fabricated file paths
  // ------------------------------------------------------------------

  // Collect unique file paths referenced in workflow output
  const referencedPathMap = new Map<string, string>(); // normalized → original
  for (const r of repoSearchResults) {
    referencedPathMap.set(normalizeFilePath(r.filePath), r.filePath);
  }
  for (const c of codeContextFiles) {
    referencedPathMap.set(normalizeFilePath(c.filePath), c.filePath);
  }

  const referencedEntries = Array.from(referencedPathMap.entries());

  const fabricatedFilePaths: string[] = [];
  for (const [, original] of referencedEntries) {
    const existsInRepo = repoFilePaths.some((rp) =>
      filePathsMatch(original, rp),
    );
    if (!existsInRepo) {
      fabricatedFilePaths.push(original);
    }
  }

  const totalReferencedFiles = referencedPathMap.size;
  const fabricatedFileRate =
    totalReferencedFiles === 0
      ? 0
      : fabricatedFilePaths.length / totalReferencedFiles;

  // ------------------------------------------------------------------
  // 2. Fabricated snippets
  // ------------------------------------------------------------------

  // Build a set of normalized paths that exist in the repo for quick lookup
  const realPathSet = new Set<string>();
  for (const [normPath] of referencedEntries) {
    const matchesRepo = repoFilePaths.some((rp) =>
      filePathsMatch(normPath, rp),
    );
    if (matchesRepo) {
      realPathSet.add(normPath);
    }
  }

  // Gather all snippets/excerpts
  const allSnippets: Array<{ text: string; filePath: string }> = [];
  for (const r of repoSearchResults) {
    if (r.snippet) {
      allSnippets.push({ text: r.snippet, filePath: r.filePath });
    }
  }
  for (const c of codeContextFiles) {
    if (c.excerpt) {
      allSnippets.push({ text: c.excerpt, filePath: c.filePath });
    }
  }

  // A snippet is fabricated if it belongs to a file that doesn't exist,
  // or if the file appears in the mustNotInclude list.
  const mustNotIncludeList = (evalCase.expectedRelevantFiles.mustNotInclude ?? [])
    .map((p) => normalizeFilePath(p));

  const fabricatedSnippets: {
    filePath: string;
    claimed: string;
    actual: string | null;
  }[] = [];

  for (const s of allSnippets) {
    const normPath = normalizeFilePath(s.filePath);
    const fileExists = realPathSet.has(normPath);
    const inMustNotInclude = mustNotIncludeList.some((mni) =>
      filePathsMatch(normPath, mni),
    );

    if (!fileExists || inMustNotInclude) {
      fabricatedSnippets.push({
        filePath: s.filePath,
        claimed: s.text.length > 200 ? s.text.slice(0, 200) + "…" : s.text,
        actual: null,
      });
    }
  }

  const fabricatedSnippetRate =
    allSnippets.length === 0
      ? 0
      : fabricatedSnippets.length / allSnippets.length;

  // ------------------------------------------------------------------
  // 3. Prohibited claims
  // ------------------------------------------------------------------

  const proposalLower = fixProposalText.toLowerCase();
  const prohibitedClaims: string[] = [];

  // Case-specific mustNotClaim
  const mustNotClaim = evalCase.expectedProposal.mustNotClaim ?? [];
  for (const claim of mustNotClaim) {
    if (proposalLower.includes(claim.toLowerCase())) {
      prohibitedClaims.push(claim);
    }
  }

  // Generic prohibited phrases
  for (const phrase of GENERIC_PROHIBITED_PHRASES) {
    if (proposalLower.includes(phrase.toLowerCase())) {
      prohibitedClaims.push(phrase);
    }
  }

  const totalClaimChecks =
    mustNotClaim.length + GENERIC_PROHIBITED_PHRASES.length;
  const prohibitedClaimRate =
    totalClaimChecks === 0 ? 0 : prohibitedClaims.length / totalClaimChecks;

  // ------------------------------------------------------------------
  // 4. Overall hallucination rate (weighted)
  // ------------------------------------------------------------------

  const overallHallucinationRate =
    0.5 * fabricatedFileRate +
    0.3 * prohibitedClaimRate +
    0.2 * fabricatedSnippetRate;

  return {
    fabricatedFilePaths,
    fabricatedFileRate,
    fabricatedSnippets,
    fabricatedSnippetRate,
    prohibitedClaims,
    prohibitedClaimRate,
    overallHallucinationRate,
  };
}
