// server/middleware/requireRole.js
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user has the required role
    const userRoles = req.user.realm_access?.roles || req.user.roles || [];
    
    if (!userRoles.includes(role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${role}' required.`,
        userRoles: userRoles 
      });
    }

    next();
  };
}
