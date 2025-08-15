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
    if (roles.includes("owner") && url.pathname !== "/dashboard/owner") {
      url.pathname = "/dashboard/owner";
      return NextResponse.redirect(url);
    }
    if (roles.includes("reviewer") && url.pathname !== "/dashboard/reviewer") {
      url.pathname = "/dashboard/reviewer";
      return NextResponse.redirect(url);
    }
    if (roles.includes("viewer") && url.pathname !== "/dashboard/viewer") {
      url.pathname = "/dashboard/viewer";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
