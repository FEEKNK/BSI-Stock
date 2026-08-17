import { pool } from './db.js';

// Category mapping: name -> code
const CATEGORY_MAP = {
  'เสื้อชั้นใน': '10',
  'ชุดชั้นใน': '11',
  'กางเกงใน': '20',
  'อุปกรณ์เสริม': '30',
};

// Size mapping: name (case-insensitive) -> code
const SIZE_MAP = {
  'free size': '00',
  'ฟรีไซส์': '00',
  'freesize': '00',
  '2xs': '01',
  'xs': '02',
  's': '03',
  'm': '04',
  'l': '05',
  'xl': '06',
  '2xl': '07',
  '3xl': '08',
  '4xl': '09',
  '32': '32',
  '34': '34',
  '36': '36',
  '38': '38',
  '40': '40',
  '42': '42',
  '44': '44',
  '46': '46',
  '48': '48',
  '50': '50',
};

function getSizeCode(sizeName) {
  const key = sizeName.toLowerCase().trim();
  return SIZE_MAP[key] || '99'; // 99 = unknown
}

function getCategoryCode(categoryName) {
  return CATEGORY_MAP[categoryName] || '90'; // 90 = other
}

async function getNextCounter(client) {
  const res = await client.query(
    `UPDATE barcode_counter SET last_value = last_value + 1 WHERE id = 1 RETURNING last_value`
  );
  return res.rows[0].last_value;
}

function buildBarcode(categoryCode, productCode, sizeCode, counter) {
  const runningNum = String(counter).padStart(5, '0');
  return `${categoryCode}${productCode}${sizeCode}${runningNum}`;
}

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting structured barcode migration...\n');
    
    await client.query('BEGIN');
    
    const { rows: products } = await client.query(
      `SELECT id, name, category, sizes FROM products ORDER BY category, name`
    );

    // Assign product_code per category
    const categoryProductCounter = {}; // { categoryName: lastCode }

    for (const product of products) {
      const catCode = getCategoryCode(product.category);
      
      // Assign sequential product_code within category
      if (!categoryProductCounter[product.category]) {
        categoryProductCounter[product.category] = 0;
      }
      categoryProductCounter[product.category]++;
      const productCode = String(categoryProductCounter[product.category]).padStart(3, '0');
      
      // Save product_code
      await client.query(
        `UPDATE products SET product_code = $1 WHERE id = $2`,
        [productCode, product.id]
      );

      console.log(`Product: ${product.name} (${product.category}) -> catCode=${catCode}, productCode=${productCode}`);

      // Re-assign barcodes for each size
      if (product.sizes && Object.keys(product.sizes).length > 0) {
        const newSizes = {};
        for (const [sizeName, sizeData] of Object.entries(product.sizes)) {
          const sizeCode = getSizeCode(sizeName);
          const counter = await getNextCounter(client);
          const newBarcode = buildBarcode(catCode, productCode, sizeCode, counter);
          
          const oldStock = typeof sizeData === 'object' ? sizeData.stock : Number(sizeData);
          newSizes[sizeName] = { stock: oldStock || 0, barcode: newBarcode };
          
          console.log(`  Size: ${sizeName} -> sizeCode=${sizeCode} -> barcode=${newBarcode}`);
        }
        await client.query(
          `UPDATE products SET sizes = $1 WHERE id = $2`,
          [JSON.stringify(newSizes), product.id]
        );
      }
    }

    await client.query('COMMIT');
    console.log('\n✓ Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
