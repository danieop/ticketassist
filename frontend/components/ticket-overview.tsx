import type { WorkflowState } from "@/types/workflow";
import { StatusBadge } from "./status-badge";

export function TicketOverview({ workflow }: { workflow: WorkflowState }) {
  return (
    <section className="panel ticket-panel" aria-labelledby="ticket-title">
      <div className="panel-heading row-heading">
        <div>
          <p className="eyebrow">Active ticket</p>
          <h2 id="ticket-title">{workflow.ticket.title}</h2>
        </div>
        <StatusBadge status={workflow.status} />
      </div>

      <p className="ticket-description">{workflow.ticket.description}</p>

      <dl className="ticket-meta">
        <div>
          <dt>Ticket ID</dt>
          <dd>{workflow.ticket.id}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{workflow.ticket.customer}</dd>
        </div>
        <div>
          <dt>Environment</dt>
          <dd>{workflow.ticket.environment}</dd>
        </div>
        <div>
          <dt>Channel</dt>
          <dd>{workflow.ticket.channel}</dd>
        </div>
      </dl>
    </section>
  );
}
