import Link from "next/link";
import { TicketManagement } from "@/components/ticket-management";

export default function TicketsPage() {
  return (
    <main className="ticket-shell">
      <header className="codebase-header">
        <div>
          <p className="eyebrow">TicketAssist</p>
          <h1>Ticket management</h1>
        </div>
        <Link className="secondary-action" href="/">
          Dashboard
        </Link>
      </header>

      <TicketManagement />
    </main>
  );
}
