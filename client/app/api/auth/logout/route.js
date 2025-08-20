// client/app/api/auth/logout/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route.js";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ success: false, message: "No active session" }, { status: 401 });
    }

    const keycloakLogoutUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
    const postLogoutRedirect = process.env.NEXTAUTH_URL || 'http://localhost:3001';

    const logoutUrl = new URL(keycloakLogoutUrl);
    logoutUrl.searchParams.set('client_id', clientId);
    logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirect);

    // Prefer id_token_hint for SSO session logout
    if (session.idToken) {
      logoutUrl.searchParams.set('id_token_hint', session.idToken);
    }

    return NextResponse.json({ 
      success: true, 
      logoutUrl: logoutUrl.toString()
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Logout failed", 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.redirect(new URL('/api/auth/signout', request.url));
}
