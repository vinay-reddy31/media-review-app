# 🔌 Complete API Documentation - Media Review Application (Part 1)

## 📋 Overview

This document provides a comprehensive list of all APIs used in your Media Review Application, including:
- **Backend REST APIs** (Node.js/Express)
- **Frontend API Calls** (Next.js)
- **WebSocket Events** (Socket.io)
- **External Service APIs** (Keycloak, Email)

---

## 🏗️ API Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    ┌─────────────────┐    ┌─────────────────┐
│   (Next.js)     │◄──►│   Backend       │◄──►│   External      │
│                 │    │   (Express)     │    │   Services      │
│ • fetch()       │    │ • REST Routes   │    │ • Keycloak      │
│ • WebSocket     │    │ • WebSocket     │    │ • Email (SMTP)  │
│ • NextAuth      │    │ • Middleware    │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔐 Authentication & Authorization APIs

### 1. NextAuth.js APIs (Frontend)

#### **`/api/auth/[...nextauth]`**
- **Purpose**: NextAuth.js authentication handler
- **Why Used**: Provides seamless authentication with Keycloak
- **Flow**: 
  1. User clicks login → redirects to Keycloak
  2. Keycloak authenticates → redirects back with JWT
  3. NextAuth validates JWT → creates session

#### **`/api/auth/logout`**
- **Purpose**: Handle user logout
- **Why Used**: Clean session termination and Keycloak logout
- **Flow**:
  1. Clear local session
  2. Redirect to Keycloak logout
  3. Clear cookies and state

### 2. Keycloak Admin APIs (Backend)

#### **Organization Management**
```javascript
// Keycloak Admin API calls
inviteUserToOrg({ orgId, email, role })
inviteExistingUserToOrg({ orgId, email, role })
assignRealmRoles({ userId, roles })
createOrganizationForUser({ userId, orgName })
createClientForOrg({ orgId, clientId })
getOrganizationByName({ name })
addUserToOrg({ orgId, userId, role })
isUserInOrg({ orgId, userId })
```

**Why Used**: 
- **Dynamic Organization Creation**: Creates organizations on-demand when users sign up
- **Role Assignment**: Assigns appropriate roles (owner, reviewer, viewer) to users
- **Client Management**: Creates Keycloak clients for each organization
- **Access Control**: Manages user membership in organizations

---

## 📁 Media Management APIs

### 1. Media Upload & Storage

#### **`POST /api/media/upload`**
```javascript
// Request
{
  "file": File,           // Multipart file upload
  "title": "Video Title", // Media title
  "type": "video"         // Media type
}

// Response
{
  "success": true,
  "media": {
    "id": 123,
    "title": "Video Title",
    "filePath": "/uploads/1234567890-video.mp4",
    "type": "video",
    "ownerId": "user-123"
  }
}
```

**Why Used**:
- **File Storage**: Stores media files locally with unique names
- **Metadata Management**: Tracks media information in PostgreSQL
- **Access Control**: Only owners can upload media
- **File Size Limits**: 200MB limit with Multer

#### **`GET /api/media/my-media`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "My Video",
    "filePath": "/uploads/1234567890-video.mp4",
    "type": "video",
    "ownerId": "user-123",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Owner Dashboard**: Shows media owned by the current user
- **Media Management**: Allows owners to view and manage their content
- **Role-Based Access**: Only owners can see their own media

### 2. Media Access & Sharing

#### **`GET /api/media/all`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "Shared Video",
    "ownerId": "owner-123",
    "accessType": "shared" // or "owned"
  }
]
```

**Why Used**:
- **Unified View**: Shows both owned and shared media
- **Access Control**: Filters based on user permissions
- **Dashboard Integration**: Used in main dashboard

#### **`GET /api/media/reviewer`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "Review Video",
    "sharedBy": "John Doe (john@example.com)",
    "sharedAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Reviewer Dashboard**: Shows media shared with reviewers
- **Collaboration Tracking**: Shows who shared the media
- **Role-Specific Access**: Only reviewers can access this endpoint

#### **`GET /api/media/viewer`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "View Video",
    "sharedBy": "John Doe (john@example.com)",
    "sharedAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Viewer Dashboard**: Shows media shared with viewers
- **Read-Only Access**: Viewers can only view, not edit
- **Permission Management**: Enforces viewer-only permissions

#### **`GET /api/media/:id`**
```javascript
// Response
{
  "id": 123,
  "title": "Video Title",
  "filePath": "/uploads/1234567890-video.mp4",
  "type": "video",
  "ownerId": "user-123"
}
```

**Why Used**:
- **Media Details**: Gets specific media information
- **Access Validation**: Checks if user has permission to view
- **Media Viewer**: Used when opening media for viewing/editing

#### **`DELETE /api/media/:id`**
```javascript
// Response
{
  "success": true,
  "message": "Media deleted successfully"
}
```

**Why Used**:
- **Media Cleanup**: Removes media files and database records
- **Owner Control**: Only media owners can delete
- **Storage Management**: Frees up disk space
