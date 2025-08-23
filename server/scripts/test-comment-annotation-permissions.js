// server/scripts/test-comment-annotation-permissions.js
import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Annotation from '../models/Annotation.js';
import Media from '../models/Media.js';
import User from '../models/User.js';

// Test data
const testUsers = {
  owner: {
    sub: 'owner-user-id',
    preferred_username: 'owner',
    realm_access: { roles: ['owner'] }
  },
  reviewer: {
    sub: 'reviewer-user-id',
    preferred_username: 'reviewer',
    realm_access: { roles: ['reviewer'] }
  },
  viewer: {
    sub: 'viewer-user-id',
    preferred_username: 'viewer',
    realm_access: { roles: ['viewer'] }
  }
};

const testMediaId = 'test-media-id';

// Helper function to check permissions
function checkDeletePermission(user, commentUserId) {
  const currentUserId = user.sub;
  const isCommentAuthor = String(commentUserId) === String(currentUserId);
  const allClientRoles = Object.values(user?.resource_access || {}).flatMap((e) => e?.roles || []);
  const isOwner = (user?.realm_access?.roles || []).includes('owner') || allClientRoles.includes('owner');
  
  return isCommentAuthor || isOwner;
}

function checkEditPermission(user, commentUserId) {
  const currentUserId = user.sub;
  return String(commentUserId) === String(currentUserId);
}

async function testPermissions() {
  console.log('🧪 Testing Comment and Annotation Permissions\n');

  // Test 1: Owner permissions
  console.log('1. Testing Owner Permissions:');
  console.log('   - Owner can delete own comment:', checkDeletePermission(testUsers.owner, 'owner-user-id'));
  console.log('   - Owner can delete reviewer comment:', checkDeletePermission(testUsers.owner, 'reviewer-user-id'));
  console.log('   - Owner can edit own comment:', checkEditPermission(testUsers.owner, 'owner-user-id'));
  console.log('   - Owner can edit reviewer comment:', checkEditPermission(testUsers.owner, 'reviewer-user-id'));

  // Test 2: Reviewer permissions
  console.log('\n2. Testing Reviewer Permissions:');
  console.log('   - Reviewer can delete own comment:', checkDeletePermission(testUsers.reviewer, 'reviewer-user-id'));
  console.log('   - Reviewer can delete owner comment:', checkDeletePermission(testUsers.reviewer, 'owner-user-id'));
  console.log('   - Reviewer can edit own comment:', checkEditPermission(testUsers.reviewer, 'reviewer-user-id'));
  console.log('   - Reviewer can edit owner comment:', checkEditPermission(testUsers.reviewer, 'owner-user-id'));

  // Test 3: Viewer permissions
  console.log('\n3. Testing Viewer Permissions:');
  console.log('   - Viewer can delete own comment:', checkDeletePermission(testUsers.viewer, 'viewer-user-id'));
  console.log('   - Viewer can delete owner comment:', checkDeletePermission(testUsers.viewer, 'owner-user-id'));
  console.log('   - Viewer can edit own comment:', checkEditPermission(testUsers.viewer, 'viewer-user-id'));
  console.log('   - Viewer can edit owner comment:', checkEditPermission(testUsers.viewer, 'owner-user-id'));

  console.log('\n✅ Permission logic test completed!');
  console.log('\n📋 Summary:');
  console.log('   - Users can delete their own comments/annotations');
  console.log('   - Owners can delete any comments/annotations');
  console.log('   - Users can only edit their own comments/annotations');
  console.log('   - Viewers have the same permissions as reviewers for their own content');
}

// Run the test
testPermissions().catch(console.error);
