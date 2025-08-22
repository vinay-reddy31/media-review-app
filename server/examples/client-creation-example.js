// server/examples/client-creation-example.js
import { 
  createKeycloakClient, 
  createKeycloakClientWithReferencePattern,
  getAdminToken 
} from '../utils/keycloakAdmin.js';
import OrganizationService from '../services/organizationService.js';

// Example 1: Create a client using the enhanced function
async function createClientExample() {
  try {
    console.log('🔧 Creating client using enhanced function...');
    const client = await createKeycloakClient('example-client', 'Example Client');
    console.log('✅ Client created:', client);
  } catch (error) {
    console.error('❌ Error creating client:', error.message);
  }
}

// Example 2: Create a client using reference pattern
async function createClientWithReferencePattern() {
  try {
    console.log('🔧 Creating client using reference pattern...');
    const adminToken = await getAdminToken();
    const client = await createKeycloakClientWithReferencePattern(adminToken, 'ref-example-client');
    console.log('✅ Client created with reference pattern:', client);
  } catch (error) {
    console.error('❌ Error creating client with reference pattern:', error.message);
  }
}

// Example 3: Create client for existing organization
async function createClientForOrganization() {
  try {
    console.log('🔧 Creating client for existing organization...');
    const client = await OrganizationService.createClientForExistingOrganization(
      'example-org', 
      'example-org-client'
    );
    console.log('✅ Client created for organization:', client);
  } catch (error) {
    console.error('❌ Error creating client for organization:', error.message);
  }
}

// Example 4: Complete organization creation with client
async function createOrganizationWithClient() {
  try {
    console.log('🔧 Creating organization with client...');
    const result = await OrganizationService.createOrganizationWithClient(
      'user-123',
      'example-organization',
      'user@example.com'
    );
    console.log('✅ Organization with client created:', result);
  } catch (error) {
    console.error('❌ Error creating organization with client:', error.message);
  }
}

// Run examples
async function runExamples() {
  console.log('🚀 Running Keycloak Client Creation Examples...\n');
  
  await createClientExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await createClientWithReferencePattern();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await createClientForOrganization();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await createOrganizationWithClient();
  
  console.log('\n🎉 All examples completed!');
}

// Uncomment to run examples
// runExamples();

export {
  createClientExample,
  createClientWithReferencePattern,
  createClientForOrganization,
  createOrganizationWithClient
};
