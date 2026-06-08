"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "./loading-spinner";

type UserRole = "DEVELOPER" | "MENTOR" | "ADMIN";
type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

type RegistrationRequestRow = {
  id: string;
  name: string;
  email: string;
  role: Exclude<UserRole, "ADMIN">;
  status: RegistrationStatus;
  createdAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const dummyUsers: UserRow[] = [
  {
    id: "usr-demo-admin",
    name: "Admin TicketAssist",
    email: "admin@ticketassist.local",
    role: "ADMIN",
    createdAt: "2026-06-03T02:00:00.000Z"
  },
  {
    id: "usr-demo-dev",
    name: "Nguyen Minh",
    email: "minh.dev@example.com",
    role: "DEVELOPER",
    createdAt: "2026-06-02T08:30:00.000Z"
  },
  {
    id: "usr-demo-mentor",
    name: "Tran Linh",
    email: "linh.mentor@example.com",
    role: "MENTOR",
    createdAt: "2026-06-02T10:15:00.000Z"
  }
];

const dummyRequests: RegistrationRequestRow[] = [
  {
    id: "req-demo-1",
    name: "Le An",
    email: "an.dev@example.com",
    role: "DEVELOPER",
    status: "PENDING",
    createdAt: "2026-06-03T03:10:00.000Z"
  },
  {
    id: "req-demo-2",
    name: "Pham Ha",
    email: "ha.mentor@example.com",
    role: "MENTOR",
    status: "PENDING",
    createdAt: "2026-06-03T03:40:00.000Z"
  }
];

function getAccessToken() {
  return localStorage.getItem("ticketassist_access_token") ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserRow[]>(dummyUsers);
  const [requests, setRequests] = useState<RegistrationRequestRow[]>(dummyRequests);
  const [status, setStatus] = useState("Showing dummy data until an admin session is available.");
  const [isLoading, setIsLoading] = useState(false);

  const loadAdminData = async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      return;
    }

    setIsLoading(true);

    try {
      const [usersResponse, requestsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/users`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        fetch(`${apiBaseUrl}/api/users/registration-requests?status=PENDING`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);

      if (!usersResponse.ok || !requestsResponse.ok) {
        throw new Error("Unable to load admin data");
      }

      setUsers((await usersResponse.json()) as UserRow[]);
      setRequests((await requestsResponse.json()) as RegistrationRequestRow[]);
      setStatus("Loaded live admin data.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load admin data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const reviewRequest = async (id: string, decision: "approve" | "reject") => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setRequests((current) => current.filter((request) => request.id !== id));
      setStatus(`Dummy request ${decision === "approve" ? "approved" : "rejected"}.`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/registration-requests/${id}/${decision}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: decision === "reject" ? JSON.stringify({ reason: "Rejected by admin" }) : undefined
      });

      if (!response.ok) {
        throw new Error("Review action failed");
      }

      await loadAdminData();
      setStatus(`Registration request ${decision === "approve" ? "approved" : "rejected"}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Review action failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="admin-management">
      <div className="panel">
        <div className="row-heading">
          <div className="panel-heading">
            <p className="eyebrow">User management</p>
            <h2>Registration approval queue</h2>
          </div>
          <button className="secondary-action" disabled={isLoading} onClick={() => void loadAdminData()} type="button">
            {isLoading ? <LoadingSpinner /> : null}
            {isLoading ? "Refreshing" : "Refresh"}
          </button>
        </div>
        <p className="muted-text">{status}</p>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Requested</span>
            <span>Actions</span>
          </div>
          {requests.map((request) => (
            <div className="admin-table-row" key={request.id}>
              <span>{request.name}</span>
              <span>{request.email}</span>
              <span>{request.role}</span>
              <span>{formatDate(request.createdAt)}</span>
              <span className="admin-actions">
                <button disabled={isLoading} type="button" onClick={() => void reviewRequest(request.id, "approve")}>
                  {isLoading ? <LoadingSpinner /> : null}
                  Approve
                </button>
                <button disabled={isLoading} type="button" onClick={() => void reviewRequest(request.id, "reject")}>
                  {isLoading ? <LoadingSpinner /> : null}
                  Reject
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Current users</p>
          <h2>Role access</h2>
        </div>
        <div className="admin-table user-table">
          <div className="admin-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
          </div>
          {users.map((user) => (
            <div className="admin-table-row" key={user.id}>
              <span>{user.name}</span>
              <span>{user.email}</span>
              <span>{user.role}</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
