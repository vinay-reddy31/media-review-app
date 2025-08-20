// server/middleware/verifyKeycloakToken.js
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import dotenv from "dotenv";

dotenv.config();

const client = jwksClient({
  jwksUri: process.env.KEYCLOAK_JWKS_URI,
});

console.log(
  "JWKS URI:",
  `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`
);

// Get signing key dynamically
function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      console.error("Error getting signing key", err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export function verifyKeycloakToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    console.error("No Authorization header found");
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    console.error("Malformed Authorization header");
    return res.status(401).json({ error: "Invalid token format" });
  }

  const allowedAudiences = [
    process.env.KEYCLOAK_CLIENT_ID,
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
    'account',
  ].filter(Boolean);

  jwt.verify(
    token,
    getKey,
    {
      audience: allowedAudiences,
      issuer: `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}`,
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        console.error("JWT verification failed", err.message);
        return res.status(403).json({ error: "Invalid or expired token" });
      }

      console.log("✅ Token verified, decoded payload:", decoded);
      req.user = decoded;
      next();
    }
  );
}
