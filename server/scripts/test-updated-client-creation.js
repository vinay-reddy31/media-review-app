// server/scripts/test-updated-client-creation.js
import dotenv from 'dotenv';
import { createKeycloakClient, getAdminToken } from '../utils/keycloakAdmin.js';

dotenv.config();

async function testUpdatedClientCreation() {
  console.log('🧪 Testing Updated Keycloak Client Creation (Reference Pattern)...\n');
  
  try {
    // Test 1: Get admin token
    console.log('1️⃣ Getting admin token...');
    const adminToken = await getAdminToken();
    console.log('✅ Admin token obtained successfully\n');
    
    // Test 2: Create client using updated function
    console.log('2️⃣ Creating client using updated function...');
    const testClientId = `test-client-${Date.now()}`;
    const testClientName = `Test Client ${Date.now()}`;
    
    const client = await createKeycloakClient(testClientId, testClientName);
    console.log('✅ Client created successfully!');
    console.log('📊 Client details:', {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      hasSecret: !!client.clientSecret
    });
    
    // Test 3: Create another client to verify consistency
    console.log('\n3️⃣ Creating another client to verify consistency...');
    const testClientId2 = `test-client-2-${Date.now()}`;
    const client2 = await createKeycloakClient(testClientId2, testClientId2);
    console.log('✅ Second client created successfully!');
    console.log('📊 Second client details:', {
      id: client2.id,
      clientId: client2.clientId,
      name: client2.name,
      hasSecret: !!client2.clientSecret
    });
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ The updated client creation is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testUpdatedClientCreation();
