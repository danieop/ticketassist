"use client";

import { useEffect, useState, useCallback } from "react";
import { MetricCard } from "@/components/metric-card";
import { authFetch } from "@/lib/auth-client";
import { apiBaseUrl, getResponseErrorMessage } from "@/lib/workflow-api";
import type {
  QualityDashboardApi,
  AgentQualitySummaryApi,
  AgentQualityDetailApi,
  AgentQualityDetailItemApi
} from "@/lib/workflow-api";

function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getToneForApproval(approved: number, reviewed: number): "success" | "warning" | "info" {
  if (reviewed === 0) return "info";
  const rate = approved / reviewed;
  if (rate >= 0.8) return "success";
  if (rate >= 0.5) return "warning";
  return "warning";
}

export function QualityDashboard() {
  const [dashboard, setDashboard] = useState<QualityDashboardApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<AgentQualityDetailApi | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(1);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${apiBaseUrl}/api/workflows/quality`);

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      setDashboard((await response.json()) as QualityDashboardApi);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(
    async (agentType: string, page: number) => {
      setDetailLoading(true);

      try {
        const response = await authFetch(
          `${apiBaseUrl}/api/workflows/quality/agent/${encodeURIComponent(agentType)}/detail?page=${page}&limit=20`
        );

        if (!response.ok) {
          throw new Error(await getResponseErrorMessage(response));
        }

        setDetailData((await response.json()) as AgentQualityDetailApi);
      } catch (err) {
        setDetailData(null);
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleAgentClick = (agentType: string) => {
    if (selectedAgent === agentType) {
      setSelectedAgent(null);
      setDetailData(null);
      return;
    }

    setSelectedAgent(agentType);
    setDetailPage(1);
    loadDetail(agentType, 1);
  };

  const handleDetailPageChange = (newPage: number) => {
    setDetailPage(newPage);

    if (selectedAgent) {
      loadDetail(selectedAgent, newPage);
    }
  };

  if (loading) {
    return (
      <div className="quality-dashboard">
        <div className="metrics-row">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="metric-card" style={{ minHeight: 92 }} />
          ))}
        </div>
        <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>
          Loading agent quality data...
        </p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="quality-dashboard">
        <p style={{ color: "var(--red)", textAlign: "center", padding: "32px 0" }}>
          {error ?? "Failed to load dashboard"}
        </p>
        <button className="secondary-action" onClick={loadDashboard} style={{ margin: "0 auto", display: "block" }}>
          Retry
        </button>
      </div>
    );
  }

  const agentTypes = Object.keys(dashboard.agents).sort();

  return (
    <div className="quality-dashboard">
      <section className="metrics-row" aria-label="Overall quality metrics">
        <MetricCard label="Total Reviewed" value={String(dashboard.totalReviewed)} tone="info" />
        <MetricCard
          label="Approval Rate"
          value={formatPercent(dashboard.approvalRate)}
          tone="success"
        />
        <MetricCard
          label="Rework Rate"
          value={formatPercent(dashboard.reworkRate)}
          tone="warning"
        />
        <MetricCard
          label="Rejection Rate"
          value={formatPercent(dashboard.rejectionRate)}
          tone="warning"
        />
      </section>

      <section className="quality-agent-grid" aria-label="Per-agent quality scores">
        {agentTypes.map((agentType) => {
          const agent = dashboard.agents[agentType];
          const isSelected = selectedAgent === agentType;
          const approvalTone = getToneForApproval(agent.approvedWorkflows, agent.reviewedWorkflows);
          const llmRate =
            agent.totalRuns > 0 ? `${Math.round((agent.llmRuns / agent.totalRuns) * 100)}%` : "0%";
          const approvalLabel =
            agent.reviewedWorkflows > 0
              ? `${Math.round((agent.approvedWorkflows / agent.reviewedWorkflows) * 100)}%`
              : "N/A";

          return (
            <article
              key={agentType}
              className={`quality-agent-card${isSelected ? " quality-agent-card-selected" : ""}`}
              onClick={() => handleAgentClick(agentType)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleAgentClick(agentType);
              }}
            >
              <h3>{agent.label}</h3>

              <div className="quality-agent-metrics">
                <div className="quality-agent-metric-group">
                  <span className="quality-agent-metric-label">LLM Usage</span>
                  <span className="quality-agent-metric-value">{llmRate} LLM</span>
                </div>
                <div className="quality-agent-metric-group">
                  <span className="quality-agent-metric-label">Approval</span>
                  <span className={`quality-agent-metric-value quality-agent-metric-value-${approvalTone}`}>
                    {approvalLabel} approved
                  </span>
                </div>
                <div className="quality-agent-metric-group">
                  <span className="quality-agent-metric-label">Avg Latency</span>
                  <span className="quality-agent-metric-value">{formatMs(agent.averageLatencyMs)}</span>
                </div>
              </div>

              <div className="quality-agent-details">
                <p>
                  {agent.totalRuns} runs ({agent.llmRuns} LLM, {agent.fallbackRuns} fallback)
                </p>
                <p>
                  {agent.reviewedWorkflows} reviewed ({agent.approvedWorkflows} approved, {agent.rejectedWorkflows} rejected,{" "}
                  {agent.needsInfoWorkflows} needs info)
                </p>
                <p>
                  {agent.totalEdits} edits ({agent.workflowsWithEdits} workflows), {agent.totalReruns} reruns (
                  {agent.workflowsWithReruns} workflows)
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {selectedAgent && (
        <section className="quality-drilldown" aria-label={`Detail for ${dashboard.agentLabels[selectedAgent] ?? selectedAgent}`}>
          <div className="quality-drilldown-header">
            <h3>{dashboard.agentLabels[selectedAgent] ?? selectedAgent} — Workflow Runs</h3>
          </div>

          {detailLoading ? (
            <p style={{ color: "var(--muted)", padding: "16px 0" }}>Loading...</p>
          ) : !detailData || detailData.items.length === 0 ? (
            <p style={{ color: "var(--muted)", padding: "16px 0" }}>No workflow runs found for this agent.</p>
          ) : (
            <>
              <div className="quality-drilldown-table">
                <div className="quality-drilldown-row quality-drilldown-row-header">
                  <span>Ticket</span>
                  <span>Status</span>
                  <span>Review</span>
                  <span>LLM?</span>
                  <span>Edits</span>
                  <span>Reruns</span>
                  <span>Latency</span>
                </div>
                {detailData.items.map((item: AgentQualityDetailItemApi) => (
                  <a
                    key={item.agentRunId}
                    href={`/developer/workflow/${item.workflowRunId}`}
                    className="quality-drilldown-row"
                  >
                    <span className="quality-drilldown-ticket">{item.ticketTitle}</span>
                    <span>
                      <span className={`status-badge status-${item.workflowStatus}`}>
                        {item.workflowStatus.replace(/_/g, " ")}
                      </span>
                    </span>
                    <span>
                      {item.mentorDecision ? (
                        <span
                          className={`status-badge ${
                            item.mentorDecision === "APPROVED"
                              ? "status-success"
                              : item.mentorDecision === "REJECTED"
                                ? "status-failed"
                                : "status-running"
                          }`}
                        >
                          {item.mentorDecision.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </span>
                    <span>{item.usedLlm ? "Yes" : "No"}</span>
                    <span>{item.editCount}</span>
                    <span>{item.rerunCount}</span>
                    <span>{item.latencyMs !== null ? formatMs(item.latencyMs) : "—"}</span>
                  </a>
                ))}
              </div>

              <div className="quality-drilldown-pagination">
                <button
                  className="secondary-action"
                  disabled={detailPage <= 1}
                  onClick={() => handleDetailPageChange(detailPage - 1)}
                >
                  Previous
                </button>
                <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                  Page {detailPage} of {detailData.totalPages} ({detailData.total} total)
                </span>
                <button
                  className="secondary-action"
                  disabled={detailPage >= detailData.totalPages}
                  onClick={() => handleDetailPageChange(detailPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
