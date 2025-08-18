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
function extractRoles(profile, token) {
  const roles = [];

  // Realm roles
  if (profile?.realm_access?.roles) {
    roles.push(...profile.realm_access.roles);
  } else if (token?.realm_access?.roles) {
    roles.push(...token.realm_access.roles);
  } else {
    console.warn("[Roles Debug] No realm roles found!");
  }

  // Client roles
  const resourceAccess = profile?.resource_access || token?.resource_access;
  if (resourceAccess) {
    const clientRoles =
      resourceAccess[process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID];
    if (clientRoles?.roles) {
      roles.push(...clientRoles.roles);
    } else {
      console.warn(
        `[Roles Debug] No client roles found for client: ${process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}`
      );
    }
  } else {
    console.warn(
      "[Roles Debug] No resource_access object found in profile/token!"
    );
  }

  if (roles.length === 0) {
    console.warn("[Roles Debug] No roles extracted at all!");
  } else {
    console.log("[Roles Debug] Extracted roles:", roles);
  }

  return roles;
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
        token.accessTokenExpires = 0;
        return token;
      }

      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at * 1000;

        token.roles = extractRoles(profile, account);
        console.log("[JWT Callback] token after storing roles:", token);
        return token;
      }

      if (Date.now() < token.accessTokenExpires) {
        console.log("[JWT Callback] token still valid, roles:", token.roles);
        return token;
      }

      const refreshedToken = await refreshAccessToken(token);
      console.log("[JWT Callback] token after refresh:", refreshedToken);
      return refreshedToken;
    },

    async session({ session, token }) {
      console.log("[Session Callback] token:", token);
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.roles = token.roles || [];
      console.log("[Session Callback] session.roles:", session.roles);
      return session;
    },
  },

  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
