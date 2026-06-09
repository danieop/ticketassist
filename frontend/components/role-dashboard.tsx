"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation"; // Dùng next/navigation cho App Router

type RoleKey = "developer" | "mentor" | "admin";

type RoleDashboardProps = {
  role: RoleKey;
  children?: ReactNode;
};

type DashboardHeaderEventDetail = {
  title?: string;
  description?: string;
  loading?: boolean;
};

const dashboards = {
  developer: {
    eyebrow: "Developer workspace",
    title: "My assigned ticket queue",
    description: "Track tickets that need reproduction, scoped code context, and implementation notes.",
    metrics: [
      { label: "Assigned tickets", value: "8", tone: "info" },
      { label: "Waiting mentor", value: "3", tone: "warning" },
      { label: "Ready to patch", value: "2", tone: "success" },
      { label: "Blocked", value: "1" }
    ],
    primaryTitle: "Active tickets",
    items: [
      {
        title: "Checkout saved card fails",
        meta: "P2 · checkout-service · waiting logs",
        body: "Reproduce payment retry path and confirm gateway timeout code before patching."
      },
      {
        title: "Invoice export timezone mismatch",
        meta: "P3 · billing-api · ready to patch",
        body: "Dummy search scoped formatter and CSV serializer. Add regression around GMT+7 export."
      },
      {
        title: "Slack ticket sync creates duplicates",
        meta: "P2 · integrations · mentor review",
        body: "Potential missing idempotency key in webhook handler."
      }
    ],
    secondaryTitle: "Implementation checklist",
    checklist: [
      "Create failing test before editing service logic",
      "Attach workflow run ID to pull request notes",
      "Request mentor approval when impact is unclear"
    ]
  },
  mentor: {
    eyebrow: "Mentor review",
    title: "Review AI-assisted triage output",
    description: "Approve, reject, or request more information before developers move to implementation.",
    metrics: [
      { label: "Pending reviews", value: "6", tone: "warning" },
      { label: "Approved today", value: "4", tone: "success" },
      { label: "Need info", value: "2" },
      { label: "Avg review time", value: "18m", tone: "info" }
    ],
    primaryTitle: "Review queue",
    items: [
      {
        title: "Payment retry proposal",
        meta: "Developer: Linh · confidence 82%",
        body: "Validate whether retry policy belongs in gateway adapter or checkout orchestration."
      },
      {
        title: "Repository context for invoice bug",
        meta: "Developer: Minh · confidence 76%",
        body: "Confirm timezone assumption and ask for customer locale if missing."
      },
      {
        title: "Mentor draft for duplicate Slack sync",
        meta: "Developer: An · confidence 68%",
        body: "Likely needs production webhook sample before approval."
      }
    ],
    secondaryTitle: "Decision guide",
    checklist: [
      "Approve only when reproduction and scope are specific",
      "Reject proposals that claim the bug is fixed from analysis alone",
      "Request missing logs, account IDs, or release windows early"
    ]
  },
  admin: {
    eyebrow: "Admin console",
    title: "System health and user operations",
    description: "Monitor role access, repository uploads, workflow throughput, and auth sessions.",
    metrics: [
      { label: "Total users", value: "42", tone: "info" },
      { label: "Active sessions", value: "27", tone: "success" },
      { label: "Failed workflows", value: "3", tone: "warning" },
      { label: "Repos indexed", value: "14" }
    ],
    primaryTitle: "Operations snapshot",
    items: [
      {
        title: "Google auth enabled",
        meta: "OAuth client configured",
        body: "Login and registration can use Google ID tokens when client IDs are set in env."
      },
      {
        title: "Repository upload queue",
        meta: "2 uploads today · 0 failed",
        body: "Dummy storage status shows all latest repository snapshots are ready for workflows."
      },
      {
        title: "User role changes",
        meta: "3 updates this week",
        body: "Review ADMIN assignments and mentor permissions before production rollout."
      }
    ],
    secondaryTitle: "Admin actions",
    checklist: [
      "Audit stale refresh token records weekly",
      "Review users with ADMIN role",
      "Track workflow failure rate before enabling AI agents"
    ]
  }
} as const;

export function RoleDashboard({ role, children }: RoleDashboardProps) {
  const dashboard = dashboards[role];
  const router = useRouter();
  const [headerOverride, setHeaderOverride] = useState<DashboardHeaderEventDetail>({});

  useEffect(() => {
    setHeaderOverride({});

    const updateHeader = (event: Event) => {
      setHeaderOverride((event as CustomEvent<DashboardHeaderEventDetail>).detail ?? {});
    };

    window.addEventListener("ticketassist:dashboard-header", updateHeader);

    return () => {
      window.removeEventListener("ticketassist:dashboard-header", updateHeader);
    };
  }, [role]);

  const headerTitle = headerOverride.title ?? dashboard.title;
  const headerDescription = headerOverride.description ?? dashboard.description;

const handleSwitchAccount = async (e: React.MouseEvent) => {
  e.preventDefault();

  // 1. Xóa toàn bộ Cookies
  document.cookie = "ticketassist_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "ticketassist_user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  // 2. Xóa toàn bộ LocalStorage (ĐÂY LÀ PHẦN BỔ SUNG QUAN TRỌNG)
  localStorage.removeItem("ticketassist_access_token");
  localStorage.removeItem("ticketassist_refresh_token");
  localStorage.removeItem("ticketassist_token");
  localStorage.removeItem("ticketassist_user");

  // 3. Chuyển hướng và làm mới cache
  router.push("/login");
  router.refresh(); 
};

  return (
    <main className="role-shell">
      <header className="role-header">
        <div>
          <p className="eyebrow">{dashboard.eyebrow}</p>
          {headerOverride.loading ? <span className="role-title-skeleton" /> : <h1>{headerTitle}</h1>}
          <p>{headerDescription}</p>
        </div>
        <div className="topbar-actions">
          <Link className="secondary-action" href="/tickets">
            Tickets
          </Link>
          <button 
            className="secondary-action" 
            onClick={handleSwitchAccount}
            style={{ cursor: "pointer" }}
          >
            Switch account
          </button>
        </div>
      </header>

      {/* <section className="metrics-row" aria-label={`${dashboard.eyebrow} metrics`}>
        {dashboard.metrics.map((metric) => (
          <article
            className={`metric-card ${"tone" in metric ? `metric-${metric.tone}` : ""}`}
            key={metric.label}
          >
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section> */}

      {/* <section className="role-grid">
        <div className="panel">
          <div className="panel-heading">
            <p className="eyebrow">{dashboard.primaryTitle}</p>
            <h2>Today</h2>
          </div>
          <div className="role-list">
            {dashboard.items.map((item) => (
              <article key={item.title}>
                <span>{item.meta}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel">
          <div className="panel-heading">
            <p className="eyebrow">{dashboard.secondaryTitle}</p>
            <h2>Focus</h2>
          </div>
          <ul className="clean-list">
            {dashboard.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section> */}

      {children}
    </main>
  );
}
