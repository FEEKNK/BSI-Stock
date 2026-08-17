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

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, price, barcode, description, threshold, sizes, totalStock } = req.body;
    const q = `
      INSERT INTO products (name, category, price, barcode, description, threshold, sizes, total_stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [name, category, price || 0, barcode, description, threshold, JSON.stringify(sizes), totalStock];
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
    const { name, category, price, barcode, description, threshold, sizes, totalStock } = req.body;
    const q = `
      UPDATE products 
      SET name = $1, category = $2, price = $3, barcode = $4, description = $5, 
          threshold = $6, sizes = $7, total_stock = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    const values = [name, category, price || 0, barcode, description, threshold, JSON.stringify(sizes), totalStock, id];
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
