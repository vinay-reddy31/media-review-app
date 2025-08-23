# 🔌 Complete API Documentation - Media Review Application (Part 2)

## 🔗 Sharing & Invitation APIs

### 1. Share Link Generation

#### **`POST /api/media/:id/share-links`**
```javascript
// Request
{
  "role": "reviewer",        // "reviewer" or "viewer"
  "inviteeEmail": "user@example.com", // Optional
  "expiresInDays": 7,        // Optional
  "maxUses": 10              // Optional
}

// Response
{
  "url": "http://localhost:3001/share/abc123def456",
  "link": {
    "id": 456,
    "token": "abc123def456",
    "mediaId": 123,
    "grantedRole": "reviewer",
    "expiresAt": "2024-01-08T00:00:00Z",
    "maxUses": 10,
    "uses": 0
  }
}
```

**Why Used**:
- **Secure Sharing**: Generates cryptographically secure tokens
- **Role-Based Access**: Assigns specific roles to shared media
- **Email Integration**: Can send email invitations automatically
- **Expiration Control**: Links can expire after a set time
- **Usage Limits**: Can limit number of times link is used

#### **`GET /api/media/share-links/:token/check`**
```javascript
// Response
{
  "valid": true,
  "mediaId": 123,
  "grantedRole": "reviewer",
  "inviteeEmail": "user@example.com",
  "shareType": "email",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

**Why Used**:
- **Link Validation**: Checks if share link is still valid
- **Access Verification**: Validates expiration and usage limits
- **User Experience**: Shows appropriate UI based on link status

#### **`POST /api/media/share-links/:token/accept`**
```javascript
// Request
{
  // JWT token in Authorization header
}

// Response
{
  "mediaId": 123,
  "grantedRole": "reviewer",
  "success": true
}
```

**Why Used**:
- **Access Granting**: Gives user access to shared media
- **Database Updates**: Creates MediaAccess records
- **Usage Tracking**: Increments link usage count
- **Email Verification**: Validates email for restricted links

### 2. Organization Invites

#### **`POST /api/invites`**
```javascript
// Request
{
  "email": "user@example.com",
  "role": "reviewer",
  "orgId": "org-123",        // Optional
  "mediaId": 123             // Optional
}

// Response
{
  "url": "http://localhost:3001/share/xyz789abc123",
  "token": "xyz789abc123"
}
```

**Why Used**:
- **Organization Management**: Invites users to join organizations
- **Keycloak Integration**: Creates users and assigns roles in Keycloak
- **Email Notifications**: Sends invitation emails
- **Media Sharing**: Can include specific media access

#### **`GET /api/invites/:token`**
```javascript
// Response
{
  "email": "user@example.com",
  "role": "reviewer",
  "orgId": "org-123",
  "status": "pending"
}
```

**Why Used**:
- **Invite Validation**: Checks invite status and details
- **User Experience**: Shows invite information before acceptance
- **Error Handling**: Validates invite tokens

#### **`POST /api/invites/:token/accept`**
```javascript
// Request
{
  // JWT token in Authorization header
}

// Response
{
  "success": true,
  "organization": {
    "id": "org-123",
    "name": "My Organization"
  },
  "role": "reviewer"
}
```

**Why Used**:
- **Organization Membership**: Adds user to organization
- **Role Assignment**: Assigns appropriate roles in Keycloak
- **Media Access**: Grants access to shared media if included
- **User Setup**: Handles new user registration flow

---

## 🏢 Organization Management APIs

### 1. Organization Creation & Management

#### **`POST /api/organizations/create`**
```javascript
// Request
{
  "orgName": "My Organization",
  "userEmail": "admin@example.com"
}

