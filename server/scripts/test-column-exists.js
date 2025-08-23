// server/scripts/test-column-exists.js
import sequelize from '../db.js';

async function testColumnExists() {
  try {
    console.log('🔍 Testing if created_by column exists...\n');
    
    // Check if column exists
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'media_access' 
      AND column_name = 'created_by'
    `);
    
    if (columns.length === 0) {
      console.log('❌ created_by column does NOT exist');
      console.log('Adding it now...');
      
      try {
        await sequelize.query(`
          ALTER TABLE media_access 
          ADD COLUMN created_by VARCHAR
        `);
        console.log('✅ created_by column added successfully');
      } catch (e) {
        console.log('❌ Failed to add column:', e.message);
      }
    } else {
      console.log('✅ created_by column exists:', columns[0]);
    }
    
    // Test inserting a record with created_by
    console.log('\n🧪 Testing insert with created_by...');
    try {
      const [result] = await sequelize.query(`
        INSERT INTO media_access (media_id, user_id, role, created_by, created_at, updated_at)
        VALUES (999999, 'test-user-123', 'reviewer', 'test-owner-456', NOW(), NOW())
        ON CONFLICT (media_id, user_id) DO NOTHING
        RETURNING *
      `);
      
      if (result && result.length > 0) {
        console.log('✅ Test insert successful:', result[0]);
        
        // Clean up
        await sequelize.query(`
          DELETE FROM media_access WHERE media_id = 999999 AND user_id = 'test-user-123'
        `);
        console.log('✅ Test record cleaned up');
      } else {
        console.log('ℹ️ Test record already existed or no conflict');
      }
    } catch (e) {
      console.log('❌ Test insert failed:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

testColumnExists();
