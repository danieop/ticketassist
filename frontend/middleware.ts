import { NextResponse, type NextRequest } from "next/server";

type UserRole = "DEVELOPER" | "MENTOR" | "ADMIN";

const rolePaths: Record<UserRole, string> = {
  DEVELOPER: "/developer",
  MENTOR: "/mentor",
  ADMIN: "/admin"
};

const protectedPathRoles: Record<string, UserRole[]> = {
  "/developer": ["DEVELOPER", "ADMIN"],
  "/tickets": ["DEVELOPER", "ADMIN"],
  "/codebase": ["DEVELOPER", "ADMIN"],
  "/mentor": ["MENTOR", "ADMIN"],
  "/admin": ["ADMIN"]
};

function getSession(request: NextRequest) {
  const accessToken = request.cookies.get("ticketassist_access_token")?.value;
  const role = request.cookies.get("ticketassist_user_role")?.value as UserRole | undefined;

  if (!accessToken || !role || !(role in rolePaths)) {
    return null;
  }

  return { accessToken, role };
}

export function middleware(request: NextRequest) {
  const session = getSession(request);
  const pathname = request.nextUrl.pathname;

  if ((pathname === "/" || pathname === "/login" || pathname === "/register") && session) {
    return NextResponse.redirect(new URL(rolePaths[session.role], request.url));
  }

  const allowedRoles = protectedPathRoles[pathname];

  if (!allowedRoles) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!allowedRoles.includes(session.role)) {
    return NextResponse.redirect(new URL(rolePaths[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/developer", "/mentor", "/admin", "/tickets", "/codebase"]
};
