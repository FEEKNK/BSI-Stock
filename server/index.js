import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products', details: err.message, stack: err.stack });
  }
});

app.get('/api/category-codes', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM category_codes ORDER BY code ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/size-codes', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM size_codes ORDER BY code ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, price, barcode, description, threshold, sizes, totalStock, product_code } = req.body;
    const q = `
      INSERT INTO products (name, category, price, barcode, description, threshold, sizes, total_stock, product_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [name, category, price || 0, barcode, description, threshold, JSON.stringify(sizes), totalStock, product_code || null];
    const { rows } = await query(q, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, barcode, description, threshold, sizes, totalStock, product_code } = req.body;
    const q = `
      UPDATE products 
      SET name = $1, category = $2, price = $3, barcode = $4, description = $5, 
          threshold = $6, sizes = $7, total_stock = $8, product_code = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    const values = [name, category, price || 0, barcode, description, threshold, JSON.stringify(sizes), totalStock, product_code || null, id];
    const { rows } = await query(q, values);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update stock specific
app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { sizes, totalStock } = req.body;
    const q = `
      UPDATE products 
      SET sizes = $1, total_stock = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await query(q, [JSON.stringify(sizes), totalStock, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// --- Dispensing History ---

// Get all dispensing history
app.get('/api/dispensing-history', async (req, res) => {
  try {
    const { hn, product_name, seller, start_date, end_date, type } = req.query;
    let baseQuery = 'SELECT * FROM dispensing_history WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (type && type !== 'ALL') {
      baseQuery += ` AND type = $${paramIndex++}`;
      values.push(type);
    }

    if (hn) {
      baseQuery += ` AND hn ILIKE $${paramIndex++}`;
      values.push(`%${hn}%`);
    }
    if (product_name) {
      baseQuery += ` AND product_name ILIKE $${paramIndex++}`;
      values.push(`%${product_name}%`);
    }
    if (seller) {
      baseQuery += ` AND seller ILIKE $${paramIndex++}`;
      values.push(`%${seller}%`);
    }
    if (start_date) {
      baseQuery += ` AND DATE(dispensed_date) >= $${paramIndex++}`;
      values.push(start_date);
    }
    if (end_date) {
      baseQuery += ` AND DATE(dispensed_date) <= $${paramIndex++}`;
      values.push(end_date);
    }

    baseQuery += ' ORDER BY dispensed_date DESC, created_at DESC';

    const { rows } = await query(baseQuery, values);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dispensing history' });
  }
});

// Create dispensing record (and deduct stock)
app.post('/api/dispensing-history', async (req, res) => {
  try {
    const { product_id, product_name, size, quantity, dispensed_date, hn, seller, note } = req.body;
    
    await query('BEGIN');

    // 1. Insert record
    const q = `
      INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [product_id, product_name, size, quantity, dispensed_date, hn, seller, note];
    const { rows } = await query(q, values);
    const newRecord = rows[0];

    // 2. Deduct stock
    if (product_id) {
      const { rows: prodRows } = await query('SELECT sizes, total_stock FROM products WHERE id = $1', [product_id]);
      if (prodRows.length > 0) {
        const prod = prodRows[0];
        let sizes = prod.sizes || {};
        let totalStock = prod.total_stock || 0;

        if (sizes[size]) {
          let oldStock = 0;
          if (typeof sizes[size] === 'object') {
            oldStock = Number(sizes[size].stock) || 0;
            sizes[size].stock = Math.max(0, oldStock - quantity);
          } else {
            oldStock = Number(sizes[size]) || 0;
            sizes[size] = Math.max(0, oldStock - quantity);
          }
          
          totalStock = Object.values(sizes).reduce((sum, sizeData) => {
            const s = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
            return sum + (Number(s) || 0);
          }, 0);

          await query('UPDATE products SET sizes = $1, total_stock = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [JSON.stringify(sizes), totalStock, product_id]);
        }
      }
    }

    await query('COMMIT');
    res.status(201).json(newRecord);
  } catch (err) {
    await query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create dispensing record' });
  }
});

