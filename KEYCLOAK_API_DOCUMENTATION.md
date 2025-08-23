# 🔐 Keycloak API Documentation - Exact API Calls Used

## 📋 Overview

This document provides the **exact Keycloak API calls** used in your Media Review Application for:
- **Authentication & Token Management**
- **User Management**
- **Organization Management**
- **Client Management**
- **Role Management**

---

## 🔑 Authentication & Token Management

### 1. Get Admin Token (Client Credentials)

```javascript
// API Call: POST /realms/{realm}/protocol/openid-connect/token
const clientCredsUrl = `${BASE_URL}/realms/${ADMIN_TOKEN_REALM}/protocol/openid-connect/token`;

const body = new URLSearchParams({
  grant_type: "client_credentials",
  client_id: ADMIN_CLIENT_ID,
  client_secret: ADMIN_CLIENT_SECRET,
});

const response = await fetch(clientCredsUrl, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
});

// Response: { access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Why Used**: 
- **Admin Access**: Provides admin privileges to manage Keycloak resources
- **API Authentication**: Required for all Keycloak Admin API calls
- **Security**: Uses client credentials for secure server-to-server communication

### 2. Get Admin Token (Password Grant - Fallback)

```javascript
// API Call: POST /realms/{realm}/protocol/openid-connect/token
const passwordGrantUrl = `${BASE_URL}/realms/${ADMIN_TOKEN_REALM}/protocol/openid-connect/token`;

const body = new URLSearchParams({
  grant_type: "password",
  client_id: "admin-cli",
  username: ADMIN_USERNAME,
  password: ADMIN_PASSWORD,
});

const response = await fetch(passwordGrantUrl, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
});

// Response: { access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Why Used**: 
- **Fallback Authentication**: When client credentials are not configured
- **Development**: Useful for local development and testing
- **Legacy Support**: Supports older Keycloak configurations

---

## 👤 User Management APIs

### 1. Create User

```javascript
// API Call: POST /admin/realms/{realm}/users
const createUrl = `${BASE_URL}/admin/realms/${REALM}/users`;

const userPayload = {
  id: userId,
  username: username || email,
  email: email,
  firstName: firstName || "User",
  lastName: lastName || "Name",
  enabled: true,
  emailVerified: false
};

const response = await fetch(createUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(userPayload)
});

// Response: 201 Created (no body)
```

**Why Used**: 
- **User Registration**: Creates new users in Keycloak during organization setup
- **Profile Management**: Sets up user profiles with proper attributes
- **Integration**: Ensures users exist before adding them to organizations

### 2. Get User by ID

```javascript
// API Call: GET /admin/realms/{realm}/users/{userId}
const url = `${BASE_URL}/admin/realms/${REALM}/users/${encodeURIComponent(userId)}`;

const response = await fetch(url, { 
  headers: { 
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  } 
});

// Response: {
//   id: "user-123",
//   username: "john.doe",
//   email: "john@example.com",
//   firstName: "John",
//   lastName: "Doe",
//   enabled: true
// }
```

**Why Used**: 
- **User Lookup**: Retrieves user information for display and management
- **Profile Display**: Shows user details in the application
- **Validation**: Verifies user existence before operations

### 3. Get User by Email

```javascript
// API Call: GET /admin/realms/{realm}/users?email={email}&exact=true
const url = `${BASE_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}&exact=true`;

const response = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Response: [
//   {
//     id: "user-123",
//     username: "john.doe",
//     email: "john@example.com"
//   }
// ]
```

**Why Used**: 
- **Email Lookup**: Finds users by email address for invitations
- **User Resolution**: Resolves email addresses to user IDs
- **Invitation System**: Supports email-based user invitations

### 4. Get User by Username

```javascript
// API Call: GET /admin/realms/{realm}/users?username={username}&exact=true
const url = `${BASE_URL}/admin/realms/${REALM}/users?username=${encodeURIComponent(username)}&exact=true`;

const response = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Response: [
//   {
//     id: "user-123",
//     username: "john.doe",
//     email: "john@example.com"
//   }
// ]
```

**Why Used**: 
- **Username Lookup**: Finds users by username for invitations
- **User Resolution**: Resolves usernames to user IDs
- **Alternative Identification**: Provides another way to identify users

