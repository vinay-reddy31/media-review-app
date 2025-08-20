// server/scripts/test-complete-workflow.js
import dotenv from 'dotenv';
import OrganizationService from '../services/organizationService.js';
import { getClientByClientId } from '../utils/keycloakAdmin.js';

dotenv.config();

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Organization + Client Creation Workflow...\n');
  
  try {
    // Test 1: Create organization with client (new user)
    console.log('1️⃣ Creating organization with client for new user...');
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
    console.log('✅ Retrieved client:', retrievedClient);
    
    // Test 3: Create client for existing organization
    console.log('\n3️⃣ Creating client for existing organization...');
    const existingOrgName = `org-existing-${Date.now()}`;
    const clientResult = await OrganizationService.createClientForExistingOrganization(
      existingOrgName,
      `client-${existingOrgName}`
    );
    console.log('✅ Client created for existing organization:', clientResult);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testCompleteWorkflow();
