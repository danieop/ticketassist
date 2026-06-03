import { AgentTrace } from "@/components/agent-trace";
import { AnalysisBoard } from "@/components/analysis-board";
import { MentorReview } from "@/components/mentor-review";
import { MetricCard } from "@/components/metric-card";
import { QueueSidebar } from "@/components/queue-sidebar";
import { SessionRedirect } from "@/components/session-redirect";
import { TicketOverview } from "@/components/ticket-overview";
import { WorkflowTimeline } from "@/components/workflow-timeline";
import { dummyWorkflow } from "@/lib/dummy-data";
import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell">
      <SessionRedirect />
      <header className="topbar">
        <div>
          <p className="eyebrow">TicketAssist</p>
          <h1>Bug ticket analysis workspace</h1>
        </div>
        <div className="topbar-actions">
          <Link className="secondary-action" href="/codebase">Codebase</Link>
          <Link className="secondary-action" href="/tickets">Tickets</Link>
          <Link className="secondary-action" href="/login">Login</Link>
          <Link className="primary-action" href="/register">Register</Link>
        </div>
      </header>

      <section className="metrics-row" aria-label="Workflow metrics">
        <MetricCard label="Active workflow" value="1" tone="info" />
        <MetricCard label="Waiting review" value="1" tone="warning" />
        <MetricCard label="Agents passed" value="6/6" tone="success" />
        <MetricCard label="Repo files scoped" value="3" />
      </section>

      <div className="workspace-grid">
        <div className="main-column">
          <TicketOverview workflow={dummyWorkflow} />
          <WorkflowTimeline />
          <AnalysisBoard workflow={dummyWorkflow} />
          <MentorReview workflow={dummyWorkflow} />
        </div>
        <div className="side-column">
          <QueueSidebar />
          <AgentTrace trace={dummyWorkflow.trace} />
        </div>
      </div>
    </main>
  );
}