---

## 🏢 Organization Management APIs

### 1. Create Organization

```javascript
// API Call: POST /admin/realms/{realm}/organizations
const createUrl = `${BASE_URL}/admin/realms/${REALM}/organizations`;

const orgPayload = { 
  name: orgName,
  domains: [{ name: `${orgName}.local` }] // Keycloak Organizations requires domains
};

const response = await fetch(createUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(orgPayload),
});

// Response: {
//   id: "org-uuid-123",
//   name: "My Organization",
//   domains: [{ name: "my-org.local" }]
// }
```

**Why Used**: 
- **Organization Setup**: Creates organizations for user collaboration
- **Domain Management**: Sets up organization domains for email validation
- **Hierarchical Structure**: Establishes organizational hierarchy in Keycloak

### 2. Get Organization by Name

```javascript
// API Call: GET /admin/realms/{realm}/organizations?search={name}
const url = `${BASE_URL}/admin/realms/${REALM}/organizations?search=${encodeURIComponent(name)}`;

const response = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Response: [
//   {
//     id: "org-uuid-123",
//     name: "My Organization",
//     domains: [{ name: "my-org.local" }]
//   }
// ]
```

**Why Used**: 
- **Organization Lookup**: Finds existing organizations by name
- **Duplicate Prevention**: Avoids creating duplicate organizations
- **Name Resolution**: Resolves organization names to IDs

### 3. Get Organization by ID

```javascript
// API Call: GET /admin/realms/{realm}/organizations/{orgId}
const url = `${BASE_URL}/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}`;

const response = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Response: {
//   id: "org-uuid-123",
//   name: "My Organization",
//   domains: [{ name: "my-org.local" }]
// }
```

**Why Used**: 
- **Organization Details**: Retrieves complete organization information
- **Validation**: Verifies organization existence
- **Management**: Provides organization data for administrative operations

### 4. Add User to Organization (Multiple Attempts)

```javascript
// API Call: POST /admin/realms/{realm}/organizations/{orgId}/members
const url = `${BASE_URL}/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members`;

// Attempt 1: Raw string format
const response1 = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: `"${userId}"` // Send user ID as plain string
});

// Attempt 2: JSON object with id field
const response2 = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ id: userId })
});

// Attempt 3: JSON object with userId field
const response3 = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ userId })
});

// Response: 201 Created or 204 No Content
```

**Why Used**: 
- **Membership Management**: Adds users to organizations
- **Role Assignment**: Enables role-based access within organizations
- **Collaboration**: Establishes user-organization relationships

### 5. Check User in Organization

```javascript
// API Call: GET /admin/realms/{realm}/organizations/{orgId}/members
const url = `${BASE_URL}/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members`;

const response = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Response: [
//   {
//     id: "user-123",
//     username: "john.doe",
//     email: "john@example.com"
//   }
// ]
```

**Why Used**: 
- **Membership Verification**: Checks if user is already in organization
- **Duplicate Prevention**: Avoids adding users multiple times
- **Status Checking**: Verifies organization membership status

### 6. Get Organization Members

```javascript
// API Call: GET /admin/realms/{realm}/organizations/{orgId}/users
const url = `${BASE_URL}/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/users`;

const response = await fetch(url, { 
  headers: { 
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  } 
});

// Response: [
//   {
//     id: "user-123",
//     username: "john.doe",
//     email: "john@example.com",
//     roles: ["member"]
//   }
// ]
```

**Why Used**: 
- **Member Listing**: Shows all users in an organization
- **Administration**: Helps organization admins manage members
- **Role Visibility**: Shows user roles within organization

### 7. Invite User to Organization

```javascript
// API Call: POST /admin/realms/{realm}/organizations/{orgId}/members/invite-user
const url = `${BASE_URL}/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members/invite-user`;

const payload = { email, role };

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload)
});

// Response: { invitationId: "inv-123", status: "pending" }
```

**Why Used**: 
- **Email Invitations**: Sends invitations to users via email
- **Role Assignment**: Assigns specific roles during invitation
- **User Onboarding**: Streamlines user registration process

### 8. Invite Existing User to Organization

```javascript
// API Call: POST /admin/realms/{realm}/organizations/{orgId}/members/invite-existing-user
const url = `${BASE_URL}/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members/invite-existing-user`;

const payload = { userId: resolvedUserId };

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload)
});

// Response: 200 OK or 201 Created
```

