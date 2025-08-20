// server/scripts/test-client-creation.js
import dotenv from 'dotenv';
import { 
  createKeycloakClient, 
  createKeycloakClientWithReferencePattern,
  getAdminToken,
  getClientByClientId 
} from '../utils/keycloakAdmin.js';

dotenv.config();

async function testClientCreation() {
  console.log('🧪 Testing Keycloak Client Creation...\n');
  
  try {
    // Test 1: Get admin token
    console.log('1️⃣ Getting admin token...');
    const adminToken = await getAdminToken();
    console.log('✅ Admin token obtained successfully\n');
    
    // Test 2: Create client using enhanced function
    console.log('2️⃣ Creating client using enhanced function...');
    const testClientId = `test-client-${Date.now()}`;
    const enhancedClient = await createKeycloakClient(testClientId, `Test Client ${Date.now()}`);
    console.log('✅ Enhanced client creation result:', enhancedClient);
    
    // Test 3: Verify client exists
    console.log('\n3️⃣ Verifying client exists...');
    const retrievedClient = await getClientByClientId({ clientId: testClientId });
    console.log('✅ Retrieved client:', retrievedClient);
    
    // Test 4: Create client using reference pattern
    console.log('\n4️⃣ Creating client using reference pattern...');
    const refClientId = `ref-client-${Date.now()}`;
    const refClient = await createKeycloakClientWithReferencePattern(adminToken, refClientId);
    console.log('✅ Reference pattern client creation result:', refClient);
    
    // Test 5: Verify reference client exists
    console.log('\n5️⃣ Verifying reference client exists...');
    const retrievedRefClient = await getClientByClientId({ clientId: refClientId });
    console.log('✅ Retrieved reference client:', retrievedRefClient);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testClientCreation();
