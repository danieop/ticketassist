import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { env } from "../config/env.js";
import { callJsonChat } from "./llm.service.js";
import { repoSearchService, generateQueryTerms, generateSemanticQuery } from "./repo-search.service.js";
import {
  appendError,
  appendTrace,
  nowIso,
  priorityClassificationSchema,
  repoSearchSchema,
  ticketAnalysisSchema,
  type PriorityClassification,
  type TicketAnalysis,
  type TicketWorkflowState
} from "./workflow-state.js";

const WorkflowAnnotation = Annotation.Root({
  state: Annotation<TicketWorkflowState>({
    reducer: (_current, update) => update
  })
});

type GraphInput = typeof WorkflowAnnotation.State;

function summarizeText(text: string, maxLength = 220) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function splitFacts(description: string) {
  const sentences = description
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  return sentences.slice(0, 6);
}

function detectAffectedFeature(text: string) {
  const lowerText = text.toLowerCase();
  const featureTerms = [
    "checkout",
    "coupon",
    "discount",
    "payment",
    "login",
    "signup",
    "cart",
    "order",
    "profile",
    "email",
    "password",
    "feedback",
    "product",
    "card"
  ];

  return featureTerms.find((term) => lowerText.includes(term));
}

function deterministicTicketAnalysis(state: TicketWorkflowState): TicketAnalysis {
  const description = state.ticket.description.trim();
  const facts = splitFacts(description);
  const title = state.ticket.title?.trim();
  const affectedFeature = detectAffectedFeature(`${title ?? ""} ${description}`);

  return ticketAnalysisSchema.parse({
    summary: summarizeText(facts[0] ?? description),
    keyFacts: facts.length > 0 ? facts : [summarizeText(description)],
    affectedFeature,
    suspectedFlow: affectedFeature ? `${affectedFeature} flow` : undefined,
    missingInfo: [
      "Exact reproduction steps",
      "Affected environment/version",
      "Relevant logs or request IDs"
    ]
  });
}

async function analyzeTicketWithLlm(state: TicketWorkflowState): Promise<TicketAnalysis> {
  const result = await callJsonChat({
    model: env.AI_MODEL_ANALYZER,
    messages: [
      {
        role: "system",
        content:
          "You are TicketAnalyzerAgent. Analyze only the bug ticket. Do not classify priority. Do not search code. Return JSON only with keys: summary, keyFacts, affectedFeature, suspectedFlow, missingInfo."
      },
      {
        role: "user",
        content: JSON.stringify({
          title: state.ticket.title,
          description: state.ticket.description,
          metadata: state.ticket.metadata,
          requiredJsonShape: {
            summary: "string",
            keyFacts: ["string"],
            affectedFeature: "optional string",
            suspectedFlow: "optional string",
            missingInfo: ["optional string"]
          }
        })
      }
    ]
  });

  return ticketAnalysisSchema.parse(result);
}

function classifyPriority(state: TicketWorkflowState): PriorityClassification {
  const text = [
    state.ticket.title,
    state.ticket.description,
    state.analysis?.summary,
    ...(state.analysis?.keyFacts ?? [])
  ]
    .join(" ")
    .toLowerCase();

  const criticalSignals = [
    "production outage",
    "system crash",
    "data loss",
    "security",
    "vulnerability",
    "payment completely broken",
    "authentication completely broken",
    "many users blocked"
  ];
  const highSignals = [
    "production",
    "multiple users",
    "core feature",
    "checkout",
    "payment",
    "login",
    "no workaround",
    "blocked"
  ];
  const lowSignals = ["typo", "visual", "minor ui", "logging", "cosmetic"];

  const criticalScore = criticalSignals.filter((signal) => text.includes(signal)).length;
  const highScore = highSignals.filter((signal) => text.includes(signal)).length;
  const lowScore = lowSignals.filter((signal) => text.includes(signal)).length;

  if (criticalScore > 0) {
    return priorityClassificationSchema.parse({
      level: "critical",
      reason: "Critical production, security, data-loss, or complete core-workflow failure signal was found.",
      confidence: Math.min(0.95, 0.75 + criticalScore * 0.08),
      severity: "critical",
      businessImpact: "Core users or business operations may be fully blocked."
    });
  }

  if (highScore >= 2) {
    return priorityClassificationSchema.parse({
      level: "high",
      reason: "The ticket affects a core or production workflow and indicates meaningful user impact.",
      confidence: Math.min(0.9, 0.62 + highScore * 0.06),
      severity: "major",
      businessImpact: "Important user workflow is degraded or blocked."
    });
  }

  if (lowScore > 0 && highScore === 0) {
    return priorityClassificationSchema.parse({
      level: "low",
      reason: "The ticket appears limited to minor UI, copy, logging, or cosmetic impact.",
      confidence: 0.72,
      severity: "minor",
      businessImpact: "Low business impact."
    });
  }

  return priorityClassificationSchema.parse({
    level: "medium",
    reason: "A functional defect is described, but the available information does not prove broad or critical impact.",
    confidence: 0.68,
    severity: "major",
    businessImpact: "Limited or unconfirmed user impact."
  });
}

