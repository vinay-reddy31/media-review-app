import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req });
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/dashboard")) {
    if (!token) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    const roles = token.roles || [];
    const hasAnyRole = roles.includes("owner") || roles.includes("reviewer") || roles.includes("viewer");

    // If user hits the base dashboard, route them to their primary dashboard
    if (url.pathname === "/dashboard") {
      // First-time users: if no roles yet in token, assume owner for their own org
      if (!hasAnyRole) {
        url.pathname = "/dashboard/owner";
        return NextResponse.redirect(url);
      }
      if (roles.includes("owner")) {
        url.pathname = "/dashboard/owner";
        return NextResponse.redirect(url);
      }
      if (roles.includes("reviewer")) {
        url.pathname = "/dashboard/reviewer";
        return NextResponse.redirect(url);
      }
      if (roles.includes("viewer")) {
        url.pathname = "/dashboard/viewer";
        return NextResponse.redirect(url);
      }
    }

      // Allow access to all dashboard types - users can see "no content" state
    // even if they don't have media shared with them yet
    // No role-based restrictions on dashboard access
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
