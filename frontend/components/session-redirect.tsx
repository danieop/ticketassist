"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type UserRole = "DEVELOPER" | "MENTOR" | "ADMIN";

const rolePaths: Record<UserRole, string> = {
  DEVELOPER: "/developer",
  MENTOR: "/mentor",
  ADMIN: "/admin"
};

export function getStoredRolePath() {
  try {
    const rawUser = localStorage.getItem("ticketassist_user");

    if (!rawUser) {
      return null;
    }

    const user = JSON.parse(rawUser) as { role?: UserRole };

    if (!user.role || !(user.role in rolePaths)) {
      return null;
    }

    return rolePaths[user.role];
  } catch {
    return null;
  }
}

export function SessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    const rolePath = getStoredRolePath();

    if (rolePath) {
      router.replace(rolePath);
    }
  }, [router]);

  return null;
}