async function classifyPriorityWithLlm(state: TicketWorkflowState): Promise<PriorityClassification> {
  const result = await callJsonChat({
    model: env.AI_MODEL_PRIORITY,
    messages: [
      {
        role: "system",
        content:
          "You are PriorityClassifierAgent. Classify only ticket priority from the ticket and prior analysis. Do not search code. Return JSON only with keys: level, reason, confidence, severity, businessImpact. level must be low, medium, high, or critical. confidence must be 0 to 1. severity must be minor, major, or critical."
      },
      {
        role: "user",
        content: JSON.stringify({
          ticket: state.ticket,
          analysis: state.analysis,
          priorityRules: {
            critical: [
              "production outage",
              "complete system crash",
              "data loss",
              "security vulnerability",
              "payment completely broken",
              "authentication completely broken",
              "many users blocked from a core workflow"
            ],
            high: [
              "core feature broken",
              "multiple users affected",
              "no easy workaround",
              "major business impact"
            ],
            medium: [
              "functional bug exists",
              "workaround available",
              "limited user impact",
              "non-critical workflow degraded"
            ],
            low: ["typo", "visual issue", "logging issue", "minor UI problem", "no core workflow impact"]
          },
          requiredJsonShape: {
            level: "low | medium | high | critical",
            reason: "string",
            confidence: "number 0..1",
            severity: "optional minor | major | critical",
            businessImpact: "optional string"
          }
        })
      }
    ]
  });

  return priorityClassificationSchema.parse(result);
}

async function ticketAnalyzerNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "TicketAnalyzerAgent",
    action: "Analyze incoming bug ticket",
    status: "started",
    inputSummary: summarizeText(input.state.ticket.description)
  });

  try {
    if (started.status !== "created") {
      throw new Error(`TicketAnalyzerAgent expected status created but received ${started.status}`);
    }

    if (!started.ticket.description.trim()) {
      throw new Error("Ticket description is required");
    }

    let analysis: TicketAnalysis;
    let outputSummary: string;

    try {
      analysis = await analyzeTicketWithLlm(started);
      outputSummary = `LLM ${env.AI_MODEL_ANALYZER}: ${analysis.summary}`;
    } catch (llmError) {
      analysis = deterministicTicketAnalysis(started);
      outputSummary = `LLM fallback used: ${
        llmError instanceof Error ? llmError.message : "ticket analysis LLM failed"
      }. ${analysis.summary}`;
    }

    const completed = appendTrace(
      {
        ...started,
        status: "ticket_analyzed",
        analysis,
        updatedAt: nowIso()
      },
      {
        agent: "TicketAnalyzerAgent",
        action: "Stored ticket analysis",
        status: "completed",
        outputSummary
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "TicketAnalyzerAgent",
        message: error instanceof Error ? error.message : "Ticket analysis failed",
        recoverable: false
      }),
      {
        agent: "TicketAnalyzerAgent",
        action: "Analyze incoming bug ticket",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Ticket analysis failed"
      }
    );

    return { state: failed };
  }
}