// Response
{
  "success": true,
  "data": {
    "organization": {
      "id": "org-123",
      "name": "My Organization",
      "keycloakId": "uuid-123"
    },
    "client": {
      "clientId": "client-my-org",
      "secret": "secret-123"
    }
  }
}
```

**Why Used**:
- **Dynamic Organizations**: Creates organizations on-demand
- **Keycloak Integration**: Creates corresponding Keycloak organization
- **Client Management**: Creates Keycloak client for organization
- **Role Setup**: Sets up organization-specific roles

#### **`POST /api/organizations/:orgName/create-client`**
```javascript
// Request
{
  "clientId": "custom-client-id"
}

// Response
{
  "success": true,
  "data": {
    "clientId": "custom-client-id",
    "secret": "generated-secret"
  }
}
```

**Why Used**:
- **Client Management**: Creates Keycloak clients for organizations
- **Custom Configuration**: Allows custom client IDs
- **Security**: Generates secure client secrets

#### **`GET /api/organizations/:orgId/users`**
```javascript
// Response
{
  "success": true,
  "users": [
    {
      "id": "user-123",
      "username": "john.doe",
      "email": "john@example.com",
      "roles": ["reviewer"]
    }
  ]
}
```

**Why Used**:
- **User Management**: Lists all users in an organization
- **Role Visibility**: Shows user roles within organization
- **Administration**: Helps organization admins manage members

#### **`POST /api/organizations/:orgId/users`**
```javascript
// Request
{
  "userId": "user-123",
  "role": "reviewer"
}

// Response
{
  "success": true,
  "message": "User successfully assigned to organization"
}
```

**Why Used**:
- **Member Management**: Adds users to organizations
- **Role Assignment**: Assigns specific roles to users
- **Access Control**: Manages organization membership

---

## 👤 User Management APIs

### 1. User Information & Setup

#### **`GET /api/users/dashboard-info`**
```javascript
// Response
{
  "success": true,
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "organizations": [
      {
        "id": "org-123",
        "name": "My Organization",
        "role": "owner"
      }
    ],
    "mediaCount": 5
  }
}
```

**Why Used**:
- **Dashboard Data**: Provides user information for dashboard
- **Organization Context**: Shows user's organization memberships
- **Statistics**: Shows user's media count and activity

#### **`POST /api/users/setup`**
```javascript
// Request
{
  "userEmail": "john@example.com",
  "preferredUsername": "john.doe"
}

// Response
{
  "success": true,
  "message": "User setup completed successfully",
  "data": {
    "organization": {
      "id": "org-123",
      "name": "org-john"
    }
  }
}
```

**Why Used**:
- **First-time Setup**: Handles new user onboarding
- **Organization Creation**: Creates default organization for new users
- **Profile Setup**: Sets up user preferences and settings

#### **`POST /api/users/sync`**
```javascript
// Response
{
  "success": true,
  "message": "User sync completed successfully",
  "data": {
    "synced": true,
    "organizations": [...]
  }
}
```

**Why Used**:
- **Data Synchronization**: Syncs user data from Keycloak
- **Login Handling**: Ensures user data is up-to-date on login
- **Organization Sync**: Updates organization memberships

#### **`GET /api/users/context`**
```javascript
// Response
{
  "success": true,
  "data": {
    "userId": "user-123",
    "organizations": [...],
    "roles": ["owner", "reviewer"],
    "permissions": [...]
  }
}
```

**Why Used**:
- **User Context**: Provides complete user context
- **Permission Checking**: Shows user's roles and permissions
- **UI Adaptation**: Helps frontend adapt based on user context

#### **`GET /api/users/access/:organizationId`**
```javascript
// Response
{
  "success": true,
  "hasAccess": true
}
```

**Why Used**:
- **Access Validation**: Checks if user has access to organization
- **Permission Control**: Validates organization membership
- **Security**: Ensures proper access control

#### **`GET /api/users/role/:organizationId/:roleName`**
```javascript
// Response
{
  "success": true,
  "hasRole": true
}
```

**Why Used**:
- **Role Checking**: Validates if user has specific role
- **Permission Management**: Checks role-based permissions
- **Access Control**: Enforces role-based access control
