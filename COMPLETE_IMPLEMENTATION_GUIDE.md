# Complete Organization Management Implementation Guide

This document provides a comprehensive overview of the complete organization management system implemented in your media review application, including database synchronization, user management, and the complete flow from organization creation to user dashboard access.

## 🏗️ System Architecture Overview

The system implements a complete organization management flow that:

1. **Creates organizations** in Keycloak with associated clients and roles
2. **Stores all data** in PostgreSQL database in parallel with Keycloak
3. **Manages user roles** (owner, reviewer, viewer) across organizations
4. **Provides real-time synchronization** between Keycloak and database
5. **Displays user context** on all dashboards

## 📊 Database Schema

### Core Tables

#### 1. Organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  domains JSONB,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Clients
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR NOT NULL UNIQUE,
  client_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  description TEXT,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Roles
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  client_id UUID REFERENCES clients(id),
  description TEXT,
  permissions JSONB,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(keycloak_id, client_id)
);
```

#### 4. User Organization Maps
```sql
CREATE TABLE user_organization_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  role_id UUID REFERENCES roles(id),
  role_name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active',
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id, client_id)
);
```

## 🔄 Complete Organization Creation Flow

### 1. User Creates Organization

When a user creates an organization, the system:

```javascript
// POST /api/organizations/create
{
  "orgName": "My Company",
  "userEmail": "user@company.com"
}
```

**Backend Flow:**
1. **Create Organization in Keycloak**
   - Creates organization via Keycloak Admin API
   - Assigns user as owner

2. **Create Client for Organization**
   - Creates client with name `{orgName}-client`
   - Configures client settings and redirect URIs

3. **Create Client Roles**
   - `owner` - Full control over organization
   - `reviewer` - Can review and comment on media
   - `viewer` - Read-only access to media

4. **Assign Owner Role to User**
   - Assigns `owner` role to the creating user
   - Links user to organization in Keycloak

5. **Store Everything in Database**
   - Organization record
   - Client record
   - Role records
   - User-organization mapping

### 2. Database Synchronization

The system maintains parallel data in both Keycloak and PostgreSQL:

```javascript
// OrganizationService.createOrganizationWithClient()
const result = await OrganizationService.createOrganizationWithClient(
  userId, 
  orgName, 
  userEmail
);

// This creates:
// - Keycloak organization + client + roles
// - Database records for all entities
// - User-organization mapping
```

## 👤 User Management & Authentication

### 1. User Login Flow

When a user logs in:

```javascript
// 1. Check if user has organizations in database
const userContext = await UserService.getUserContext(userId);

if (!userContext.hasOrganization) {
  // 2. Sync from Keycloak
  await OrganizationService.syncUserOrganizationsFromKeycloak(userId);
  
  // 3. If still no organizations, create default
  if (!userContext.hasOrganization) {
    await UserService.setupNewUser(userId, userEmail, username);
  }
}
```

### 2. Role-Based Access Control

The system implements comprehensive RBAC:

```javascript
// Check organization access
const hasAccess = await UserService.hasOrganizationAccess(userId, organizationId);

// Check specific role
const hasRole = await UserService.hasRole(userId, organizationId, 'owner');

// Get effective role for media
const effectiveRole = await UserService.getEffectiveRoleForMedia(userId, mediaId);
```

## 🎯 Dashboard User Context

### 1. UserInfo Component

All dashboards now display:

- **User Avatar** with initials
- **Username** and login status
- **Organization** name
- **Role** badge with color coding
- **Multiple organizations** indicator

```jsx
<UserInfo />
// Displays: 👤 John Doe | 🏢 My Company | 🏷️ owner
```

### 2. Dashboard Integration

Updated all dashboard pages:

```jsx
// Owner Dashboard
<div className="flex items-center space-x-4">
  <UserInfo />
  <LogoutButton />
</div>

// Reviewer Dashboard  
<div className="flex items-center space-x-4">
  <UserInfo />
  <LogoutButton />
</div>

// Viewer Dashboard
<div className="flex items-center space-x-4">
  <UserInfo />
  <LogoutButton />
</div>
```

## 🔐 Enhanced Logout System

### 1. Custom Logout API

```javascript
// POST /api/auth/logout
// 1. Constructs proper Keycloak logout URL
// 2. Includes client_id and post_logout_redirect_uri
// 3. Handles ID token for proper logout
```

### 2. Complete Session Cleanup

```javascript
const handleLogout = async () => {
  // 1. Call custom logout API
  const logoutResponse = await fetch('/api/auth/logout', { method: 'POST' });
  
  // 2. Clear local storage
  localStorage.removeItem("accessToken");
  sessionStorage.clear();
  
  // 3. NextAuth signout
  await signOut({ callbackUrl: "/", redirect: false });
  
  // 4. Redirect to home
  router.push("/");
};
```

## 🚀 API Endpoints

### Organization Management

```bash
# Create organization with client and roles
POST /api/organizations/create
{
  "orgName": "Company Name",
  "userEmail": "user@company.com"
}

