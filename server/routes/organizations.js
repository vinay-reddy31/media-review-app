// server/routes/organizations.js
import express from 'express';
import { 
  getOrganizationUsers, 
  assignUserToOrganization,
  addUserToOrg,
  isUserInOrg,
  getOrganizationById
} from '../utils/keycloakAdmin.js';
import { requireRole } from '../middleware/requireRole.js';
import OrganizationService from '../services/organizationService.js';
const router = express.Router();

// Create new organization with client and roles
router.post('/create', requireRole(['owner','admin','reviewer','viewer']), async (req, res) => {
  try {
    const userId = req.user.sub;
    const { orgName, userEmail } = req.body;
    if (!orgName) return res.status(400).json({ success:false, error:'orgName is required' });
    const data = await OrganizationService.createOrganizationWithClient(userId, orgName, userEmail);
    return res.status(201).json({ success:true, data });
  } catch (e) {
    console.error('create org error', e);
    return res.status(500).json({ success:false, error:e.message });
  }
});

// Create client for existing organization
router.post('/:orgName/create-client', requireRole(['owner','admin']), async (req, res) => {
  try {
    const { orgName } = req.params;
    const { clientId } = req.body;
    
    if (!orgName) return res.status(400).json({ success:false, error:'orgName is required' });
    
    console.log(`🔧 API: Creating client for organization '${orgName}' with clientId: ${clientId || 'auto-generated'}`);
    const data = await OrganizationService.createClientForExistingOrganization(orgName, clientId);
    return res.status(201).json({ success:true, data });
  } catch (e) {
    console.error('create client error', e);
    return res.status(500).json({ success:false, error:e.message });
  }
});

// Force create client for organization (for debugging)
router.post('/:orgName/force-create-client', requireRole(['owner','admin']), async (req, res) => {
  try {
    const { orgName } = req.params;
    const { clientId } = req.body;
    
    if (!orgName) return res.status(400).json({ success:false, error:'orgName is required' });
    
    console.log(`🔧 API: Force creating client for organization '${orgName}'`);
    
    // Generate client ID if not provided
    const finalClientId = clientId || (() => {
      const baseName = orgName.startsWith('org-') ? orgName.slice(4) : orgName;
      return `client-${baseName}`;
    })();
    
    const data = await OrganizationService.createClientForExistingOrganization(orgName, finalClientId);
    return res.status(201).json({ 
      success: true, 
      data,
      message: `Client '${finalClientId}' created successfully for organization '${orgName}'`
    });
  } catch (e) {
    console.error('force create client error', e);
    return res.status(500).json({ success:false, error:e.message });
  }
});

// Get all users in an organization
router.get('/:orgId/users', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    const users = await getOrganizationUsers({ orgId });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting organization users:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Assign a user to an organization
router.post('/:orgId/users', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { userId, role = 'member' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }
    
    // Check if user is already in the organization
    const isAlreadyMember = await isUserInOrg({ orgId, userId });
    if (isAlreadyMember) {
      return res.status(409).json({ 
        success: false, 
        error: 'User is already a member of this organization' 
      });
    }
    
    // Assign user to organization
    const result = await assignUserToOrganization({ orgId, userId, role });
    
    res.json({ 
      success: true, 
      message: 'User successfully assigned to organization',
      result 
    });
  } catch (error) {
    console.error('Error assigning user to organization:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get organization details
router.get('/:orgId', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    const organization = await getOrganizationById({ orgId });
    
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        error: 'Organization not found' 
      });
    }
    
    res.json({ success: true, organization });
  } catch (error) {
    console.error('Error getting organization:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// Remove user from organization (optional endpoint)
router.delete('/:orgId/users/:userId', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    
    // Note: Keycloak doesn't have a direct DELETE endpoint for organization members
    // This would typically be handled through role removal or organization membership updates
    // For now, we'll return a not implemented response
    
    res.status(501).json({ 
      success: false, 
      error: 'Remove user from organization not implemented yet. Use role management instead.' 
    });
  } catch (error) {
    console.error('Error removing user from organization:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