async function priorityClassifierNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "PriorityClassifierAgent",
    action: "Classify ticket priority",
    status: "started",
    inputSummary: input.state.analysis?.summary
  });

  try {
    if (started.status !== "ticket_analyzed") {
      throw new Error(`PriorityClassifierAgent expected status ticket_analyzed but received ${started.status}`);
    }

    if (!started.analysis) {
      throw new Error("Ticket analysis is required before priority classification");
    }

    let priority: PriorityClassification;
    let outputSummary: string;

    try {
      priority = await classifyPriorityWithLlm(started);
      outputSummary = `LLM ${env.AI_MODEL_PRIORITY}: ${priority.level}: ${priority.reason}`;
    } catch (llmError) {
      priority = classifyPriority(started);
      outputSummary = `LLM fallback used: ${
        llmError instanceof Error ? llmError.message : "priority classification LLM failed"
      }. ${priority.level}: ${priority.reason}`;
    }

    const completed = appendTrace(
      {
        ...started,
        status: "priority_classified",
        priority,
        updatedAt: nowIso()
      },
      {
        agent: "PriorityClassifierAgent",
        action: "Stored priority classification",
        status: "completed",
        outputSummary
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "PriorityClassifierAgent",
        message: error instanceof Error ? error.message : "Priority classification failed",
        recoverable: false
      }),
      {
        agent: "PriorityClassifierAgent",
        action: "Classify ticket priority",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Priority classification failed"
      }
    );

    return { state: failed };
  }
}

async function repoSearchNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "RepoSearchAgent",
    action: "Search repository context",
    status: "started",
    inputSummary: input.state.analysis?.summary
  });

  try {
    if (started.status !== "priority_classified") {
      throw new Error(`RepoSearchAgent expected status priority_classified but received ${started.status}`);
    }

    if (!started.analysis) {
      throw new Error("Ticket analysis is required before repository search");
    }

    if (!started.priority) {
      throw new Error("Priority classification is required before repository search");
    }

    if (!started.repoConfig.repositoryId || !started.repoConfig.repoPath) {
      throw new Error("Readable repository configuration is required");
    }

    const queryTerms = generateQueryTerms({
      ticketTitle: started.ticket.title,
      ticketDescription: started.ticket.description,
      analysis: started.analysis
    });
    const semanticQuery = generateSemanticQuery({
      ticketTitle: started.ticket.title,
      ticketDescription: started.ticket.description,
      analysis: started.analysis,
      priority: started.priority
    });
    const search = await repoSearchService.search({
      repositoryId: started.repoConfig.repositoryId,
      indexName: started.repoConfig.indexName,
      queryTerms,
      semanticQuery,
      strategy: started.repoConfig.retrievalStrategy,
      maxResults: started.repoConfig.maxResults,
      forceReindex: started.repoConfig.forceReindex
    });
    const repoSearch = repoSearchSchema.parse({
      queryTerms,
      semanticQuery,
      strategy: started.repoConfig.retrievalStrategy,
      indexStatus: search.indexStatus,
      results: search.results,
      searchedAt: nowIso(),
      warnings: search.warnings
    });
    const completed = appendTrace(
      {
        ...started,
        status: "repo_searched",
        repoSearch,
        updatedAt: nowIso()
      },
      {
        agent: "RepoSearchAgent",
        action: "Stored repository search results",
        status: "completed",
        outputSummary: `Found ${repoSearch.results.length} repository result(s)`
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "RepoSearchAgent",
        message: error instanceof Error ? error.message : "Repository search failed",
        recoverable: false
      }),
      {
        agent: "RepoSearchAgent",
        action: "Search repository context",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Repository search failed"
      }
    );

    return { state: failed };
  }
}

function nextOrEnd(input: GraphInput) {
  return input.state.status === "failed" ? END : "next";
}

const compiledWorkflowGraph = new StateGraph(WorkflowAnnotation)
  .addNode("ticketAnalyzerNode", ticketAnalyzerNode)
  .addNode("priorityClassifierNode", priorityClassifierNode)
  .addNode("repoSearchNode", repoSearchNode)
  .addEdge(START, "ticketAnalyzerNode")
  .addConditionalEdges("ticketAnalyzerNode", nextOrEnd, {
    next: "priorityClassifierNode",
    [END]: END
  })
  .addConditionalEdges("priorityClassifierNode", nextOrEnd, {
    next: "repoSearchNode",
    [END]: END
  })
  .addEdge("repoSearchNode", END)
  .compile();

export async function runTicketWorkflow(initialState: TicketWorkflowState) {
  const result = await compiledWorkflowGraph.invoke({ state: initialState });
  return result.state;
}
