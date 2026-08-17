import { pool } from './db.js';

async function fixTotalStock() {
  try {
    console.log('Fixing total_stock for all products...\n');
    
    const { rows: products } = await pool.query('SELECT id, name, sizes FROM products');
    
    for (const product of products) {
      const sizes = product.sizes || {};
      const totalStock = Object.values(sizes).reduce((sum, sizeData) => {
        const stock = typeof sizeData === 'number' || typeof sizeData === 'string' 
          ? Number(sizeData) 
          : (sizeData?.stock || 0);
        return sum + (Number(stock) || 0);
      }, 0);
      
      await pool.query(
        'UPDATE products SET total_stock = $1 WHERE id = $2',
        [totalStock, product.id]
      );
      console.log(`${product.name}: total_stock = ${totalStock}`);
    }
    
    console.log('\n✓ All total_stock values fixed!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fixTotalStock();
