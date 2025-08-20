import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

/**
 * Refresh Keycloak access token when expired
 */
async function refreshAccessToken(token) {
  try {
    const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
    console.log("[Refresh Token] URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await response.json();
    console.log("[Refresh Token] Response:", refreshed);

    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (err) {
    console.error("[Refresh Token] Error:", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

/**
 * Extract roles from Keycloak profile or token
 */
function base64UrlDecode(input) {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8");
  } catch (e) {
    return "";
  }
}

function decodeJwtPayload(jwtString) {
  if (!jwtString || typeof jwtString !== "string" || !jwtString.includes(".")) {
    return null;
  }
  try {
    const [, payload] = jwtString.split(".");
    const json = base64UrlDecode(payload);
    return JSON.parse(json);
  } catch (e) {
    console.warn("[Roles Debug] Failed to decode JWT payload:", e?.message);
    return null;
  }
}

function extractRoles(profile, tokenOrAccount) {
  const roles = new Set();

  // 1) From profile (userinfo)
  if (profile?.realm_access?.roles) {
    profile.realm_access.roles.forEach((r) => roles.add(r));
  }
  // Collect roles from ALL clients in resource_access, not just the app client
  if (profile?.resource_access) {
    Object.values(profile.resource_access).forEach((entry) => {
      (entry?.roles || []).forEach((r) => roles.add(r));
    });
  }

  // 2) From decoded tokens (id_token/access_token)
  const maybeTokens = tokenOrAccount || {};
  const candidateJwtStrings = [];
  if (typeof maybeTokens === "string") {
    candidateJwtStrings.push(maybeTokens);
  } else {
    if (maybeTokens.id_token) candidateJwtStrings.push(maybeTokens.id_token);
    if (maybeTokens.access_token) candidateJwtStrings.push(maybeTokens.access_token);
  }

  for (const jwtString of candidateJwtStrings) {
    const decoded = decodeJwtPayload(jwtString);
    if (!decoded) continue;
    if (decoded.realm_access?.roles) {
      decoded.realm_access.roles.forEach((r) => roles.add(r));
    }
    // Collect roles from ALL clients present in the token
    if (decoded.resource_access) {
      Object.values(decoded.resource_access).forEach((entry) => {
        (entry?.roles || []).forEach((r) => roles.add(r));
      });
    }
  }

  const rolesArray = Array.from(roles);
  if (rolesArray.length === 0) {
    console.warn("[Roles Debug] No roles extracted at all!");
  } else {
    console.log("[Roles Debug] Extracted roles:", rolesArray);
  }
  return rolesArray;
}

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
      endSessionUrl: process.env.KEYCLOAK_LOGOUT_URL,

      profile(profile, token) {
        console.log("[Profile Callback] profile:", profile);
        console.log("[Profile Callback] token:", token);

        const roles = extractRoles(profile, token);
        console.log("[Profile Callback] extracted roles:", roles);

        return {
          id: profile.sub,
          name: profile.preferred_username,
          email: profile.email,
          roles,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      console.log("[JWT Callback] token before:", token);
      console.log("[JWT Callback] account:", account);
      console.log("[JWT Callback] profile:", profile);
      console.log("[JWT Callback] trigger:", trigger);

      if (trigger === "signOut") {
        token.roles = [];
        token.accessToken = null;
        token.refreshToken = null;
        token.idToken = null;
        token.accessTokenExpires = 0;
        return token;
      }

      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.accessTokenExpires = account.expires_at * 1000;

        // Extract roles from profile and by decoding id/access tokens as fallback
        token.roles = extractRoles(profile, account);
        console.log("[JWT Callback] token after storing roles:", token);
        // Fire-and-forget server-side sync so a first-time user gets org/client/roles
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000';
          fetch(`${apiUrl}/users/sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${account.access_token}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => {});
        } catch (_) {}
        return token;
      }

      if (Date.now() < token.accessTokenExpires) {
        console.log("[JWT Callback] token still valid, roles:", token.roles);
        return token;
      }

      console.log("[JWT Callback] token expired, refreshing access token");
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      console.log("[Session Callback] token:", token);
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.idToken = token.idToken;
      session.error = token.error;
      session.roles = token.roles || [];
      console.log("[Session Callback] session.roles:", session.roles);
      // If first-time login and no roles yet, hint owner routing on client
      session.isFirstLogin = (session.roles.length === 0);
      return session;
    },
  },

  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