# Get organization users
GET /api/organizations/{orgId}/users

# Assign user to organization
POST /api/organizations/{orgId}/users
{
  "userId": "user-uuid",
  "role": "member"
}

# Get organization details
GET /api/organizations/{orgId}
```

### User Management

```bash
# Get dashboard info
GET /api/users/dashboard-info

# Setup new user
POST /api/users/setup
{
  "userEmail": "user@company.com",
  "preferredUsername": "username"
}

# Sync user data
POST /api/users/sync

# Get user context
GET /api/users/context

# Check organization access
GET /api/users/access/{organizationId}

# Check role
GET /api/users/role/{organizationId}/{roleName}
```

## 🔧 Environment Variables

```env
# Keycloak Configuration
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=your-realm
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=your-secret
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_ORG_DOMAIN_SUFFIX=local

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=media_review
DB_USER=postgres
DB_PASSWORD=password

# Client Configuration
CLIENT_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3001
```

## 📁 File Structure

```
server/
├── models/
│   ├── index.js              # Model associations
│   ├── Organization.js       # Organization model
│   ├── Client.js            # Client model
│   ├── Role.js              # Role model
│   ├── UserOrganizationMap.js # User-org mapping
│   └── Media.js             # Updated Media model
├── services/
│   ├── organizationService.js # Organization management
│   └── userService.js        # User management
├── routes/
│   ├── organizations.js      # Organization API
│   └── users.js             # User API
└── utils/
    └── keycloakAdmin.js     # Keycloak integration

client/
├── components/
│   ├── UserInfo.jsx         # User context display
│   └── LogoutButton.jsx     # Enhanced logout
├── app/
│   ├── api/auth/logout/     # Custom logout API
│   └── dashboard/           # Updated dashboards
```

## 🧪 Testing the Implementation

### 1. Test Organization Creation

```bash
# Create organization
curl -X POST "http://localhost:3000/api/organizations/create" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orgName": "Test Company", "userEmail": "test@company.com"}'
```

### 2. Test User Dashboard Info

```bash
# Get user dashboard info
curl -X GET "http://localhost:3000/api/users/dashboard-info" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Logout

```bash
# Test logout
curl -X POST "http://localhost:3000/api/auth/logout" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔍 Monitoring & Debugging

### 1. Database Queries

```sql
-- Check organizations
SELECT * FROM organizations;

-- Check user mappings
SELECT 
  uom.user_id,
  o.name as org_name,
  c.name as client_name,
  r.name as role_name
FROM user_organization_maps uom
JOIN organizations o ON uom.organization_id = o.id
JOIN clients c ON uom.client_id = c.id
JOIN roles r ON uom.role_id = r.id;
```

### 2. Keycloak Verification

```bash
# Check organization in Keycloak
GET {keycloak-url}/admin/realms/{realm}/organizations

# Check client roles
GET {keycloak-url}/admin/realms/{realm}/clients/{client-id}/roles
```

## 🚨 Troubleshooting

### Common Issues

1. **"Organizations feature not enabled"**
   - Enable Organizations in Keycloak realm features

2. **"Database connection failed"**
   - Check PostgreSQL connection and credentials

3. **"User already a member"**
   - Check existing membership before assignment

4. **"Permission denied"**
   - Ensure user has sufficient privileges

### Debug Mode

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 🔮 Future Enhancements

1. **Bulk User Management**
   - Import users from CSV
   - Bulk role assignment

2. **Advanced Permissions**
   - Custom permission sets
   - Time-based access control

3. **Audit Logging**
   - Track all organization changes
   - User activity monitoring

4. **Multi-tenant Support**
   - Organization isolation
   - Cross-organization collaboration

## 📚 Additional Resources

- [Keycloak Organizations Documentation](https://www.keycloak.org/docs/latest/server_admin/#_organizations)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration)
- [Sequelize Associations](https://sequelize.org/docs/v6/core-concepts/assocs/)

## 🎉 Summary

This implementation provides:

✅ **Complete organization management** with Keycloak integration  
✅ **Database synchronization** for fast access and backup  
✅ **Role-based access control** (owner, reviewer, viewer)  
✅ **User context display** on all dashboards  
✅ **Enhanced logout** with proper session cleanup  
✅ **Real-time user management** and organization setup  
✅ **Comprehensive API** for all operations  
✅ **Proper error handling** and validation  

The system now handles the complete flow from user registration to organization management, with parallel data storage in both Keycloak and PostgreSQL for optimal performance and reliability.
