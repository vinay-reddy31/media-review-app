// server/scripts/add-created-by-column.js
import sequelize from '../db.js';

async function addCreatedByColumn() {
  try {
    console.log('Checking if created_by column exists...');
    
    // Check if column exists
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'media_access' 
      AND column_name = 'created_by'
    `);
    
    if (columns.length === 0) {
      console.log('Adding created_by column...');
      await sequelize.query(`
        ALTER TABLE media_access 
        ADD COLUMN created_by VARCHAR
      `);
      console.log('✅ created_by column added successfully');
    } else {
      console.log('✅ created_by column already exists');
    }
    
    // Add comment
    try {
      await sequelize.query(`
        COMMENT ON COLUMN media_access.created_by IS 'Keycloak user ID of who shared this media'
      `);
      console.log('✅ Comment added to created_by column');
    } catch (e) {
      console.log('Comment already exists or failed to add');
    }
    
  } catch (error) {
    console.error('❌ Error adding created_by column:', error);
  } finally {
    await sequelize.close();
  }
}

addCreatedByColumn();
