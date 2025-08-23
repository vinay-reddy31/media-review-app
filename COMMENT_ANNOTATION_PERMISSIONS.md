# Comment and Annotation Permissions

This document outlines the permission system for comments and annotations in the media review application.

## Overview

The permission system allows users to manage their own content while giving owners administrative control over all content.

## Permission Rules

### Comments

#### Edit Permissions
- **Users can edit their own comments only**
- This applies to all user roles (owner, reviewer, viewer)
- Users cannot edit comments created by other users

#### Delete Permissions
- **Users can delete their own comments**
- **Owners can delete any comment** (including those created by reviewers and viewers)
- Reviewers and viewers cannot delete comments created by other users

### Annotations

#### Edit Permissions
- **Users can edit their own annotations only**
- This applies to all user roles (owner, reviewer, viewer)
- Users cannot edit annotations created by other users

#### Delete Permissions
- **Users can delete their own annotations**
- **Owners can delete any annotation** (including those created by reviewers and viewers)
- Reviewers and viewers cannot delete annotations created by other users

## Implementation Details

### Backend Logic (server/server.js)

The server enforces these permissions in the socket event handlers:

#### Comment Deletion
```javascript
// Allow deletion if user is comment author OR if user is owner
if (isCommentAuthor || isOwner) {
  // Delete comment
} else {
  // Send error: "You can only delete your own comments or you must be an owner"
}
```

#### Comment Editing
```javascript
// Only comment author can edit
if (isCommentAuthor) {
  // Edit comment
} else {
  // Send error: "You are not authorized to edit this comment"
}
```

#### Annotation Deletion
```javascript
// Allow deletion if user is annotation author OR if user is owner
if (isAnnotationAuthor || isOwner) {
  // Delete annotation
} else {
  // Send error: "You can only delete your own annotations or you must be an owner"
}
```

#### Annotation Editing
```javascript
// Only annotation author can edit
if (isAnnotationAuthor) {
  // Edit annotation
} else {
  // Send error: "You are not authorized to edit this annotation"
}
```

### Frontend Logic

The frontend components check permissions before showing edit/delete options:

#### CommentsPanel.jsx
```javascript
// Check if user can delete (users can delete their own comments, owners can delete any comment)
const canDelete = (commentUserId) => {
  const currentUserId = session?.user?.id || session?.user?.sub;
  
  // Owner can delete any comment
  if (userRole === "owner") return true;
  
  // Users can delete their own comments
  if (String(commentUserId) === String(currentUserId)) return true;
  
  return false;
};

// Check if user can edit (users can edit their own comments)
const canEdit = (commentUserId) => {
  const currentUserId = session?.user?.id || session?.user?.sub;
  return String(commentUserId) === String(currentUserId);
};
```

#### AnnotationsPanel.jsx
```javascript
// Check if user can delete (users can delete their own annotations, owners can delete any annotation)
const canDelete = (annotationUserId) => {
  const currentUserId = session?.user?.id || session?.user?.sub;
  
  // Owner can delete any annotation
  if (userRole === "owner") return true;
  
  // Users can delete their own annotations
  if (String(annotationUserId) === String(currentUserId)) return true;
  
  return false;
};

// Check if user can edit (users can edit their own annotations)
const canEdit = (annotationUserId) => {
  const currentUserId = session?.user?.id || session?.user?.sub;
  return String(annotationUserId) === String(currentUserId);
};
```

## User Interface

### Edit/Delete Menu
- Three-dot menu (⋮) appears next to comments/annotations where the user has permissions
- Menu shows appropriate options based on permissions:
  - **Edit**: Only shown if user can edit the item
  - **Delete**: Only shown if user can delete the item

### Visual Indicators
- Edit mode: Text area appears in place of the comment/annotation text
- Delete mode: Loading state shows "Deleting..." text
- Error messages: Alert dialogs show permission errors

## Security Considerations

1. **Backend Validation**: All permission checks are enforced on the server side
2. **Frontend Hiding**: UI elements are hidden based on permissions, but this is for UX only
3. **String Comparison**: User IDs are compared as strings to handle different data types
4. **Role Checking**: Owner role is checked from both realm_access and resource_access

## Testing

Use the test script to verify permission logic:
```bash
cd server
node scripts/test-comment-annotation-permissions.js
```

## Examples

### Scenario 1: Owner User
- Can edit and delete their own comments/annotations
- Can delete (but not edit) comments/annotations created by reviewers
- Can delete (but not edit) comments/annotations created by viewers

### Scenario 2: Reviewer User
- Can edit and delete their own comments/annotations
- Cannot edit or delete comments/annotations created by owners
- Cannot edit or delete comments/annotations created by other reviewers

### Scenario 3: Viewer User
- Can edit and delete their own comments/annotations (if they have permission to create them)
- Cannot edit or delete comments/annotations created by others
- Typically viewers have read-only access, but the permission system supports their content management
