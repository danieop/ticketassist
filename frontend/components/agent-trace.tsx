import type { AgentTraceEntry } from "@/types/workflow";
import { StatusBadge } from "./status-badge";

export function AgentTrace({ trace }: { trace: AgentTraceEntry[] }) {
  return (
    <section className="panel" aria-labelledby="trace-title">
      <div className="panel-heading">
        <p className="eyebrow">Trace</p>
        <h2 id="trace-title">Agent activity</h2>
      </div>
      <div className="trace-list">
        {trace.map((entry) => (
          <article className="trace-item" key={`${entry.agent}-${entry.startedAt}`}>
            <div>
              <h3>{entry.agent}</h3>
              <p>{entry.message}</p>
            </div>
            <div className="trace-meta">
              <StatusBadge status={entry.status} />
              <span>{entry.finishedAt ?? entry.startedAt}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
