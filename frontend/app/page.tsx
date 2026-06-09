import { SessionRedirect } from "@/components/session-redirect";
import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell">
      <SessionRedirect />
      <header className="topbar">
        <div>
          <p className="eyebrow">TicketAssist</p>
          <h1>AI-assisted ticket triage</h1>
          <p className="muted-text">
            Login to run the live sequential-agent workflow, browse codebases, or review mentor drafts.
          </p>
        </div>
        <div className="topbar-actions">
          <Link className="secondary-action" href="/login">Login</Link>
          <Link className="primary-action" href="/register">Register</Link>
        </div>
      </header>

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Developer</p>
            <h2>Run ticket workflows</h2>
          </div>
          <p className="muted-text">
            Create tickets, inspect each agent handoff, edit outputs, rerun agents, and submit drafts to mentors.
          </p>
          <Link className="primary-action compact-action" href="/login">
            Login as developer
          </Link>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Mentor</p>
            <h2>Review submitted drafts</h2>
          </div>
          <p className="muted-text">
            Approve, reject, or request more information before any developer proceeds with implementation.
          </p>
          <Link className="secondary-action compact-action" href="/login">
            Login as mentor
          </Link>
        </article>
      </section>
    </main>
  );
}
