"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "./loading-spinner";
import { authFetch, getAccessToken } from "@/lib/auth-client";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<RegistrationRequestRow[]>([]);
  const [status, setStatus] = useState("Loading live admin data.");
  const [isLoading, setIsLoading] = useState(false);

  const loadAdminData = async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setUsers([]);
      setRequests([]);
      setStatus("Login as an admin to load live user data.");
      return;
    }

    setIsLoading(true);

    try {
      const [usersResponse, requestsResponse] = await Promise.all([
        authFetch(`${apiBaseUrl}/api/users`),
        authFetch(`${apiBaseUrl}/api/users/registration-requests?status=PENDING`)
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
      setStatus("Login as an admin before reviewing registration requests.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authFetch(`${apiBaseUrl}/api/users/registration-requests/${id}/${decision}`, {
        method: "POST",
        headers: {
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
          {requests.length === 0 ? <p className="muted-text">No pending registration requests.</p> : null}
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
          {users.length === 0 ? <p className="muted-text">No live users loaded.</p> : null}
        </div>
      </div>
    </section>
  );
}
