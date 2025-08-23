// server/scripts/debug-media-access.js
import sequelize from '../db.js';
import MediaAccess from '../models/MediaAccess.js';
import ShareLink from '../models/ShareLink.js';

async function debugMediaAccess() {
  try {
    console.log('🔍 Debugging MediaAccess table...\n');
    
    // Check table structure
    console.log('1. Checking table structure...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'media_access'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in media_access table:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if created_by column exists
    const hasCreatedBy = columns.some(col => col.column_name === 'created_by');
    console.log(`\n✅ created_by column exists: ${hasCreatedBy}`);
    
    // Check sample data
    console.log('\n2. Checking sample MediaAccess records...');
    const sampleAccess = await MediaAccess.findAll({ limit: 3 });
    console.log(`Found ${sampleAccess.length} sample records:`);
    sampleAccess.forEach((access, i) => {
      console.log(`  Record ${i + 1}:`, {
        id: access.id,
        mediaId: access.mediaId,
        userId: access.userId,
        role: access.role,
        createdBy: access.createdBy,
        createdAt: access.createdAt
      });
    });
    
    // Check ShareLink sample data
    console.log('\n3. Checking sample ShareLink records...');
    const sampleLinks = await ShareLink.findAll({ limit: 3 });
    console.log(`Found ${sampleLinks.length} sample share links:`);
    sampleLinks.forEach((link, i) => {
      console.log(`  Link ${i + 1}:`, {
        id: link.id,
        mediaId: link.mediaId,
        grantedRole: link.grantedRole,
        createdBy: link.createdBy,
        createdAt: link.createdAt
      });
    });
    
    // Test creating a sample MediaAccess record
    console.log('\n4. Testing MediaAccess creation...');
    try {
      const testAccess = await MediaAccess.create({
        mediaId: 999999, // Use a dummy ID
        userId: 'test-user-123',
        role: 'reviewer',
        createdBy: 'test-owner-456'
      });
      console.log('✅ Test record created:', {
        id: testAccess.id,
        createdBy: testAccess.createdBy
      });
      
      // Clean up test record
      await testAccess.destroy();
      console.log('✅ Test record cleaned up');
    } catch (e) {
      console.log('❌ Test record creation failed:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await sequelize.close();
  }
}

debugMediaAccess();
