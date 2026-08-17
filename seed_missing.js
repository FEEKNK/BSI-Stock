import { pool } from './server/db.js';
import { buildStructuredBarcode } from './src/utils/barcode.js';

async function seed() {
  const client = await pool.connect();
  try {
    // Check if 'ผ้าคลุมหน้าอก' exists
    const { rows } = await client.query(`SELECT * FROM products WHERE name = 'ผ้าคลุมหน้าอก'`);
    if (rows.length === 0) {
      // Create new
      // Get category code
      const catCode = '10'; // เสื้อชั้นใน
      
      // Get next product code
      const { rows: maxCodeRows } = await client.query(
        `SELECT MAX(CAST(product_code AS INTEGER)) as max_code FROM products WHERE category = 'เสื้อชั้นใน' AND product_code IS NOT NULL`
      );
      const nextProductCode = String((maxCodeRows[0].max_code || 0) + 1).padStart(3, '0');
      
      // Get next barcode counter
      const { rows: counterRows } = await client.query(
        `UPDATE barcode_counter SET last_value = last_value + 1 WHERE id = 1 RETURNING last_value`
      );
      const nextCounter = counterRows[0].last_value;
      
      // Size code for free size is '00'
      const barcode = buildStructuredBarcode(catCode, nextProductCode, '00', nextCounter);
      
      const sizes = {
        'free size': {
          stock: 48,
          barcode: barcode
        }
      };
      
      await client.query(`
        INSERT INTO products (name, category, price, sizes, total_stock, product_code)
        VALUES ('ผ้าคลุมหน้าอก', 'เสื้อชั้นใน', 0, $1, 48, $2)
      `, [JSON.stringify(sizes), nextProductCode]);
      
      console.log('Successfully inserted ผ้าคลุมหน้าอก with product_code ' + nextProductCode);
    } else {
      console.log('ผ้าคลุมหน้าอก already exists.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
