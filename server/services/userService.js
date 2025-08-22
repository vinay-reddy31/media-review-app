// server/services/userService.js
import { UserOrganizationMap, Organization, Client, Role } from '../models/index.js';
import OrganizationService from './organizationService.js';

class UserService {
  static async getUserContext(userId) {
    const maps = await UserOrganizationMap.findAll({
      where: { userId, status: 'active' },
      include: [
        { model: Organization, as: 'organization', attributes: ['id','name'] },
        { model: Client, as: 'client', attributes: ['id','clientId','name'] },
        { model: Role, as: 'role', attributes: ['id','name'] },
      ],
      order: [['createdAt','ASC']],
    });
    if (!maps || maps.length === 0) {
      return { hasOrganization: false, organizations: [], primaryOrg: null, primaryRole: null };
    }
    const primary = maps.find(m => m.roleName === 'owner') || maps[0];
    return {
      hasOrganization: true,
      organizations: maps.map(m => ({
        organization: m.organization,
        client: m.client,
        roleName: m.roleName,
      })),
      primaryOrg: primary.organization,
      primaryRole: primary.roleName,
      primaryClient: primary.client,
    };
  }

  static async hasOrganizationAccess(userId, organizationId) {
    const found = await UserOrganizationMap.findOne({ where: { userId, organizationId, status: 'active' } });
    return !!found;
  }

  static async hasRole(userId, organizationId, roleName) {
    const found = await UserOrganizationMap.findOne({ where: { userId, organizationId, roleName, status: 'active' } });
    return !!found;
  }

  static async setupNewUser(userId, userEmail, preferredUsername) {
    const usernamePart = (preferredUsername || userEmail || userId).split('@')[0];
    const orgName = `org-${usernamePart}`;
    return await OrganizationService.createOrganizationWithClient(userId, orgName, userEmail);
  }

  static async syncUserOnLogin(userId, userEmail, preferredUsername) {
    const ctx = await this.getUserContext(userId);
    if (ctx.hasOrganization) return ctx;
    // Best-effort: create default org if none found
    await this.setupNewUser(userId, userEmail, preferredUsername);
    return await this.getUserContext(userId);
  }

  static async getDashboardInfo(userId) {
    const ctx = await this.getUserContext(userId);
    if (!ctx.hasOrganization) {
      return { username: userId, organization: 'No Organization', role: 'No Role', hasAccess: false };
    }
    return {
      username: userId,
      organization: ctx.primaryOrg?.name,
      role: ctx.primaryRole,
      hasAccess: true,
      organizations: ctx.organizations,
    };
  }
}

export default UserService;
