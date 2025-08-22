// server/middleware/requireRole.js
import { UserOrganizationMap } from "../models/index.js";

export function requireRole(requiredRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    // Collect user roles from realm and all clients
    const realmRoles = req.user.realm_access?.roles || [];
    const resourceAccess = req.user.resource_access || {};
    const allClientRoles = Object.values(resourceAccess)
      .flatMap((entry) => entry?.roles || []);
    const userRolesFromToken = [...new Set([...(realmRoles || []), ...allClientRoles, ...(req.user.roles || [])])];

    let allowed = rolesToCheck.some(r => userRolesFromToken.includes(r));

    // Fallback: check DB mappings if token lacks roles (first-time sync case)
    if (!allowed) {
      try {
        const dbMaps = await UserOrganizationMap.findAll({ where: { userId: req.user.sub, status: 'active' } });
        const dbRoles = [...new Set(dbMaps.map(m => m.roleName))];
        allowed = rolesToCheck.some(r => dbRoles.includes(r));
        if (allowed) {
          req.user.roles = Array.from(new Set([...(req.user.roles || []), ...dbRoles]));
        }
      } catch (_) {}
    }

    if (!allowed) {
      return res.status(403).json({ 
        error: `Access denied. One of roles [${rolesToCheck.join(', ')}] required.`,
        userRoles: userRolesFromToken 
      });
    }

    next();
  };
}