**Why Used**: 
- **Existing User Invitation**: Invites users who already exist in Keycloak
- **Efficient Onboarding**: Skips user creation step
- **Bulk Operations**: Useful for adding multiple existing users

---

## 🔧 Client Management APIs

### 1. Create Keycloak Client

```javascript
// API Call: POST /admin/realms/{realm}/clients
const url = `${BASE_URL}/admin/realms/${REALM}/clients`;

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

const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(clientPayload)
});

// Response: 201 Created
// Location header contains: /admin/realms/{realm}/clients/{client-uuid}
```

**Why Used**: 
- **Application Registration**: Creates OAuth2/OIDC clients for applications
- **Authentication**: Enables application authentication with Keycloak
- **Role Management**: Provides client-specific role management

### 2. Get Client by Client ID

```javascript
// API Call: GET /admin/realms/{realm}/clients?clientId={clientId}
const url = `${BASE_URL}/admin/realms/${REALM}/clients?clientId=${encodeURIComponent(clientId)}`;

const response = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Response: [
//   {
//     id: "client-uuid-123",
//     clientId: "my-app-client",
//     name: "My Application Client",
//     enabled: true
//   }
// ]
```

**Why Used**: 
- **Client Lookup**: Finds existing clients by client ID
- **Duplicate Prevention**: Avoids creating duplicate clients
- **Configuration**: Retrieves client configuration for management

---

## 🎭 Role Management APIs

### 1. Get All Realm Roles

```javascript
// API Call: GET /admin/realms/{realm}/roles
const url = `${BASE_URL}/admin/realms/${REALM}/roles`;

const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});

// Response: [
//   {
//     id: "role-uuid-123",
//     name: "owner",
//     description: "Owner role"
//   },
//   {
//     id: "role-uuid-456",
//     name: "reviewer",
//     description: "Reviewer role"
//   }
// ]
```

**Why Used**: 
- **Role Discovery**: Lists all available realm roles
- **Role Mapping**: Maps role names to role representations
- **Role Assignment**: Provides role data for user assignments

### 2. Assign Realm Roles to User

```javascript
// API Call: POST /admin/realms/{realm}/users/{userId}/role-mappings/realm
const url = `${BASE_URL}/admin/realms/${REALM}/users/${encodeURIComponent(userId)}/role-mappings/realm`;

const selected = allRoles.filter((r) => roleNames.includes(r.name));

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(selected)
});

// Response: 204 No Content
```

**Why Used**: 
- **Global Role Assignment**: Assigns realm-level roles to users
- **Permission Management**: Provides system-wide permissions
- **User Authorization**: Controls user access across the entire realm

### 3. Create Client Role

```javascript
// API Call: POST /admin/realms/{realm}/clients/{clientUuid}/roles
const url = `${BASE_URL}/admin/realms/${REALM}/clients/${clientUuid}/roles`;

const rolePayload = {
  name: roleName,
  description: `${roleName} role`,
};

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(rolePayload)
});

// Response: 201 Created
```

**Why Used**: 
- **Client-Specific Roles**: Creates roles specific to a client
- **Granular Permissions**: Provides fine-grained access control
- **Application Security**: Manages permissions within specific applications

### 4. Get Client Role by Name

```javascript
// API Call: GET /admin/realms/{realm}/clients/{clientUuid}/roles/{roleName}
const url = `${BASE_URL}/admin/realms/${REALM}/clients/${clientUuid}/roles/${encodeURIComponent(roleName)}`;

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Response: {
//   id: "role-uuid-123",
//   name: "owner",
//   description: "Owner role",
//   clientRole: true,
//   containerId: "client-uuid-123"
// }
```

**Why Used**: 
- **Role Lookup**: Finds specific client roles by name
- **Role Assignment**: Gets role representation for user assignment
- **Role Validation**: Verifies role existence before assignment

### 5. Assign Client Role to User

```javascript
// API Call: POST /admin/realms/{realm}/users/{userId}/role-mappings/clients/{clientUuid}
const url = `${BASE_URL}/admin/realms/${REALM}/users/${encodeURIComponent(userId)}/role-mappings/clients/${clientUuid}`;

const payload = [
  {
    id: roleRepresentation.id,
    name: roleRepresentation.name,
    containerId: clientUuid,
    clientRole: true,
  },
];

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload)
});

// Response: 204 No Content
```

