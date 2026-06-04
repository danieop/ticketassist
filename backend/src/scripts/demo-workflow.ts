import { workflowService } from "../services/workflow.service.js";

async function main() {
  const workflow = await workflowService.create({
    retrievalStrategy: "hybrid",
    forceReindex: false,
    maxResults: 10,
    ticket: {
      title: "User cannot submit checkout form after entering coupon code",
      description:
        "When a user enters a coupon code and clicks Place Order, the checkout page shows a spinner forever. No order is created. This happens on production for multiple users. Removing the coupon allows checkout to work.",
      reporterName: "Demo Reporter",
      source: "MANUAL"
    }
  });

  const agentStatuses = workflow.agents.map((agent) => `${agent.agent.type}:${agent.status}`);

  console.log(
    JSON.stringify(
      {
        id: workflow.id,
        status: workflow.status,
        agents: agentStatuses,
        traceCount: workflow.trace.length,
        repoSearchResultCount: workflow.repoSearchResults.length,
        state: workflow.state
      },
      null,
      2
    )
  );

  if (workflow.status !== "repo_searched") {
    throw new Error(`Expected repo_searched status, received ${workflow.status}`);
  }

  if (workflow.agents.length !== 3 || workflow.agents.some((agent) => agent.status !== "success")) {
    throw new Error("Expected exactly three successful business agent runs");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
