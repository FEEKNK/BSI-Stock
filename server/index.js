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
    const { rows } = await query(
      'INSERT INTO category_codes(code, name) VALUES($1, $2) ON CONFLICT (code) DO UPDATE SET name=$2 RETURNING *',
      [code, name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category code' });
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
    const { rows } = await query(
      'INSERT INTO size_codes(code, name) VALUES($1, $2) ON CONFLICT (code) DO UPDATE SET name=$2 RETURNING *',
      [code, name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create size code' });
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

// Get next product_code for a category (auto-assign)
app.get('/api/next-product-code/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { rows } = await query(
      `SELECT MAX(CAST(product_code AS INTEGER)) as max_code 
       FROM products WHERE category = $1 AND product_code IS NOT NULL`,
      [category]
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
