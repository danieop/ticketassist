"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "./loading-spinner";
import { getStoredRolePath } from "./session-redirect";

type AuthMode = "login" | "register";
type UserRole = "DEVELOPER" | "MENTOR" | "ADMIN";
type RegistrationRole = Exclude<UserRole, "ADMIN">;

type AuthFormProps = {
  mode: AuthMode;
};

type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  status?: "PENDING_APPROVAL";
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null;
  };
  registrationRequest?: {
    id: string;
    email: string;
    role: RegistrationRole;
    status: "PENDING" | "APPROVED" | "REJECTED";
  };
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme: "outline" | "filled_blue" | "filled_black";
              size: "large" | "medium" | "small";
              width?: number;
              text?: "signin_with" | "signup_with" | "continue_with";
            }
          ) => void;
        };
      };
    };
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function getRolePath(role: UserRole) {
  return {
    DEVELOPER: "/developer",
    MENTOR: "/mentor",
    ADMIN: "/admin"
  }[role];
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; samesite=lax`;
}

function saveSession(data: Required<Pick<AuthResponse, "accessToken" | "refreshToken" | "user">>) {
  localStorage.setItem("ticketassist_access_token", data.accessToken);
  localStorage.setItem("ticketassist_refresh_token", data.refreshToken);
  localStorage.setItem("ticketassist_token", data.accessToken);
  localStorage.setItem("ticketassist_user", JSON.stringify(data.user));
  setCookie("ticketassist_access_token", data.accessToken);
  setCookie("ticketassist_user_role", data.user.role);
}

async function parseApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegistrationRole>("DEVELOPER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";
  const title = isRegister ? "Create your account" : "Welcome back";
  const subtitle = isRegister
    ? "Register a TicketAssist account to submit tickets and review workflow output."
    : "Login to continue triaging tickets with your team.";

  useEffect(() => {
    const rolePath = getStoredRolePath();

    if (rolePath) {
      router.replace(rolePath);
    }
  }, [router]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    const handleGoogleCredential = async (idToken?: string) => {
      if (!idToken) {
        setError("Google did not return a credential.");
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setStatus(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, role })
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const data = (await response.json()) as AuthResponse;

        if (data.status === "PENDING_APPROVAL") {
          setStatus(data.message ?? "Registration request is waiting for admin approval.");
          return;
        }

        if (!data.accessToken || !data.refreshToken || !data.user) {
          throw new Error("Invalid auth response");
        }

        saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user
        });
        
        setStatus(`Signed in as ${data.user.name}.`);
        router.replace(getRolePath(data.user.role));
        router.refresh(); // Ép Next.js xóa cache và nhận diện Cookie mới
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Google login failed");
      } finally {
        setIsSubmitting(false);
      }
    };

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => void handleGoogleCredential(response.credential)
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: isRegister ? "signup_with" : "signin_with"
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=en";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [isRegister, role]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister ? { name, email, password, role } : { email, password };
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as AuthResponse;

      if (data.status === "PENDING_APPROVAL") {
        setStatus(data.message ?? "Registration request is waiting for admin approval.");
        return;
      }

      if (!data.accessToken || !data.refreshToken || !data.user) {
        throw new Error("Invalid auth response");
      }

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user
      });
      
      setStatus(`Logged in as ${data.user.name}.`);
      router.replace(getRolePath(data.user.role));
      router.refresh(); // Ép Next.js xóa cache và nhận diện Cookie mới
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-heading">
          <p className="eyebrow">TicketAssist</p>
          <h1 id="auth-title">{title}</h1>
          <p>{subtitle}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <label>
              Full name
              <input
                autoComplete="name"
                minLength={2}
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                type="text"
                value={name}
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {isRegister ? (
            <label>
              Role
              <select
                name="role"
                onChange={(event) => setRole(event.target.value as RegistrationRole)}
                value={role}
              >
                <option value="DEVELOPER">Developer</option>
                <option value="MENTOR">Mentor</option>
              </select>
            </label>
          ) : null}

          <button className="primary-action" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoadingSpinner /> : null}
            {isSubmitting ? "Please wait..." : isRegister ? "Create account" : "Login"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <p>or</p>
          <span />
        </div>

        {googleClientId ? (
          <div className="google-auth-block">
            {/* Đã bọc biến isRegister để chỉ hiện chọn Role khi đăng ký */}
            {isRegister ? (
              <label>
                Role for new Google accounts
                <select
                  onChange={(event) => setRole(event.target.value as RegistrationRole)}
                  value={role}
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="MENTOR">Mentor</option>
                </select>
              </label>
            ) : null}
            
            <div className="google-button" ref={googleButtonRef} />
          </div>
        ) : (
          <p className="auth-note">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google login.</p>
        )}

        {error ? <p className="auth-message error-message">{error}</p> : null}
        {status ? <p className="auth-message success-message">{status}</p> : null}

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Login" : "Register"}
          </Link>
        </p>
      </section>
    </main>
  );
}
