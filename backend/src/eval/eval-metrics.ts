import type {
  EvalCase,
  RetrievalMetrics,
  HallucinationMetrics,
  ProposalMetrics,
  PriorityMetrics,
  AggregateMetrics,
} from "./eval-config.js";

/* ------------------------------------------------------------------ */
/*  Path helpers                                                      */
/* ------------------------------------------------------------------ */

function normalizePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .toLowerCase();
}

function pathsMatch(a: string, b: string): boolean {
  const na = normalizePath(a);
  const nb = normalizePath(b);
  return na === nb || na.endsWith("/" + nb) || nb.endsWith("/" + na);
}

/* ------------------------------------------------------------------ */
/*  Retrieval metrics                                                 */
/* ------------------------------------------------------------------ */

export function computeRetrievalMetrics(
  returnedFiles: string[],
  expectedFiles: EvalCase["expectedRelevantFiles"],
): RetrievalMetrics {
  const mustInclude = expectedFiles.mustInclude;
  const allExpected = [
    ...mustInclude,
    ...(expectedFiles.shouldInclude ?? []),
  ];

  // True positives: returned files that match any expected file
  const truePositives = returnedFiles.filter((rf) =>
    allExpected.some((ef) => pathsMatch(rf, ef)),
  );

  // False positives: returned files that DON'T match any expected file
  const falsePositives = returnedFiles.filter(
    (rf) => !allExpected.some((ef) => pathsMatch(rf, ef)),
  );

  // False negatives: mustInclude files not found in returned files
  const falseNegatives = mustInclude.filter(
    (mi) => !returnedFiles.some((rf) => pathsMatch(rf, mi)),
  );

  const precision =
    returnedFiles.length === 0
      ? 0
      : truePositives.length / returnedFiles.length;

  // Recall is measured only against mustInclude
  const matchedMustInclude = mustInclude.filter((mi) =>
    returnedFiles.some((rf) => pathsMatch(rf, mi)),
  );
  const recall =
    mustInclude.length === 0
      ? 0
      : matchedMustInclude.length / mustInclude.length;

  const f1Score =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  // MRR: 1 / rank of first true positive (considering all expected)
  let mrr = 0;
  for (let i = 0; i < returnedFiles.length; i++) {
    if (allExpected.some((ef) => pathsMatch(returnedFiles[i], ef))) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  // Per-mustInclude file ranks
  const fileRanks: { filePath: string; rank: number | null }[] =
    mustInclude.map((mi) => {
      const idx = returnedFiles.findIndex((rf) => pathsMatch(rf, mi));
      return { filePath: mi, rank: idx === -1 ? null : idx + 1 };
    });

  return {
    precision,
    recall,
    f1Score,
    mrr,
    truePositives,
    falsePositives,
    falseNegatives,
    returnedFiles,
    expectedFiles: allExpected,
    fileRanks,
  };
}

/* ------------------------------------------------------------------ */
/*  Proposal metrics                                                  */
/* ------------------------------------------------------------------ */

export function computeProposalMetrics(
  fixProposal: any,
  expectedProposal: EvalCase["expectedProposal"],
): ProposalMetrics {
  if (fixProposal == null) {
    return {
      conceptCoverage: 0,
      missingConcepts: [...expectedProposal.mustMentionConcepts],
      hasHypotheses: false,
      hasSteps: false,
      hasRisks: false,
      hasVerificationSteps: false,
      structuralScore: 0,
      approachValid: expectedProposal.acceptableApproaches ? false : null,
      aiConfidence: 0,
      overallScore: 0,
    };
  }

  // ------ concept coverage ------
  const searchableFields: string[] = [
    fixProposal.title,
    ...(Array.isArray(fixProposal.hypotheses) ? fixProposal.hypotheses : []),
    fixProposal.recommendedApproach,
    ...(Array.isArray(fixProposal.steps) ? fixProposal.steps : []),
    ...(Array.isArray(fixProposal.risks) ? fixProposal.risks : []),
    ...(Array.isArray(fixProposal.verificationSteps)
      ? fixProposal.verificationSteps
      : []),
  ]
    .filter(Boolean)
    .map((v: unknown) => (typeof v === "string" ? v : JSON.stringify(v)));

  const haystack = searchableFields.join(" ").toLowerCase();

  const expectedConcepts = expectedProposal.mustMentionConcepts;
  const matched = expectedConcepts.filter((c) =>
    haystack.includes(c.toLowerCase()),
  );
  const missingConcepts = expectedConcepts.filter(
    (c) => !haystack.includes(c.toLowerCase()),
  );
  const conceptCoverage =
    expectedConcepts.length === 0
      ? 1
      : matched.length / expectedConcepts.length;

  // ------ structural fields ------
  const hasHypotheses =
    Array.isArray(fixProposal.hypotheses) && fixProposal.hypotheses.length > 0;
  const hasSteps =
    Array.isArray(fixProposal.steps) && fixProposal.steps.length > 0;
  const hasRisks =
    Array.isArray(fixProposal.risks) && fixProposal.risks.length > 0;
  const hasVerificationSteps =
    Array.isArray(fixProposal.verificationSteps) &&
    fixProposal.verificationSteps.length > 0;

  const presentCount =
    (hasHypotheses ? 1 : 0) +
    (hasSteps ? 1 : 0) +
    (hasRisks ? 1 : 0) +
    (hasVerificationSteps ? 1 : 0);
  const structuralScore = presentCount / 4;

  // ------ approach validity ------
  let approachValid: boolean | null = null;
  if (expectedProposal.acceptableApproaches) {
    const approach = (fixProposal.recommendedApproach ?? "").toLowerCase();
    approachValid = expectedProposal.acceptableApproaches.some((aa) =>
      approach.includes(aa.toLowerCase()),
    );
  }

  // ------ confidence ------
  const aiConfidence: number =
    typeof fixProposal.confidence === "number" ? fixProposal.confidence : 0;

  // ------ overall score ------
  const approachComponent =
    approachValid === true ? 1 : approachValid === null ? 0.5 : 0;
  const overallScore =
    0.4 * conceptCoverage +
    0.3 * structuralScore +
    0.15 * approachComponent +
    0.15 * Math.min(aiConfidence, 1);

  return {
    conceptCoverage,
    missingConcepts,
    hasHypotheses,
    hasSteps,
    hasRisks,
    hasVerificationSteps,
    structuralScore,
    approachValid,
    aiConfidence,
    overallScore,
  };
}

/* ------------------------------------------------------------------ */
/*  Priority metrics                                                  */
/* ------------------------------------------------------------------ */

export function computePriorityMetrics(
  actualPriority: string | undefined,
  expected: EvalCase["expectedPriority"],
): PriorityMetrics {
  const actual = (actualPriority ?? "").toLowerCase().trim();
  const expectedLevel = expected.level.toLowerCase().trim();

  const isExactMatch = actual === expectedLevel;

  const acceptableAlts = (expected.acceptableAlternatives ?? []).map((a) =>
    a.toLowerCase().trim(),
  );
  const isAcceptable = isExactMatch || acceptableAlts.includes(actual);

  return {
    expected: expected.level,
    actual: actualPriority ?? "",
    isExactMatch,
    isAcceptable,
  };
}

/* ------------------------------------------------------------------ */
/*  Aggregate metrics                                                 */
/* ------------------------------------------------------------------ */

export function computeAggregateMetrics(
  results: Array<{
    retrieval: RetrievalMetrics;
    hallucination: HallucinationMetrics;
    proposal: ProposalMetrics;
    priority: PriorityMetrics;
  }>,
): AggregateMetrics {
  const n = results.length;
  if (n === 0) {
    return {
      totalCases: 0,
      avgPrecision: 0,
      avgRecall: 0,
      avgF1: 0,
      avgMRR: 0,
      avgHallucinationRate: 0,
      avgFabricatedFileRate: 0,
      avgProposalScore: 0,
      priorityAccuracy: 0,
      priorityAcceptableRate: 0,
    };
  }

  const sum = (vals: number[]) => vals.reduce((a, b) => a + b, 0);

  const avgPrecision = sum(results.map((r) => r.retrieval.precision)) / n;
  const avgRecall = sum(results.map((r) => r.retrieval.recall)) / n;
  const avgF1 = sum(results.map((r) => r.retrieval.f1Score)) / n;
  const avgMRR = sum(results.map((r) => r.retrieval.mrr)) / n;

  const avgHallucinationRate =
    sum(results.map((r) => r.hallucination.overallHallucinationRate)) / n;
  const avgFabricatedFileRate =
    sum(results.map((r) => r.hallucination.fabricatedFileRate)) / n;

  const avgProposalScore =
    sum(results.map((r) => r.proposal.overallScore)) / n;

  const priorityAccuracy =
    sum(results.map((r) => (r.priority.isExactMatch ? 1 : 0))) / n;
  const priorityAcceptableRate =
    sum(results.map((r) => (r.priority.isAcceptable ? 1 : 0))) / n;

  return {
    totalCases: n,
    avgPrecision,
    avgRecall,
    avgF1,
    avgMRR,
    avgHallucinationRate,
    avgFabricatedFileRate,
    avgProposalScore,
    priorityAccuracy,
    priorityAcceptableRate,
  };
}
