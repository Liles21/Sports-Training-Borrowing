import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const borrowerRoutes = ["/dashboard", "/equipment", "/borrow", "/history"];

function getRoleFromToken(token: string): "admin" | "borrower" | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { role?: string };

    return decoded.role === "admin" ? "admin" : decoded.role === "borrower" ? "borrower" : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("gym_token")?.value;
  const role = token ? getRoleFromToken(token) : null;

  if (pathname === "/") {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    if (role === "borrower") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" || pathname === "/register") {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    if (role === "borrower") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isBorrowerRoute = borrowerRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if ((isAdminRoute || isBorrowerRoute) && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isBorrowerRoute && role !== "borrower") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*", "/equipment/:path*", "/borrow/:path*", "/history/:path*", "/admin/:path*"],
};
