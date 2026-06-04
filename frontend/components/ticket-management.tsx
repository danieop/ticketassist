"use client";

import { useEffect, useMemo, useState } from "react";

type TicketSource = "EMAIL" | "SLACK" | "ZENDESK" | "JIRA" | "MANUAL";

type TicketRow = {
  id: string;
  title: string;
  description: string;
  reporterName: string;
  source: TicketSource;
  reporterId?: string | null;
  workflowRunCount: number;
  latestWorkflowRun?: {
    id: string;
    status: string;
    startedAt: string;
    finishedAt?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type TicketFormState = {
  title: string;
  description: string;
  reporterName: string;
  source: TicketSource;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ticketSources: TicketSource[] = ["MANUAL", "EMAIL", "SLACK", "ZENDESK", "JIRA"];

const emptyForm: TicketFormState = {
  title: "",
  description: "",
  reporterName: "",
  source: "MANUAL"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

async function getResponseErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    issues?: { message?: string }[];
  } | null;

  return body?.issues?.[0]?.message ?? body?.message ?? "Request failed";
}

function toFormState(ticket: TicketRow): TicketFormState {
  return {
    title: ticket.title,
    description: ticket.description,
    reporterName: ticket.reporterName,
    source: ticket.source
  };
}

export function TicketManagement() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [form, setForm] = useState<TicketFormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"" | TicketSource>("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  const loadTickets = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (sourceFilter) {
        params.set("source", sourceFilter);
      }

      const query = params.toString();
      const response = await fetch(`${apiBaseUrl}/api/tickets${query ? `?${query}` : ""}`);

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const data = (await response.json()) as TicketRow[];
      setTickets(data);

      if (selectedTicketId && !data.some((ticket) => ticket.id === selectedTicketId)) {
        setSelectedTicketId("");
      }

      setStatusMessage(data.length === 0 ? "No tickets found." : `Loaded ${data.length} tickets.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const updateField = (field: keyof TicketFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const startCreate = () => {
    setSelectedTicketId("");
    setForm(emptyForm);
    setStatusMessage("Ready to create a ticket.");
  };

  const startEdit = (ticket: TicketRow) => {
    setSelectedTicketId(ticket.id);
    setForm(toFormState(ticket));
    setStatusMessage(`Editing ${ticket.title}.`);
  };

  const saveTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        reporterName: form.reporterName.trim() || "Unknown reporter",
        source: form.source
      };

      const response = await fetch(
        selectedTicket ? `${apiBaseUrl}/api/tickets/${selectedTicket.id}` : `${apiBaseUrl}/api/tickets`,
        {
          method: selectedTicket ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const savedTicket = (await response.json()) as TicketRow;

      setTickets((current) => {
        const withoutSaved = current.filter((ticket) => ticket.id !== savedTicket.id);
        return [savedTicket, ...withoutSaved];
      });
      setSelectedTicketId(savedTicket.id);
      setForm(toFormState(savedTicket));
      setStatusMessage(selectedTicket ? "Ticket updated." : "Ticket created.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTicket = async (ticket: TicketRow) => {
    const confirmed = window.confirm(`Delete ticket "${ticket.title}"?`);

    if (!confirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/tickets/${ticket.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      setTickets((current) => current.filter((item) => item.id !== ticket.id));

      if (selectedTicketId === ticket.id) {
        setSelectedTicketId("");
        setForm(emptyForm);
      }

      setStatusMessage("Ticket deleted.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="ticket-management">
      <div className="ticket-management-toolbar">
        <div>
          <p className="eyebrow">Tickets</p>
          <h2>Ticket queue</h2>
        </div>
        <div className="ticket-toolbar-actions">
          <button className="secondary-action compact-action" disabled={isLoading} onClick={() => void loadTickets()} type="button">
            {isLoading ? "Loading" : "Refresh"}
          </button>
          <button className="primary-action compact-action" onClick={startCreate} type="button">
            New
          </button>
        </div>
      </div>

      <div className="ticket-crud-grid">
        <aside className="panel ticket-crud-sidebar">
          <form className="ticket-filter-form" onSubmit={(event) => {
            event.preventDefault();
            void loadTickets();
          }}>
            <label>
              <span>Search</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title, reporter, description"
                type="search"
                value={search}
              />
            </label>
            <label>
              <span>Source</span>
              <select
                onChange={(event) => setSourceFilter(event.target.value as "" | TicketSource)}
                value={sourceFilter}
              >
                <option value="">All sources</option>
                {ticketSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-action" disabled={isLoading} type="submit">
              Apply
            </button>
          </form>

          <div className="ticket-list">
            {tickets.map((ticket) => (
              <article
                className={`ticket-list-item ${ticket.id === selectedTicketId ? "ticket-list-item-active" : ""}`}
                key={ticket.id}
              >
                <button onClick={() => startEdit(ticket)} type="button">
                  <span>{ticket.source}</span>
                  <strong>{ticket.title}</strong>
                  <small>
                    {ticket.reporterName} - {formatDate(ticket.createdAt)}
                  </small>
                </button>
              </article>
            ))}
            {tickets.length === 0 ? <p className="muted-text">No tickets available.</p> : null}
          </div>
        </aside>

        <section className="panel ticket-editor-panel">
          <div className="panel-heading row-heading">
            <div>
              <p className="eyebrow">{selectedTicket ? "Edit ticket" : "Create ticket"}</p>
              <h2>{selectedTicket ? selectedTicket.title : "New ticket"}</h2>
            </div>
            {selectedTicket ? (
              <button
                className="danger-action"
                disabled={isSaving}
                onClick={() => void deleteTicket(selectedTicket)}
                type="button"
              >
                Delete
              </button>
            ) : null}
          </div>

          {statusMessage ? <p className="repo-status-message">{statusMessage}</p> : null}

          <form className="ticket-editor-form" onSubmit={(event) => void saveTicket(event)}>
            <label>
              <span>Title</span>
              <input
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Checkout fails after payment retry"
                required
                type="text"
                value={form.title}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Describe the symptom, affected environment, and any available logs."
                required
                rows={7}
                value={form.description}
              />
            </label>
            <div className="ticket-form-row">
              <label>
                <span>Reporter</span>
                <input
                  onChange={(event) => updateField("reporterName", event.target.value)}
                  placeholder="Customer or teammate"
                  type="text"
                  value={form.reporterName}
                />
              </label>
              <label>
                <span>Source</span>
                <select
                  onChange={(event) => updateField("source", event.target.value)}
                  value={form.source}
                >
                  {ticketSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ticket-editor-actions">
              <button className="primary-action" disabled={isSaving} type="submit">
                {isSaving ? "Saving" : selectedTicket ? "Update ticket" : "Create ticket"}
              </button>
              <button className="secondary-action" onClick={startCreate} type="button">
                Clear
              </button>
            </div>
          </form>

          {selectedTicket ? (
            <dl className="ticket-detail-meta">
              <div>
                <dt>Ticket ID</dt>
                <dd>{selectedTicket.id}</dd>
              </div>
              <div>
                <dt>Workflows</dt>
                <dd>{selectedTicket.workflowRunCount}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(selectedTicket.updatedAt)}</dd>
              </div>
              <div>
                <dt>Latest workflow</dt>
                <dd>{selectedTicket.latestWorkflowRun?.status ?? "None"}</dd>
              </div>
            </dl>
          ) : null}
        </section>
      </div>
    </section>
  );
}
