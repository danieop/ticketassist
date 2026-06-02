import { queueTickets } from "@/lib/dummy-data";

export function QueueSidebar() {
  return (
    <aside className="panel sidebar-panel" aria-labelledby="queue-title">
      <div className="panel-heading">
        <p className="eyebrow">Queue</p>
        <h2 id="queue-title">Incoming tickets</h2>
      </div>
      <div className="queue-list">
        {queueTickets.map((ticket) => (
          <article key={ticket.id}>
            <span>{ticket.id}</span>
            <h3>{ticket.title}</h3>
            <p>{ticket.priority} · {ticket.status}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
