// server/services/organizationService.js
import { 
  createOrganizationForUser,
  createClientForOrg,
  createKeycloakClient,
  ensureClientRoles,
  assignClientRoles,
  getClientByClientId,
} from '../utils/keycloakAdmin.js';
import { Organization, Client, Role, UserOrganizationMap } from '../models/index.js';

class OrganizationService {
  /**
   * Helper function to retry a promise-based action (from friend's code)
   */
  static async retry(fn, retries = 3, delay = 500) {
    try {
      return await fn();
    } catch (err) {
      if (retries > 0) {
        console.log(`Attempt failed, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(res => setTimeout(res, delay));
        return this.retry(fn, retries - 1, delay);
      } else {
        throw err;
      }
    }
  }

  /**
   * Check if user exists in Keycloak by their ID (from friend's code)
   */
  static async checkUserExists(keycloakId) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      const response = await fetch(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/users/${keycloakId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      
      // If the request succeeds (status 200), the user exists.
      if (response.ok) {
        return true;
      }
      
      // A 404 status specifically means the user does not exist.
      if (response.status === 404) {
        return false;
      }
      
      // For other errors, log a warning but assume they don't exist to be safe.
      console.warn('Error checking user existence in Keycloak:', {
        message: `Status: ${response.status}`,
        status: response.status,
      });
      return false;
    } catch (error) {
      console.warn('Error checking user existence in Keycloak:', {
        message: error.message,
      });
      return false;
    }
  }

  static async createOrganizationWithClient(userId, orgName, userEmail) {
    console.log(`🚀 Starting org creation workflow for user ${userId}, org: ${orgName}`);
    
    // 1️⃣ Create Organization in Keycloak (or get existing)
    console.log(`📋 Step 1: Creating/getting organization '${orgName}' in Keycloak...`);
    let kcOrg;
    try {
      kcOrg = await createOrganizationForUser({ 
        userId, 
        name: orgName, 
        email: userEmail,
        username: userEmail,
        firstName: userEmail.split('@')[0] || 'User',
        lastName: 'Name'
      });
      console.log(`✅ Organization created with ID: ${kcOrg.id}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚠️ Organization '${orgName}' already exists, retrieving it...`);
        // Try to get the existing organization
        const { getOrganizationByName } = await import('../utils/keycloakAdmin.js');
        kcOrg = await getOrganizationByName({ name: orgName });
        if (!kcOrg) {
          throw new Error(`Organization '${orgName}' exists but could not be retrieved`);
        }
        console.log(`✅ Retrieved existing organization with ID: ${kcOrg.id}`);
      } else {
        throw error;
      }
    }

    // 2️⃣ Create Client for that Organization (using friend's working pattern)
    const baseName = orgName.startsWith('org-') ? orgName.slice(4) : orgName;
    const clientId = `client-${baseName}`;
    console.log(`🔧 Step 2: Creating client '${clientId}' for organization...`);
    
    let kcClient = await getClientByClientId({ clientId });
    if (!kcClient) {
      console.log(`📝 Creating new client '${clientId}' in Keycloak...`);
      try {
        // Use the working pattern from friend's code - pass baseName directly
        kcClient = await this.createKeycloakClientWithWorkingPattern(baseName);
        console.log(`✅ Client created with ID: ${kcClient?.clientUuid}`);
      } catch (error) {
        console.log(`❌ Failed to create client '${clientId}': ${error.message}`);
        // Try alternative client ID format
        const altClientId = `${baseName}-client`;
        console.log(`🔄 Trying alternative client ID: '${altClientId}'...`);
        try {
          kcClient = await this.createKeycloakClientWithWorkingPattern(baseName);
          console.log(`✅ Alternative client created with ID: ${kcClient?.clientUuid}`);
        } catch (altError) {
          console.log(`❌ Alternative client creation also failed: ${altError.message}`);
          throw new Error(`Failed to create client for organization. Tried: ${clientId}, ${altClientId}. Last error: ${altError.message}`);
        }
      }
    } else {
      console.log(`✅ Client '${clientId}' already exists with ID: ${kcClient.id}`);
    }
    
    // Ensure we have a valid client ID for the rest of the process
    if (!kcClient || !kcClient.clientUuid) {
      throw new Error(`Failed to create or retrieve client for organization '${orgName}'`);
    }

    // 3️⃣ Create Roles (owner, reviewer, viewer) in the Client (using friend's pattern)
    console.log(`🎭 Step 3: Creating client roles (owner, reviewer, viewer)...`);
    await this.createClientRolesWithWorkingPattern(kcClient.clientUuid, ['owner', 'reviewer', 'viewer']);
    console.log(`✅ Client roles created/verified`);

    // 4️⃣ Add user to organization and assign owner role (using friend's pattern)
    console.log(`👤 Step 4: Adding user to organization and assigning 'owner' role...`);
    
    // Check if user exists before adding to organization
    const userExists = await this.checkUserExists(userId);
    if (!userExists) {
      console.warn('⚠️ User does not exist in Keycloak, skipping organization membership and role mapping:', { userId });
    } else {
      try {
        // Add user to organization as member (following friend's pattern)
        console.log(`👥 Adding user ${userId} to organization ${kcOrg.id} as member...`);
        await this.addUserToOrganizationAsMember(userId, kcOrg.id);
        console.log(`✅ User added to organization as member`);
        
        // Verify the membership was created successfully
        console.log(`🔍 Verifying organization membership...`);
        const membershipVerified = await this.verifyOrganizationMembership(userId, kcOrg.id);
        if (membershipVerified) {
          console.log(`✅ Organization membership verified - user will appear in Organizations -> Members`);
        } else {
          console.warn(`⚠️ Organization membership verification failed - check Keycloak logs`);
        }
        
        // Use retry logic for role assignment
        await this.retry(async () => {
          const ownerRole = await this.getClientRoleByName(kcClient.clientUuid, 'owner');
          await this.assignClientRoleToUserWithWorkingPattern(userId, kcClient.clientUuid, 'owner');
        }, 5, 500);
        console.log(`✅ Owner role assigned to user`);
      } catch (roleMapErr) {
        console.warn('⚠️ Failed to add user to organization or map owner role:', roleMapErr?.message || roleMapErr);
      }
    }

    // 5️⃣ Store everything in Database (parallel to Keycloak)
    console.log(`💾 Step 5: Storing organization, client, and roles in database...`);
    
    // Store Organization
    const [dbOrg] = await Organization.findOrCreate({
      where: { name: orgName },
      defaults: { keycloakId: kcOrg.id, status: 'active' },
    });
    console.log(`✅ Organization stored in DB with ID: ${dbOrg.id}`);

    // Store Client
    const [dbClient] = await Client.findOrCreate({
      where: { clientId },
      defaults: { keycloakId: kcClient.clientUuid, name: clientId, organizationId: dbOrg.id },
    });
    console.log(`✅ Client stored in DB with ID: ${dbClient.id}`);

    // Store Roles
    const kcRoles = ['owner', 'reviewer', 'viewer'];
    const dbRoles = [];
    for (const roleName of kcRoles) {
      const [dbRole] = await Role.findOrCreate({
        where: { name: roleName, clientId: dbClient.id },
        defaults: { name: roleName, clientId: dbClient.id },
      });
      dbRoles.push(dbRole);
      console.log(`✅ Role '${roleName}' stored in DB with ID: ${dbRole.id}`);
    }

    // Store User-Organization mapping
    const ownerRole = dbRoles.find(r => r.name === 'owner');
    const [userOrgMap] = await UserOrganizationMap.findOrCreate({
      where: { userId, organizationId: dbOrg.id, clientId: dbClient.id },
      defaults: { roleId: ownerRole.id, roleName: 'owner' },
    });
    console.log(`✅ User-Organization mapping stored with role: ${userOrgMap.roleName}`);

    console.log(`🎉 Complete workflow finished!`);
    console.log(`📊 Summary:`);
    console.log(`   - Organization: ${orgName} (Keycloak ID: ${kcOrg.id}, DB ID: ${dbOrg.id})`);
    console.log(`   - Client: ${clientId} (Keycloak ID: ${kcClient.clientUuid}, DB ID: ${dbClient.id})`);
    console.log(`   - Roles: ${kcRoles.join(', ')} (${dbRoles.length} roles in DB)`);
    console.log(`   - User ${userId} assigned as 'owner'`);

    return { organization: dbOrg, client: dbClient, roles: dbRoles };
  }

  /**
   * Force a token refresh for a user to include newly assigned roles
   * This ensures the JWT token contains the updated role information
   */
  static async forceTokenRefresh(userId) {
    try {
      // Get admin token to perform user operations
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      // Method 1: Update user attributes to trigger refresh
      const updateUrl = `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/users/${userId}`;
      
      const updatePayload = {
        attributes: {
          "last_role_update": [Date.now().toString()],
          "force_token_refresh": ["true"]
        }
      };
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      
      if (response.ok) {
        console.log(`✅ Updated user attributes for ${userId} to trigger role refresh`);
      } else {
        console.log(`⚠️ User update failed for ${userId}: ${response.status}`);
      }

      // Method 2: Force user session logout to require re-authentication
      const logoutUrl = `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/users/${userId}/logout`;
      
      const logoutResponse = await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (logoutResponse.ok) {
        console.log(`✅ Forced logout for user ${userId} to require re-authentication with new roles`);
        return true;
      } else {
        console.log(`⚠️ Forced logout failed for ${userId}: ${logoutResponse.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Token refresh failed for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify that the client is properly configured for role mapping
   */
  static async verifyClientConfiguration(clientKeycloakId, clientId) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      // Check if client has proper protocol mappers
      const mappersUrl = `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/clients/${clientKeycloakId}/protocol-mappers`;
      
      const response = await fetch(mappersUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const mappers = await response.json();
        const hasRoleMapper = mappers.some(mapper => 
          mapper.protocolMapper === 'oidc-usermodel-client-role-mapper' &&
          mapper.config['claim.name'] === `resource_access.${clientId}.roles`
        );
        
        if (!hasRoleMapper) {
          console.log(`⚠️ Client ${clientId} missing proper role mapper, adding...`);
          await this.addRoleMapper(clientKeycloakId, clientId);
        } else {
          console.log(`✅ Client ${clientId} has proper role mapper`);
        }
      }
    } catch (error) {
      console.log(`❌ Client verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create Keycloak client using the working pattern from friend's code
   * Fixed: Use username directly instead of clientId to avoid double prefix
   */
  static async createKeycloakClientWithWorkingPattern(username) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      // Use username directly to avoid double "client-" prefix
      const clientId = `client-${username}`;
      const clientSecret = `${username}-secret-${Date.now()}`;
      
      const clientPayload = {
        clientId: clientId,
        enabled: true,
        protocol: 'openid-connect',
        secret: clientSecret,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: true,
        publicClient: false,
        redirectUris: ['*'],
        webOrigins: ['*']
      };

      const response = await fetch(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/clients`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientPayload)
        }
      );

      if (response.status === 201) {
        let clientUuid = null;
        if (response.headers.get('location')) {
          const locationParts = response.headers.get('location').split('/');
          clientUuid = locationParts[locationParts.length - 1];
        }

        console.log('✅ Keycloak client created successfully:', {
          clientId: clientId,
          clientUuid: clientUuid,
          username: username
        });

        return {
          clientId: clientId,
          clientUuid: clientUuid,
          clientSecret: clientSecret
        };
      } else {
        const errorText = await response.text();
        throw new Error(`Unexpected status code: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ Failed to create Keycloak client:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        username: username
      });
      throw err;
    }
  }

  /**
   * Fetch a specific role from a Keycloak client by role name (from friend's code)
   */
  static async getClientRoleByName(clientUuid, roleName) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      const response = await fetch(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/clients/${clientUuid}/roles/${encodeURIComponent(roleName)}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch role: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error(`❌ Failed to fetch role '${roleName}' for client ${clientUuid}:`, err?.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Assign client role to user using the working pattern from friend's code
   */
  static async assignClientRoleToUserWithWorkingPattern(keycloakUserId, clientUuid, roleName) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      // First get the role details
      const roleRepresentation = await this.getClientRoleByName(clientUuid, roleName);
      
      const payload = [
        {
          id: roleRepresentation.id,
          name: roleRepresentation.name,
          containerId: clientUuid,
          clientRole: true,
        },
      ];
      
      const response = await fetch(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/users/${keycloakUserId}/role-mappings/clients/${clientUuid}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );
      
      if (response.status === 204) {
        console.log(`✅ Assigned role '${roleRepresentation.name}' to user ${keycloakUserId} for client ${clientUuid}`);
      } else {
        console.warn(`⚠️ Unexpected status when assigning role '${roleRepresentation.name}': ${response.status}`);
      }
    } catch (err) {
      console.error(`❌ Failed to assign role '${roleName}' to user ${keycloakUserId}:`, err?.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Create a Keycloak client for an existing organization
   * This can be called independently after organization creation
   */
  static async createClientForExistingOrganization(orgName, clientId = null) {
    try {
      console.log(`🔧 Creating client for existing organization: ${orgName}`);
      
      // Generate client ID if not provided
      if (!clientId) {
        const baseName = orgName.startsWith('org-') ? orgName.slice(4) : orgName;
        clientId = `client-${baseName}`;
      }
      
      // Check if client already exists
      let existingClient = await getClientByClientId({ clientId });
      if (existingClient) {
        console.log(`✅ Client '${clientId}' already exists with ID: ${existingClient.id}`);
        return existingClient;
      }
      
      // Create the client
      console.log(`📝 Creating new client '${clientId}' for organization '${orgName}'...`);
      const kcClient = await this.createKeycloakClientWithWorkingPattern(baseName);
      
      // Create roles for the client using the proper API endpoint
      console.log(`🎭 Creating client roles (owner, reviewer, viewer)...`);
      await this.createClientRolesWithWorkingPattern(kcClient.clientUuid, ['owner', 'reviewer', 'viewer']);
      
      // Store client in database
      const [dbClient] = await Client.findOrCreate({
        where: { clientId },
        defaults: { keycloakId: kcClient.clientUuid, name: clientId },
      });
      
      // Store roles in database
      const kcRoles = ['owner', 'reviewer', 'viewer'];
      for (const roleName of kcRoles) {
        await Role.findOrCreate({
          where: { name: roleName, clientId: dbClient.id },
          defaults: { name: roleName, clientId: dbClient.id },
        });
      }
      
      console.log(`✅ Client '${clientId}' created successfully for organization '${orgName}'`);
      return kcClient;
      
    } catch (error) {
      console.error(`❌ Failed to create client for organization '${orgName}':`, error.message);
      throw error;
    }
  }

  /**
   * Assign client role to user using the proper Keycloak API endpoint
   * POST /admin/realms/{realm}/users/{user-id}/role-mappings/clients/{client-id}
   */
  static async assignClientRoleToUser(userId, clientKeycloakId, roleName) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      // First, get the role details
      const roleUrl = `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/clients/${clientKeycloakId}/roles/${roleName}`;
      
      const roleResponse = await fetch(roleUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!roleResponse.ok) {
        throw new Error(`Failed to get role '${roleName}': ${roleResponse.status}`);
      }
      
      const role = await roleResponse.json();
      
      // Now assign the role to the user
      const assignUrl = `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/users/${userId}/role-mappings/clients/${clientKeycloakId}`;
      
      const assignResponse = await fetch(assignUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([role])
      });
      
      if (assignResponse.ok) {
        console.log(`✅ Successfully assigned role '${roleName}' to user ${userId}`);
      } else {
        const errorText = await assignResponse.text();
        console.log(`❌ Failed to assign role '${roleName}' to user ${userId}: ${assignResponse.status} - ${errorText}`);
        throw new Error(`Failed to assign role: ${assignResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ Error assigning client role to user:`, error.message);
      throw error;
    }
  }

  /**
   * Create client roles using the working pattern from friend's code
   * POST /admin/realms/{realm}/clients/{client-uuid}/roles
   */
  static async createClientRolesWithWorkingPattern(clientUuid, roleNames) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      for (const roleName of roleNames) {
        console.log(`🎭 Creating client role: ${roleName}`);
        
        try {
          const response = await fetch(
            `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/clients/${clientUuid}/roles`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: roleName,
                description: `${roleName} role`,
              })
            }
          );
          
          if (response.status === 201 || response.status === 204) {
            console.log(`✅ Client role '${roleName}' created for client ${clientUuid}`);
          } else {
            console.warn(`⚠️ Unexpected status when creating role '${roleName}': ${response.status}`);
          }
        } catch (err) {
          if (err?.response?.status === 409) {
            // 409 means already exists
            console.log(`ℹ️ Role '${roleName}' already exists for client ${clientUuid}`);
          } else {
            console.error(`❌ Failed to create client role '${roleName}':`, err?.response?.data || err.message);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error creating client roles:`, error.message);
      throw error;
    }
  }

  /**
   * Create client roles using the proper Keycloak API endpoint
   * POST /admin/realms/{realm}/clients/{client-uuid}/roles
   */
  static async createClientRoles(clientKeycloakId, roleNames) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      const rolesUrl = `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/clients/${clientKeycloakId}/roles`;
      
      for (const roleName of roleNames) {
        console.log(`🎭 Creating client role: ${roleName}`);
        
        const rolePayload = {
          name: roleName,
          description: `${roleName} role for client`,
          composite: false,
          clientRole: true
        };
        
        const response = await fetch(rolesUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rolePayload)
        });
        
        if (response.ok) {
          console.log(`✅ Created client role: ${roleName}`);
        } else if (response.status === 409) {
          console.log(`⚠️ Client role '${roleName}' already exists`);
        } else {
          const errorText = await response.text();
          console.log(`❌ Failed to create client role '${roleName}': ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error creating client roles:`, error.message);
      throw error;
    }
  }

  /**
   * Add user to organization as member (following friend's pattern)
   * This ensures users appear in Organizations -> Members in Keycloak
   */
  static async addUserToOrganizationAsMember(keycloakUserId, orgId) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      // Add user as member in Keycloak (following friend's exact pattern)
      // Note: Send keycloakUserId as a plain string, not JSON.stringify()
      const response = await fetch(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/organizations/${orgId}/members`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: keycloakUserId // Send user ID as plain string (friend's exact pattern)
        }
      );
      
      if (response.ok || response.status === 201 || response.status === 204) {
        console.log(`✅ User ${keycloakUserId} added as member to organization ${orgId}`);
        return true;
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ Failed to add user to organization: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error adding user to organization:`, error.message);
      throw error;
    }
  }

  /**
   * Get all members of an organization
   * GET /admin/realms/{realm}/organizations/{org-id}/members
   */
  static async getOrganizationMembers(orgId) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      const response = await fetch(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/organizations/${orgId}/members`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const members = await response.json();
        console.log(`✅ Retrieved ${members.length} members for organization ${orgId}`);
        return members;
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ Failed to get organization members: ${response.status} - ${errorText}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error getting organization members:`, error.message);
      return [];
    }
  }

  /**
   * Get all organizations for a user
   * GET /admin/realms/{realm}/users/{user-id}/organizations
   */
  static async getUserOrganizations(userId) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      const response = await fetch(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/users/${userId}/organizations`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const organizations = await response.json();
        console.log(`✅ Retrieved ${organizations.length} organizations for user ${userId}`);
        return organizations;
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ Failed to get user organizations: ${response.status} - ${errorText}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error getting user organizations:`, error.message);
      return [];
    }
  }

  /**
   * Verify organization membership was created successfully
   * This function checks both directions: org->members and user->organizations
   */
  static async verifyOrganizationMembership(userId, orgId) {
    try {
      console.log(`🔍 Verifying organization membership for user ${userId} in org ${orgId}...`);
      
      // Check 1: Get organization members
      const orgMembers = await this.getOrganizationMembers(orgId);
      const isUserInOrgMembers = orgMembers.some(member => member.id === userId);
      
      // Check 2: Get user organizations
      const userOrgs = await this.getUserOrganizations(userId);
      const isOrgInUserOrgs = userOrgs.some(org => org.id === orgId);
      
      console.log(`📊 Membership verification results:`);
      console.log(`   - User in org members: ${isUserInOrgMembers} (${orgMembers.length} total members)`);
      console.log(`   - Org in user orgs: ${isOrgInUserOrgs} (${userOrgs.length} total orgs)`);
      
      if (isUserInOrgMembers && isOrgInUserOrgs) {
        console.log(`✅ Organization membership verified successfully!`);
        return true;
      } else {
        console.warn(`⚠️ Organization membership verification failed!`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error verifying organization membership:`, error.message);
      return false;
    }
  }

  /**
   * Add role mapper to client if missing
   */
  static async addRoleMapper(clientKeycloakId, clientId) {
    try {
      const { getAdminToken } = await import('../utils/keycloakAdmin.js');
      const adminToken = await getAdminToken();
      
      const mapperUrl = `${process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080'}/admin/realms/${process.env.KEYCLOAK_REALM || 'master'}/clients/${clientKeycloakId}/protocol-mappers`;
      
      const mapperPayload = {
        name: "client roles",
        protocol: "openid-connect",
        protocolMapper: "oidc-usermodel-client-role-mapper",
        config: {
          "multivalued": "true",
          "userinfo.token.claim": "true",
          "id.token.claim": "true",
          "access.token.claim": "true",
          "claim.name": `resource_access.${clientId}.roles`,
          "jsonType.label": "String",
          "full.group.path": "false"
        }
      };
      
      const response = await fetch(mapperUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mapperPayload)
      });
      
      if (response.ok) {
        console.log(`✅ Added role mapper to client ${clientId}`);
      } else {
        console.log(`⚠️ Failed to add role mapper: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Failed to add role mapper: ${error.message}`);
      throw error;
    }
  }
}

export default OrganizationService;
