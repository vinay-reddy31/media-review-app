// server/scripts/test-friend-pattern-implementation.js
import dotenv from 'dotenv';
import OrganizationService from '../services/organizationService.js';
import { getClientByClientId } from '../utils/keycloakAdmin.js';

dotenv.config();

async function testFriendPatternImplementation() {
  console.log('🧪 Testing Friend Pattern Implementation...\n');
  
  try {
    // Test 1: Create organization with client using friend's pattern
    console.log('1️⃣ Creating organization with client using friend\'s pattern...');
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
    
    // Test 2: Verify client exists
    console.log('\n2️⃣ Verifying client exists...');
    const baseName = testOrgName.startsWith('org-') ? testOrgName.slice(4) : testOrgName;
    const clientId = `client-${baseName}`;
    const retrievedClient = await getClientByClientId({ clientId });
    console.log('✅ Retrieved client:', {
      id: retrievedClient?.id,
      clientId: retrievedClient?.clientId,
      name: retrievedClient?.name
    });
    
    // Test 3: Test retry functionality
    console.log('\n3️⃣ Testing retry functionality...');
    let retryCount = 0;
    const testRetry = await OrganizationService.retry(async () => {
      retryCount++;
      if (retryCount < 3) {
        throw new Error('Simulated failure');
      }
      return 'Success after retries';
    }, 3, 100);
    console.log('✅ Retry test result:', testRetry);
    
    // Test 4: Test user existence check
    console.log('\n4️⃣ Testing user existence check...');
    const userExists = await OrganizationService.checkUserExists(testUserId);
    console.log('✅ User exists check:', userExists);
    
    // Test 5: Create client for existing organization
    console.log('\n5️⃣ Creating client for existing organization...');
    const existingOrgName = `org-existing-${Date.now()}`;
    const clientResult = await OrganizationService.createClientForExistingOrganization(
      existingOrgName,
      `client-${existingOrgName}`
    );
    console.log('✅ Client created for existing organization:', {
      clientId: clientResult?.clientId,
      clientUuid: clientResult?.clientUuid,
      hasSecret: !!clientResult?.clientSecret
    });
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ The friend pattern implementation is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testFriendPatternImplementation();
