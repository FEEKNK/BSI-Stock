import { pool } from './db.js';

async function initCodes() {
  try {
    console.log('Setting up structured barcode tables...');

    // 1. Create category_codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS category_codes (
        code VARCHAR(2) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);
    console.log('✓ category_codes table ready');

    // 2. Create size_codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS size_codes (
        code VARCHAR(2) PRIMARY KEY,
        name VARCHAR(20) NOT NULL UNIQUE
      )
    `);
    console.log('✓ size_codes table ready');

    // 3. Create barcode_counter table (global running number)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barcode_counter (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_value INTEGER NOT NULL DEFAULT 0,
        CHECK (id = 1)
      )
    `);
    await pool.query(`INSERT INTO barcode_counter(id, last_value) VALUES(1, 0) ON CONFLICT DO NOTHING`);
    console.log('✓ barcode_counter table ready');

    // 4. Add product_code column to products if not exists
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS product_code VARCHAR(3)
    `);
    console.log('✓ product_code column added to products');

    // 5. Seed category_codes
    const categories = [
      ['10', 'เสื้อชั้นใน'],
      ['11', 'ชุดชั้นใน'],
      ['20', 'กางเกงใน'],
      ['30', 'อุปกรณ์เสริม'],
      ['90', 'อื่นๆ'],
    ];
    for (const [code, name] of categories) {
      await pool.query(
        `INSERT INTO category_codes(code, name) VALUES($1, $2) ON CONFLICT (code) DO UPDATE SET name=$2`,
        [code, name]
      );
    }
    console.log('✓ category_codes seeded');

    // 6. Seed size_codes
    const sizes = [
      ['00', 'free size'], ['00', 'ฟรีไซส์'],
      ['01', '2XS'],
      ['02', 'XS'],
      ['03', 'S'],
      ['04', 'M'],
      ['05', 'L'],
      ['06', 'XL'],
      ['07', '2XL'],
      ['08', '3XL'],
      ['09', '4XL'],
      ['40', '40'],
      ['42', '42'],
      ['44', '44'],
      ['46', '46'],
      ['48', '48'],
      ['50', '50'],
      ['32', '32'],
      ['34', '34'],
      ['36', '36'],
      ['38', '38'],
    ];
    // Insert unique codes only
    const insertedCodes = new Set();
    for (const [code, name] of sizes) {
      if (insertedCodes.has(code)) continue;
      insertedCodes.add(code);
      await pool.query(
        `INSERT INTO size_codes(code, name) VALUES($1, $2) ON CONFLICT (code) DO NOTHING`,
        [code, name]
      );
    }
    console.log('✓ size_codes seeded');

    console.log('\nInit completed successfully!');
  } catch (err) {
    console.error('Init failed:', err);
  } finally {
    await pool.end();
  }
}

initCodes();
