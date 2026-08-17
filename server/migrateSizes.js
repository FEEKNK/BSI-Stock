import { pool } from './db.js';

const generateBarcodeValue = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${timestamp}${random}`; // 12 digits
};

async function migrate() {
  try {
    console.log('Starting migration...');
    const { rows } = await pool.query('SELECT id, name, sizes FROM products');
    
    for (const row of rows) {
      if (!row.sizes || Object.keys(row.sizes).length === 0) continue;
      
      const newSizes = {};
      let needsUpdate = false;
      
      for (const [size, value] of Object.entries(row.sizes)) {
        // If the value is a number (old format), convert it
        if (typeof value === 'number' || typeof value === 'string') {
          newSizes[size] = {
            stock: Number(value) || 0,
            barcode: generateBarcodeValue()
          };
          needsUpdate = true;
        } else if (typeof value === 'object' && value !== null) {
          // Already in new format, just copy
          newSizes[size] = value;
        }
      }
      
      if (needsUpdate) {
        await pool.query('UPDATE products SET sizes = $1 WHERE id = $2', [JSON.stringify(newSizes), row.id]);
        console.log(`Migrated sizes for product: ${row.name}`);
      }
    }
    
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
