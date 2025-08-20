// server/scripts/test-membership-fix.js
import dotenv from 'dotenv';
import OrganizationService from '../services/organizationService.js';

dotenv.config();

async function testMembershipFix() {
  console.log('🧪 Testing Membership Fix...\n');
  
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
    
    // Test 2: Verify organization membership
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
        console.log('\n📋 Manual verification steps:');
        console.log('   1. Go to Keycloak Admin Console');
        console.log('   2. Navigate to Organizations → Your Organization → Members tab');
        console.log('   3. You should see the user in the members list');
        console.log('   4. Go to Users → Your User → Organizations tab');
        console.log('   5. You should see the organization in the user\'s organizations');
      } else {
        console.log('\n⚠️ WARNING: Organization membership verification failed!');
        console.log('❌ Check Keycloak logs for any errors');
      }
    } else {
      console.log('⚠️ No organization ID found in result');
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testMembershipFix();
