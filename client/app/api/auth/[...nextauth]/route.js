import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { jwtDecode } from "jwt-decode";

export const authOptions = {
  providers: [
    Keycloak({
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, account }) {
      // Attach accessToken and roles from the Keycloak access_token
      if (account?.access_token) {
        token.accessToken = account.access_token;
        try {
          const decoded = jwtDecode(account.access_token);
          token.roles =
            decoded?.realm_access?.roles ||
            decoded?.resource_access?.["media-review-client"]?.roles ||
            [];
        } catch (_) {
          token.roles = [];
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.roles = token.roles || [];
      return session;
    },
  },
  pages: {
    signIn: "/", // landing acts as sign-in
    signOut: "/",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
