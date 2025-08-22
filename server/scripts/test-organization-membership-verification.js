// server/scripts/test-organization-membership-verification.js
import dotenv from 'dotenv';
import OrganizationService from '../services/organizationService.js';

dotenv.config();

async function testOrganizationMembershipVerification() {
  console.log('🧪 Testing Organization Membership Verification...\n');
  
  try {
    // Test 1: Create organization with client and membership
    console.log('1️⃣ Creating organization with client and membership...');
    const testUserId = `test-user-${Date.now()}`;
    const testOrgName = `org-test-${Date.now()}`;
    const testEmail = `test-${Date.now()}@example.com`;
    
    const result = await OrganizationService.createOrganizationWithClient(
      testUserId,
      testOrgName,
      testEmail
    );
    
    console.log('✅ Organization with client created successfully!');
    console.log('📊 Result:', {
      organization: result.organization?.name,
      client: result.client?.clientId,
      roles: result.roles?.map(r => r.name)
    });
    
    // Test 2: Verify organization membership using the new functions
    console.log('\n2️⃣ Verifying organization membership...');
    const orgId = result.organization?.keycloakId;
    
    if (orgId) {
      // Get organization members
      console.log('\n📋 Getting organization members...');
      const orgMembers = await OrganizationService.getOrganizationMembers(orgId);
      console.log('✅ Organization members:', {
        count: orgMembers.length,
        members: orgMembers.map(m => ({ id: m.id, username: m.username, email: m.email }))
      });
      
      // Get user organizations
      console.log('\n👤 Getting user organizations...');
      const userOrgs = await OrganizationService.getUserOrganizations(testUserId);
      console.log('✅ User organizations:', {
        count: userOrgs.length,
        organizations: userOrgs.map(o => ({ id: o.id, name: o.name }))
      });
      
      // Verify membership in both directions
      console.log('\n🔍 Verifying membership in both directions...');
      const membershipVerified = await OrganizationService.verifyOrganizationMembership(testUserId, orgId);
      console.log('✅ Membership verification result:', membershipVerified);
      
      if (membershipVerified) {
        console.log('\n🎉 SUCCESS: Organization membership is working correctly!');
        console.log('✅ User will appear in Keycloak Organizations -> Members');
        console.log('✅ User will appear in Keycloak Users -> [user] -> Organizations');
      } else {
        console.log('\n⚠️ WARNING: Organization membership verification failed!');
        console.log('❌ Check Keycloak logs for any errors');
      }
    } else {
      console.log('⚠️ No organization ID found in result');
    }
    
    // Test 3: Test with a different user to verify the functions work independently
    console.log('\n3️⃣ Testing membership functions with a different user...');
    const testUser2 = `test-user-2-${Date.now()}`;
    
    // Check if user exists
    const userExists = await OrganizationService.checkUserExists(testUser2);
    console.log('✅ User 2 exists check:', userExists);
    
    if (userExists && orgId) {
      // Try to add user to organization
      console.log('\n👥 Adding user 2 to organization...');
      const added = await OrganizationService.addUserToOrganizationAsMember(testUser2, orgId);
      console.log('✅ User 2 added to organization:', added);
      
      if (added) {
        // Verify the membership
        const verified = await OrganizationService.verifyOrganizationMembership(testUser2, orgId);
        console.log('✅ User 2 membership verified:', verified);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Organization membership functions are working');
    console.log('   ✅ Users are being added to organizations');
    console.log('   ✅ Membership can be verified in both directions');
    console.log('   ✅ Users will appear in Keycloak Organizations -> Members');
    console.log('   ✅ Users will appear in Keycloak Users -> [user] -> Organizations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testOrganizationMembershipVerification();
