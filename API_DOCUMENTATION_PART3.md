# 🔌 Complete API Documentation - Media Review Application (Part 3)

## 💬 Comments & Annotations APIs

### 1. Comments Management

#### **`GET /api/comments/:mediaId`**
```javascript
// Response
[
  {
    "id": "comment-123",
    "mediaId": 123,
    "userId": "user-123",
    "username": "John Doe",
    "text": "Great video!",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Comment Display**: Shows all comments for a media file
- **Real-time Updates**: Used with WebSocket for live comments
- **User Context**: Shows who wrote each comment

### 2. Annotations Management

#### **`GET /api/annotations?media_id=123`**
```javascript
// Response
[
  {
    "id": "annotation-123",
    "mediaId": 123,
    "userId": "user-123",
    "username": "John Doe",
    "type": "point",
    "coordinates": { "x": 100, "y": 200 },
    "text": "Important point here",
    "timestamp": 30.5, // For video annotations
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Annotation Display**: Shows all annotations on media
- **Spatial Data**: Handles coordinate-based annotations
- **Video Support**: Includes timestamp for video annotations
- **Real-time Collaboration**: Used with WebSocket for live updates

#### **`POST /api/annotations`**
```javascript
// Request
{
  "media_id": 123,
  "user_id": "user-123",
  "username": "John Doe",
  "coordinates": { "x": 100, "y": 200 },
  "text": "Important point here",
  "timestamp": 30.5 // Optional for video
}

// Response
{
  "id": "annotation-123",
  "mediaId": 123,
  "userId": "user-123",
  "coordinates": { "x": 100, "y": 200 },
  "text": "Important point here",
  "timestamp": 30.5
}
```

**Why Used**:
- **Annotation Creation**: Creates new annotations on media
- **Coordinate Storage**: Stores spatial positioning data
- **User Attribution**: Links annotations to specific users
- **Real-time Broadcasting**: Triggers WebSocket events

#### **`GET /api/annotations/timeline/:media_id?start=0&end=30`**
```javascript
// Response
[
  {
    "id": "annotation-123",
    "timestamp": 15.2,
    "text": "Annotation at 15 seconds"
  }
]
```

**Why Used**:
- **Video Timeline**: Shows annotations for specific time ranges
- **Performance**: Filters annotations by time for efficiency
- **Video Player Integration**: Used with video player timeline

---

## 🔌 WebSocket APIs (Real-time Communication)

### 1. Connection Management

#### **Socket Connection**
```javascript
// Client-side connection
const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  auth: { token: session?.accessToken }
});

// Server-side authentication
socket.on('connection', (socket) => {
  // Verify JWT token
  // Join media-specific rooms
});
```

**Why Used**:
- **Real-time Communication**: Enables live collaboration
- **Authentication**: Secures WebSocket connections with JWT
- **Room Management**: Organizes users by media sessions

### 2. Comment Events

#### **`commentCreated`**
```javascript
// Client emits
socket.emit('commentCreated', {
  mediaId: 123,
  text: 'Great video!',
  userId: 'user-123',
  username: 'John Doe'
});

// Server broadcasts
io.to(mediaId).emit('commentCreated', {
  id: 'comment-123',
  mediaId: 123,
  text: 'Great video!',
  userId: 'user-123',
  username: 'John Doe',
  createdAt: '2024-01-01T00:00:00Z'
});
```

**Why Used**:
- **Live Comments**: Shows comments in real-time
- **Collaboration**: Multiple users can see comments instantly
- **User Attribution**: Shows who wrote each comment

#### **`commentEdited`**
```javascript
// Client emits
socket.emit('commentEdited', {
  commentId: 'comment-123',
  text: 'Updated comment text'
});

// Server broadcasts
io.to(mediaId).emit('commentEdited', {
  commentId: 'comment-123',
  text: 'Updated comment text',
  updatedAt: '2024-01-01T00:00:00Z'
});
```

**Why Used**:
- **Comment Updates**: Allows editing comments in real-time
- **Permission Control**: Only comment authors can edit
- **Live Updates**: All users see edits instantly

#### **`commentDeleted`**
```javascript
// Client emits
socket.emit('commentDeleted', {
  commentId: 'comment-123'
});

// Server broadcasts
io.to(mediaId).emit('commentDeleted', {
  commentId: 'comment-123'
});
```

**Why Used**:
- **Comment Removal**: Allows deleting comments
- **Permission Control**: Authors and owners can delete
- **Live Cleanup**: Removes comments from all users' views

### 3. Annotation Events

#### **`annotationCreated`**
```javascript
// Client emits
socket.emit('annotationCreated', {
  mediaId: 123,
  coordinates: { x: 100, y: 200 },
  text: 'Important point',
  timestamp: 30.5
});

// Server broadcasts
io.to(mediaId).emit('annotationCreated', {
  id: 'annotation-123',
  mediaId: 123,
  coordinates: { x: 100, y: 200 },
  text: 'Important point',
  timestamp: 30.5,
  userId: 'user-123',
  username: 'John Doe'
});
```

**Why Used**:
- **Live Annotations**: Shows annotations in real-time
- **Spatial Collaboration**: Multiple users can annotate simultaneously
- **Visual Feedback**: Users see annotations appear instantly

#### **`annotationEdited`**
```javascript
// Client emits
socket.emit('annotationEdited', {
  annotationId: 'annotation-123',
  text: 'Updated annotation text'
});

// Server broadcasts
io.to(mediaId).emit('annotationEdited', {
  annotationId: 'annotation-123',
  text: 'Updated annotation text'
});
```

**Why Used**:
- **Annotation Updates**: Allows editing annotations
- **Permission Control**: Only annotation authors can edit
- **Live Updates**: All users see annotation changes

#### **`annotationDeleted`**
```javascript
// Client emits
socket.emit('annotationDeleted', {
  annotationId: 'annotation-123'
});

// Server broadcasts
io.to(mediaId).emit('annotationDeleted', {
  annotationId: 'annotation-123'
});
```

**Why Used**:
- **Annotation Removal**: Allows deleting annotations
- **Permission Control**: Authors and owners can delete
- **Live Cleanup**: Removes annotations from all users' views

---

## 🔧 External Service APIs

### 1. Keycloak Admin API

#### **User Management**
```javascript
// Create user
POST /admin/realms/{realm}/users
{
  "username": "john.doe",
  "email": "john@example.com",
  "enabled": true
}

// Assign roles
POST /admin/realms/{realm}/users/{userId}/role-mappings/realm
{
  "id": "role-id",
  "name": "reviewer"
}
```

**Why Used**:
- **User Creation**: Creates users in Keycloak
- **Role Assignment**: Assigns realm and client roles
- **Organization Management**: Manages organization memberships

#### **Organization Management**
```javascript
// Create organization
POST /admin/realms/{realm}/groups
{
  "name": "org-123",
  "attributes": {
    "orgType": ["organization"]
  }
}

// Add user to organization
PUT /admin/realms/{realm}/users/{userId}/groups/{groupId}
```

**Why Used**:
- **Dynamic Organizations**: Creates organizations on-demand
- **Membership Management**: Adds/removes users from organizations
- **Hierarchical Structure**: Manages organization hierarchy

### 2. Email Service (SMTP)

#### **Invitation Emails**
```javascript
// Send invitation email
sendShareInvite({
  to: "user@example.com",
  url: "http://localhost:3001/share/token123",
  role: "reviewer",
  mediaTitle: "Video Title",
  inviterName: "John Doe"
});
```

**Why Used**:
- **User Notifications**: Notifies users of invitations
- **Link Sharing**: Sends share links via email
- **Professional Communication**: Provides branded email templates

---

## 🛡️ Security & Middleware APIs

### 1. Authentication Middleware

#### **`verifyKeycloakToken`**
```javascript
// Middleware function
const verifyKeycloakToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    audience: [process.env.KEYCLOAK_CLIENT_ID]
  });
  req.user = decoded;
  next();
};
```

**Why Used**:
- **JWT Validation**: Verifies Keycloak JWT tokens
- **User Context**: Provides user information to routes
- **Security**: Ensures only authenticated users access APIs

#### **`requireRole`**
```javascript
// Middleware function
const requireRole = (roles) => (req, res, next) => {
  const userRoles = req.user.realm_access?.roles || [];
  const hasRole = Array.isArray(roles) 
    ? roles.some(role => userRoles.includes(role))
    : userRoles.includes(roles);
  
  if (!hasRole) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

**Why Used**:
- **Role-Based Access Control**: Enforces role-based permissions
- **API Protection**: Prevents unauthorized access
- **Flexible Authorization**: Supports single or multiple roles

### 2. Access Control Utilities

#### **`getUserEffectiveRoleForMedia`**
```javascript
// Utility function
const getUserEffectiveRoleForMedia = async (user, mediaId) => {
  // Check if user is owner
  const media = await Media.findByPk(mediaId);
  if (media.ownerId === user.sub) {
    return { role: 'owner', media };
  }
  
  // Check shared access
  const access = await MediaAccess.findOne({
    where: { mediaId, userId: user.sub }
  });
  
  return { role: access?.role || null, media };
};
```

**Why Used**:
- **Permission Resolution**: Determines user's effective role for media
- **Access Control**: Checks both ownership and shared access
- **Security**: Ensures proper access control for all operations

---

## 📊 API Usage Statistics

### **Total APIs by Category:**
- **Authentication APIs**: 3 (NextAuth, Keycloak, Logout)
- **Media Management APIs**: 8 (Upload, List, Get, Delete, Share)
- **Sharing & Invitation APIs**: 6 (Share Links, Invites)
- **Organization APIs**: 6 (Create, Manage, Users)
- **Comments & Annotations APIs**: 5 (CRUD operations)
- **User Management APIs**: 5 (Info, Setup, Sync, Context)
- **WebSocket Events**: 6 (Comments & Annotations real-time)
- **External Service APIs**: 4 (Keycloak Admin, Email)
- **Security Middleware**: 3 (JWT, Roles, Access Control)

### **Total: 46 APIs**

---

## 🔄 API Flow Examples

### **Complete Media Sharing Flow:**
1. **Owner uploads media** → `POST /api/media/upload`
2. **Owner creates share link** → `POST /api/media/:id/share-links`
3. **Email sent** → SMTP API call
4. **User clicks link** → `GET /api/media/share-links/:token/check`
5. **User accepts access** → `POST /api/media/share-links/:token/accept`
6. **Real-time collaboration** → WebSocket events

### **Complete Organization Invite Flow:**
1. **Owner creates invite** → `POST /api/invites`
2. **Keycloak user creation** → Keycloak Admin API
3. **Email notification** → SMTP API call
4. **User clicks invite** → `GET /api/invites/:token`
5. **User accepts invite** → `POST /api/invites/:token/accept`
6. **Organization setup** → Keycloak Admin API calls

---

## 🎯 Why These APIs Are Used

### **1. REST APIs (Express)**
- **Standardization**: Follows REST conventions for consistency
- **Stateless**: Each request contains all necessary information
- **Scalability**: Easy to scale and cache
- **Documentation**: Self-documenting through HTTP methods

### **2. WebSocket APIs (Socket.io)**
- **Real-time Communication**: Enables live collaboration
- **Bidirectional**: Both client and server can send messages
- **Room Management**: Organizes users by media sessions
- **Event-Driven**: Responds to user actions instantly

### **3. External Service APIs**
- **Keycloak**: Enterprise-grade authentication and authorization
- **SMTP**: Reliable email delivery for notifications
- **File Storage**: Local file management for media uploads

### **4. Security APIs**
- **JWT Validation**: Secure token-based authentication
- **Role-Based Access**: Granular permission control
- **Middleware**: Reusable security components

This comprehensive API architecture enables your Media Review Application to provide a secure, scalable, and collaborative platform for media sharing and review.
