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

      // Guard: if user tries to access a dashboard they don't have, redirect to their best
    const best = roles.includes("owner")
      ? "/dashboard/owner"
      : roles.includes("reviewer")
      ? "/dashboard/reviewer"
      : roles.includes("viewer")
      ? "/dashboard/viewer"
      : "/";

    // Allow first-time users (no roles yet) to access owner dashboard so onboarding can complete
    if (url.pathname.startsWith("/dashboard/owner") && !roles.includes("owner") && hasAnyRole) {
      url.pathname = best;
      return NextResponse.redirect(url);
    }
    if (url.pathname.startsWith("/dashboard/reviewer") && !roles.includes("reviewer") && hasAnyRole) {
      url.pathname = best;
      return NextResponse.redirect(url);
    }
    if (url.pathname.startsWith("/dashboard/viewer") && !roles.includes("viewer") && hasAnyRole) {
      url.pathname = best;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
