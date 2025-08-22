// server/routes/users.js
import express from 'express';
import UserService from '../services/userService.js';

const router = express.Router();

// Get current user's dashboard information (auth handled at router mount)
router.get('/dashboard-info', async (req, res) => {
  try {
    const userId = req.user.sub;
    const dashboardInfo = await UserService.getDashboardInfo(userId);
    // Prefer human-friendly username from token claims
    const friendlyName = req.user?.preferred_username || req.user?.email || req.user?.name || dashboardInfo.username;
    res.json({ success: true, data: { ...dashboardInfo, username: friendlyName } });
  } catch (error) {
    console.error('Error getting dashboard info:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Setup new user (create organization on first login)
router.post('/setup', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { userEmail, preferredUsername } = req.body;
    
    console.log(`Setting up new user: ${userId}`);
    
    const result = await UserService.setupNewUser(userId, userEmail, preferredUsername);
    
    res.json({ 
      success: true, 
      message: 'User setup completed successfully',
      data: result 
    });
  } catch (error) {
    console.error('Error setting up user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Sync user data from Keycloak (bootstrap route for first-time users)
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.sub;
    const userEmail = req.user?.email;
    const preferredUsername = req.user?.preferred_username || req.user?.name;
    console.log(`Syncing user data for: ${userId}`);
    
    const result = await UserService.syncUserOnLogin(userId, userEmail, preferredUsername);
    
    res.json({ 
      success: true, 
      message: 'User sync completed successfully',
      data: result 
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user's organization context
router.get('/context', async (req, res) => {
  try {
    const userId = req.user.sub;
    
    const userContext = await UserService.getUserContext(userId);
    
    res.json({ 
      success: true, 
      data: userContext 
    });
  } catch (error) {
    console.error('Error getting user context:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check if user has access to an organization
router.get('/access/:organizationId', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { organizationId } = req.params;
    
    const hasAccess = await UserService.hasOrganizationAccess(userId, organizationId);
    
    res.json({ 
      success: true, 
      hasAccess 
    });
  } catch (error) {
    console.error('Error checking organization access:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check if user has a specific role
router.get('/role/:organizationId/:roleName', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { organizationId, roleName } = req.params;
    
    const hasRole = await UserService.hasRole(userId, organizationId, roleName);
    
    res.json({ 
      success: true, 
      hasRole 
    });
  } catch (error) {
    console.error('Error checking user role:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
