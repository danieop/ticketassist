import { NextResponse, type NextRequest } from "next/server";

type UserRole = "DEVELOPER" | "MENTOR" | "ADMIN";

const rolePaths: Record<UserRole, string> = {
  DEVELOPER: "/developer",
  MENTOR: "/mentor",
  ADMIN: "/admin"
};

const protectedPaths: Record<string, UserRole> = {
  "/developer": "DEVELOPER",
  "/mentor": "MENTOR",
  "/admin": "ADMIN"
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

  // 1. ĐÃ ĐĂNG NHẬP: Chặn không cho vào lại trang Auth hoặc trang chủ
  if ((pathname === "/" || pathname === "/login" || pathname === "/register") && session) {
    return NextResponse.redirect(new URL(rolePaths[session.role], request.url));
  }

  // Lấy role yêu cầu cho route hiện tại
  // (Sử dụng protectedPaths như code gốc hoặc getRequiredRole như mình gợi ý)
  const requiredRole = protectedPaths[pathname]; 

  // 2. ROUTE PUBLIC: Các trang không bị khóa (như /, /login, /register)
  // ĐÂY LÀ BƯỚC QUAN TRỌNG NHẤT: Nếu không yêu cầu role, phải cho qua NGAY LẬP TỨC
  if (!requiredRole) {
    return NextResponse.next();
  }

  // 3. CHƯA ĐĂNG NHẬP: Cố truy cập route bị khóa -> Bắt về /login
  // Lưu ý: Block này phải nằm DƯỚI block "ROUTE PUBLIC"
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. SAI ROLE: Đã đăng nhập nhưng không có quyền vào route này
  if (session.role !== requiredRole) {
    return NextResponse.redirect(new URL(rolePaths[session.role], request.url));
  }

  // 5. Hợp lệ
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/developer", "/mentor", "/admin"]
};
