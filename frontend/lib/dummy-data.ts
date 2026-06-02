import type { WorkflowState } from "@/types/workflow";

export const workflowSteps = [
  "Input Ticket",
  "Ticket Analysis",
  "Priority Classification",
  "Repository Search",
  "Code Context",
  "Fix Proposal",
  "Mentor Draft",
  "Human Review"
];

export const dummyWorkflow: WorkflowState = {
  id: "wf_20260602_001",
  status: "waiting_for_review",
  createdAt: "2026-06-02T09:10:00+07:00",
  updatedAt: "2026-06-02T09:27:00+07:00",
  ticket: {
    id: "TA-1042",
    title: "Checkout fails when customer uses a saved card",
    description:
      "Customer reports that checkout returns a 500 error after selecting a saved Visa card. New cards still work. Issue started after the latest payment settings rollout.",
    customer: "Acme Retail",
    environment: "production",
    channel: "Zendesk",
    createdAt: "2026-06-02T08:52:00+07:00"
  },
  analysis: {
    summary:
      "Saved-card checkout path fails after the payment settings rollout, while new-card checkout remains healthy.",
    symptoms: [
      "500 error appears after selecting saved card",
      "Only production is affected",
      "New card payment path succeeds"
    ],
    missingInfo: ["Affected account IDs", "Payment provider request ID", "Release version"]
  },
  priority: {
    level: "P1",
    reason: "Production checkout is blocked for returning customers using saved cards.",
    impact: "Revenue risk for repeat purchases and support escalation volume."
  },
  repoSearch: {
    query: "saved card checkout payment settings rollout",
    files: [
      "backend/src/payments/saved-card.service.ts",
      "backend/src/payments/payment-settings.ts",
      "backend/src/checkout/checkout.controller.ts"
    ]
  },
  codeContext: [
    {
      file: "saved-card.service.ts",
      note: "Reads stored card token and payment settings before creating the payment intent."
    },
    {
      file: "payment-settings.ts",
      note: "Rollout added a required merchant profile field that may be undefined for old saved cards."
    },
    {
      file: "checkout.controller.ts",
      note: "Returns generic 500 when payment intent creation throws an unhandled provider error."
    }
  ],
  fixProposal: {
    title: "Guard merchant profile lookup for saved-card payment intents",
    steps: [
      "Validate merchant profile before calling payment provider",
      "Fallback to account default profile when saved card metadata is missing",
      "Return actionable checkout error instead of generic 500",
      "Add regression tests for saved cards created before rollout"
    ],
    risks: [
      "Fallback profile must be confirmed with payment team",
      "Provider error mapping could affect existing checkout monitoring"
    ]
  },
  mentorDraft: {
    response:
      "Likely root cause is missing merchant profile metadata on older saved cards after the payment settings rollout. Proposed fix is to validate the profile, fallback to the account default where allowed, and add regression coverage. Mentor should confirm fallback behavior before implementation.",
    checklist: [
      "Confirm affected account IDs",
      "Check provider logs for missing merchant profile",
      "Approve fallback behavior with payment owner",
      "Review proposed regression tests"
    ]
  },
  trace: [
    {
      agent: "Ticket Intake Agent",
      status: "success",
      message: "Normalized ticket input and captured environment, customer, and channel.",
      startedAt: "09:10",
      finishedAt: "09:11",
      durationMs: 820
    },
    {
      agent: "Analysis Agent",
      status: "success",
      message: "Extracted symptoms, assumptions, and missing information.",
      startedAt: "09:11",
      finishedAt: "09:14",
      durationMs: 2810
    },
    {
      agent: "Priority Agent",
      status: "success",
      message: "Classified as P1 due to production checkout impact.",
      startedAt: "09:14",
      finishedAt: "09:15",
      durationMs: 940
    },
    {
      agent: "Repo Search Agent",
      status: "success",
      message: "Found likely payment and checkout files without sending the whole repo.",
      startedAt: "09:15",
      finishedAt: "09:20",
      durationMs: 4860
    },
    {
      agent: "Fix Proposal Agent",
      status: "success",
      message: "Prepared fix proposal and implementation risks.",
      startedAt: "09:20",
      finishedAt: "09:25",
      durationMs: 5120
    },
    {
      agent: "Mentor Draft Agent",
      status: "success",
      message: "Generated review-ready draft. Workflow is waiting for human review.",
      startedAt: "09:25",
      finishedAt: "09:27",
      durationMs: 2140
    }
  ]
};

export const queueTickets = [
  { id: "TA-1043", title: "Invoice export misses VAT column", priority: "P2", status: "created" },
  { id: "TA-1044", title: "Webhook retry storm after timeout", priority: "P1", status: "repo_searched" },
  { id: "TA-1045", title: "Wrong locale in password reset email", priority: "P3", status: "ticket_analyzed" }
];
