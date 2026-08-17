import { pool } from './db.js';
import { buildStructuredBarcode } from '../src/utils/barcode.js';

const SIZE_CODES = {
  '3XL': '10',
  '40': '40',
  '42': '42',
  '44': '44',
  '46': '46',
  '48': '48',
  '50': '50',
};

async function fixData() {
  const client = await pool.connect();
  try {
    console.log('Starting data fix...');

    // 1. Get products
    const { rows } = await client.query(`SELECT * FROM products WHERE name IN ('Wacoal', 'Avie', 'Anne')`);
    const wacoal = rows.find(r => r.name === 'Wacoal');
    const avie = rows.find(r => r.name === 'Avie');
    const anne = rows.find(r => r.name === 'Anne');

    const catCode = '10'; // เสื้อชั้นใน

    // 2. Fix Wacoal (Remove wrong sizes)
    const wacoalSizes = { ...wacoal.sizes };
    const wrongSizes = ['3XL', '40', '42', '44', '46', '48', '50'];
    wrongSizes.forEach(s => delete wacoalSizes[s]);
    
    // Recalculate Wacoal total stock
    const wacoalTotal = Object.values(wacoalSizes).reduce((acc, val) => acc + (val?.stock || 0), 0);
    await client.query(`UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3`, [JSON.stringify(wacoalSizes), wacoalTotal, wacoal.id]);
    console.log('Wacoal fixed. Total stock:', wacoalTotal);

    // Get counter for barcodes
    let counterRes = await client.query('SELECT last_value FROM barcode_counter WHERE id = 1');
    let counter = counterRes.rows[0].last_value;

    // 3. Fix Avie (Add 3XL: 4)
    const avieSizes = avie.sizes || {};
    counter++;
    avieSizes['3XL'] = { stock: 4, barcode: buildStructuredBarcode(catCode, avie.product_code, SIZE_CODES['3XL'], counter) };
    const avieTotal = Object.values(avieSizes).reduce((acc, val) => acc + (val?.stock || 0), 0);
    await client.query(`UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3`, [JSON.stringify(avieSizes), avieTotal, avie.id]);
    console.log('Avie fixed. Total stock:', avieTotal);

    // 4. Fix Anne (Add 40, 42, 44, 46, 48, 50)
    const anneSizes = anne.sizes || {};
    const anneNewSizes = { '40': 14, '42': 17, '44': 20, '46': 11, '48': 15, '50': 22 };
    for (const [size, stock] of Object.entries(anneNewSizes)) {
      counter++;
      anneSizes[size] = { stock, barcode: buildStructuredBarcode(catCode, anne.product_code, SIZE_CODES[size], counter) };
    }
    const anneTotal = Object.values(anneSizes).reduce((acc, val) => acc + (val?.stock || 0), 0);
    await client.query(`UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3`, [JSON.stringify(anneSizes), anneTotal, anne.id]);
    console.log('Anne fixed. Total stock:', anneTotal);

    // Update counter back
    await client.query('UPDATE barcode_counter SET last_value = $1 WHERE id = 1', [counter]);
    
    console.log('Data fix completed!');
  } catch (err) {
    console.error('Error fixing data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

fixData();