**Why Used**: 
- **Client Role Assignment**: Assigns client-specific roles to users
- **Application Access**: Controls user access to specific applications
- **Permission Granularity**: Provides application-level permissions

### 6. Get Client Roles

```javascript
// API Call: GET /admin/realms/{realm}/clients/{clientUuid}/roles
const url = `${BASE_URL}/admin/realms/${REALM}/clients/${clientUuid}/roles`;

const response = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Response: [
//   {
//     id: "role-uuid-123",
//     name: "owner",
//     description: "Owner role",
//     clientRole: true
//   },
//   {
//     id: "role-uuid-456",
//     name: "reviewer",
//     description: "Reviewer role",
//     clientRole: true
//   }
// ]
```

**Why Used**: 
- **Role Discovery**: Lists all roles for a specific client
- **Role Management**: Provides role data for administrative operations
- **Role Assignment**: Enables role assignment to users

---

## 🔄 Complete Workflow Examples

### 1. Organization Creation Workflow

```javascript
// Step 1: Create Organization
const orgResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/organizations`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My Organization",
    domains: [{ name: "my-org.local" }]
  })
});

// Step 2: Create Client for Organization
const clientResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/clients`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    clientId: "client-my-org",
    enabled: true,
    protocol: "openid-connect",
    secret: "my-secret",
    serviceAccountsEnabled: true,
    standardFlowEnabled: true,
    publicClient: false
  })
});

// Step 3: Create Client Roles
const roleResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/clients/${clientUuid}/roles`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "owner",
    description: "Owner role"
  })
});

// Step 4: Add User to Organization
const memberResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/organizations/${orgId}/members`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: `"${userId}"`
});

// Step 5: Assign Client Role to User
const roleAssignResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/clients/${clientUuid}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify([{
    id: roleId,
    name: "owner",
    containerId: clientUuid,
    clientRole: true
  }])
});
```

### 2. User Invitation Workflow

```javascript
// Step 1: Check if user exists
const userResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}&exact=true`, {
  headers: { Authorization: `Bearer ${token}` }
});

// Step 2: Create user if doesn't exist
if (!userExists) {
  const createUserResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: email,
      email: email,
      enabled: true
    })
  });
}

// Step 3: Invite user to organization
const inviteResponse = await fetch(`${BASE_URL}/admin/realms/${REALM}/organizations/${orgId}/members/invite-user`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, role: "member" })
});
```

---

## 📊 API Usage Statistics

### **Total Keycloak API Calls by Category:**
- **Authentication APIs**: 2 (Token management)
- **User Management APIs**: 4 (Create, Get, Lookup)
- **Organization APIs**: 8 (Create, Get, Members, Invite)
- **Client Management APIs**: 2 (Create, Get)
- **Role Management APIs**: 6 (Create, Get, Assign)

### **Total: 22 Keycloak API Calls**

---

## 🎯 Why These APIs Are Used

### **1. Authentication APIs**
- **Admin Access**: Provides administrative privileges for Keycloak management
- **Security**: Ensures secure server-to-server communication
- **Token Management**: Handles authentication tokens for API access

### **2. User Management APIs**
- **User Lifecycle**: Manages user creation, lookup, and profile management
- **Integration**: Ensures users exist before organization operations
- **Profile Display**: Provides user information for application display

### **3. Organization APIs**
- **Collaboration**: Enables multi-user collaboration within organizations
- **Access Control**: Provides organization-based access control
- **Invitation System**: Streamlines user onboarding process

### **4. Client Management APIs**
- **Application Registration**: Creates OAuth2/OIDC clients for applications
- **Authentication**: Enables application authentication with Keycloak
- **Security**: Provides secure application access

### **5. Role Management APIs**
- **Permission Control**: Manages user permissions and access rights
- **Granular Access**: Provides fine-grained access control
- **Security Model**: Implements role-based access control (RBAC)

This comprehensive Keycloak API integration enables your Media Review Application to provide enterprise-grade authentication, authorization, and user management capabilities.
