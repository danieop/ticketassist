import { NextResponse, type NextRequest } from "next/server";

type UserRole = "DEVELOPER" | "MENTOR" | "ADMIN";

const rolePaths: Record<UserRole, string> = {
  DEVELOPER: "/developer",
  MENTOR: "/mentor",
  ADMIN: "/admin"
};

const protectedPathRoles: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/developer", roles: ["DEVELOPER", "ADMIN"] },
  { prefix: "/tickets", roles: ["DEVELOPER", "ADMIN"] },
  { prefix: "/codebase", roles: ["DEVELOPER", "ADMIN"] },
  { prefix: "/mentor", roles: ["MENTOR", "ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/quality", roles: ["MENTOR", "ADMIN"] }
];

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

  const allowedRoles = protectedPathRoles.find(
    (item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)
  )?.roles;

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
  matcher: [
    "/",
    "/login",
    "/register",
    "/developer/:path*",
    "/mentor/:path*",
    "/admin/:path*",
    "/tickets/:path*",
    "/codebase/:path*",
    "/quality/:path*"
  ]
};