// Bulk create dispensing records (and update stock)
app.post('/api/dispensing-history/bulk', async (req, res) => {
  try {
    const { mode, dispensed_date, hn, seller, note, items } = req.body;
    
    await query('BEGIN');

    const createdRecords = [];

    for (const item of items) {
      const { product_id, product_name, size, quantity } = item;

      // 1. Insert record
      const q = `
        INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [product_id, product_name, size, quantity, dispensed_date, hn, seller, note, mode];
      const { rows } = await query(q, values);
      createdRecords.push(rows[0]);

      // 2. Update stock
      if (product_id) {
        const { rows: prodRows } = await query('SELECT sizes, total_stock FROM products WHERE id = $1', [product_id]);
        if (prodRows.length > 0) {
          const prod = prodRows[0];
          let sizes = prod.sizes || {};
          let totalStock = prod.total_stock || 0;

          if (sizes[size] !== undefined) {
            let oldStock = 0;
            if (typeof sizes[size] === 'object') {
              oldStock = Number(sizes[size].stock) || 0;
              sizes[size].stock = mode === 'IN' ? oldStock + quantity : Math.max(0, oldStock - quantity);
            } else {
              oldStock = Number(sizes[size]) || 0;
              sizes[size] = mode === 'IN' ? oldStock + quantity : Math.max(0, oldStock - quantity);
            }
            
            totalStock = Object.values(sizes).reduce((sum, sizeData) => {
              const s = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
              return sum + (Number(s) || 0);
            }, 0);

            await query('UPDATE products SET sizes = $1, total_stock = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [JSON.stringify(sizes), totalStock, product_id]);
          }
        }
      }
    }

    await query('COMMIT');
    res.status(201).json({ success: true, count: createdRecords.length, records: createdRecords });
  } catch (err) {
    await query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to process bulk dispensing' });
  }
});


// Update dispensing record
app.put('/api/dispensing-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, product_name, size, quantity, dispensed_date, hn, seller, note } = req.body;
    
    await query('BEGIN');

    // Get old record to handle stock adjustment
    const { rows: oldRows } = await query('SELECT * FROM dispensing_history WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Record not found' });
    }
    const oldRecord = oldRows[0];

    // Revert old stock if product/size changed or quantity changed
    // For simplicity, we can revert old stock, then apply new stock
    if (oldRecord.product_id) {
      const { rows: pRows } = await query('SELECT sizes, total_stock FROM products WHERE id = $1', [oldRecord.product_id]);
      if (pRows.length > 0) {
        const prod = pRows[0];
        let sizes = prod.sizes || {};
        if (sizes[oldRecord.size]) {
          if (typeof sizes[oldRecord.size] === 'object') {
            sizes[oldRecord.size].stock = (Number(sizes[oldRecord.size].stock) || 0) + oldRecord.quantity;
          } else {
            sizes[oldRecord.size] = (Number(sizes[oldRecord.size]) || 0) + oldRecord.quantity;
          }
          let totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
          await query('UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3', [JSON.stringify(sizes), totalStock, oldRecord.product_id]);
        }
      }
    }

    // Apply new stock
    if (product_id) {
      const { rows: pRows } = await query('SELECT sizes, total_stock FROM products WHERE id = $1', [product_id]);
      if (pRows.length > 0) {
        const prod = pRows[0];
        let sizes = prod.sizes || {};
        if (sizes[size]) {
          if (typeof sizes[size] === 'object') {
            sizes[size].stock = Math.max(0, (Number(sizes[size].stock) || 0) - quantity);
          } else {
            sizes[size] = Math.max(0, (Number(sizes[size]) || 0) - quantity);
          }
          let totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
          await query('UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3', [JSON.stringify(sizes), totalStock, product_id]);
        }
      }
    }

    const q = `
      UPDATE dispensing_history 
      SET product_id = $1, product_name = $2, size = $3, quantity = $4, dispensed_date = $5, hn = $6, seller = $7, note = $8
      WHERE id = $9
      RETURNING *
    `;
    const values = [product_id, product_name, size, quantity, dispensed_date, hn, seller, note, id];
    const { rows } = await query(q, values);
    
    await query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update dispensing record' });
  }
});

// Delete dispensing record
app.delete('/api/dispensing-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('BEGIN');
    
    const { rows: oldRows } = await query('SELECT * FROM dispensing_history WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Record not found' });
    }
    const oldRecord = oldRows[0];

    // Revert stock
    if (oldRecord.product_id) {
      const { rows: pRows } = await query('SELECT sizes, total_stock FROM products WHERE id = $1', [oldRecord.product_id]);
      if (pRows.length > 0) {
        const prod = pRows[0];
        let sizes = prod.sizes || {};
        if (sizes[oldRecord.size]) {
          if (typeof sizes[oldRecord.size] === 'object') {
            sizes[oldRecord.size].stock = (Number(sizes[oldRecord.size].stock) || 0) + oldRecord.quantity;
          } else {
            sizes[oldRecord.size] = (Number(sizes[oldRecord.size]) || 0) + oldRecord.quantity;
          }
          let totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
          await query('UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3', [JSON.stringify(sizes), totalStock, oldRecord.product_id]);
        }
      }
    }

    await query('DELETE FROM dispensing_history WHERE id = $1', [id]);
    
    await query('COMMIT');
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    await query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete dispensing record' });
  }
});

// Get all category codes
app.get('/api/category-codes', async (req, res) => {
  try {
    const { rows } = await query('SELECT code, name FROM category_codes ORDER BY code');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category codes' });
  }
});

// Add new category code
app.post('/api/category-codes', async (req, res) => {
  try {
    const { code, name } = req.body;
    const existing = await query('SELECT * FROM category_codes WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `รหัสหมวดหมู่ ${code} มีอยู่ในระบบแล้ว` });
    }
    const { rows } = await query(
      'INSERT INTO category_codes(code, name) VALUES($1, $2) RETURNING *',
      [code, name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category code' });
  }
});

// Update category code
app.put('/api/category-codes/:code', async (req, res) => {
  try {
    const oldCode = req.params.code;
    const { code: newCode, name } = req.body;
    const formattedNewCode = String(newCode || oldCode).trim().padStart(2, '0');

    if (formattedNewCode !== oldCode) {
      const existing = await query('SELECT * FROM category_codes WHERE code = $1', [formattedNewCode]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `รหัสหมวดหมู่ ${formattedNewCode} มีอยู่ในระบบแล้ว` });
      }
    }

    const oldCat = await query('SELECT * FROM category_codes WHERE code = $1', [oldCode]);
    const oldName = oldCat.rows[0]?.name;

    await query('BEGIN');
    if (formattedNewCode !== oldCode) {
      await query('UPDATE category_codes SET code = $1, name = $2 WHERE code = $3', [formattedNewCode, name, oldCode]);
    } else {
      await query('UPDATE category_codes SET name = $1 WHERE code = $2', [name, oldCode]);
    }

    if (oldName && oldName !== name) {
      await query('UPDATE products SET category = $1 WHERE category = $2', [name, oldName]);
    }

    await query('COMMIT');
    res.json({ success: true, code: formattedNewCode, name });
  } catch (err) {
    await query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update category code' });
  }
});

// Delete category code
app.delete('/api/category-codes/:code', async (req, res) => {
  try {
    await query('DELETE FROM category_codes WHERE code = $1', [req.params.code]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category code' });
  }
});

// Get all size codes
app.get('/api/size-codes', async (req, res) => {
  try {
    const { rows } = await query('SELECT code, name FROM size_codes ORDER BY code');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch size codes' });
  }
});

// Add new size code
app.post('/api/size-codes', async (req, res) => {
  try {
    const { code, name } = req.body;
    const existing = await query('SELECT * FROM size_codes WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `รหัสไซส์ ${code} มีอยู่ในระบบแล้ว` });
    }
    const { rows } = await query(
      'INSERT INTO size_codes(code, name) VALUES($1, $2) RETURNING *',
      [code, name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create size code' });
  }
});

// Update size code
app.put('/api/size-codes/:code', async (req, res) => {
  try {
    const oldCode = req.params.code;
    const { code: newCode, name } = req.body;
    const formattedNewCode = String(newCode || oldCode).trim().padStart(2, '0');

    if (formattedNewCode !== oldCode) {
      const existing = await query('SELECT * FROM size_codes WHERE code = $1', [formattedNewCode]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `รหัสไซส์ ${formattedNewCode} มีอยู่ในระบบแล้ว` });
      }
      await query('UPDATE size_codes SET code = $1, name = $2 WHERE code = $3', [formattedNewCode, name, oldCode]);
    } else {
      await query('UPDATE size_codes SET name = $1 WHERE code = $2', [name, oldCode]);
    }

    res.json({ success: true, code: formattedNewCode, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update size code' });
  }
});

// Delete size code
app.delete('/api/size-codes/:code', async (req, res) => {
  try {
    await query('DELETE FROM size_codes WHERE code = $1', [req.params.code]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete size code' });
  }
});

// Get next barcode counter and increment atomically
app.post('/api/barcode-counter/next', async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE barcode_counter SET last_value = last_value + 1 WHERE id = 1 RETURNING last_value'
    );
    res.json({ value: rows[0].last_value });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get next counter' });
  }
});

// Get next product_code (auto-assign globally across all categories)
app.get('/api/next-product-code/:category', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT MAX(CAST(product_code AS INTEGER)) as max_code 
       FROM products WHERE product_code IS NOT NULL`
    );
    const nextCode = String((rows[0].max_code || 0) + 1).padStart(3, '0');
    res.json({ product_code: nextCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get next product code' });
  }
});



// Create tables on startup
const initDb = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql')).toString();
    await query(sql);
    
    // Migration: add type column if not exists
    try {
      await query(`ALTER TABLE dispensing_history ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'OUT'`);
    } catch (migErr) {
      console.warn('Migration warning:', migErr.message);
    }

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  await initDb();
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (e) => console.error('Server error:', e));
server.on('close', () => console.log('Server closed!'));

// Keep process alive just in case
setInterval(() => {}, 1000 * 60 * 60);
