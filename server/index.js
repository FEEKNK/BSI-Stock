import express from 'express';
import cors from 'cors';
import { query, pool } from './db.js';
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
  const client = await pool.connect();
  try {
    const { name, category, price, barcode, description, threshold, sizes, totalStock, product_code, seller } = req.body;
    
    await client.query('BEGIN');

    // Auto assign product_code if missing
    let finalProductCode = product_code;
    if (!finalProductCode) {
      const { rows: maxRows } = await client.query(
        `SELECT MAX(CAST(product_code AS INTEGER)) as max_code FROM products WHERE product_code IS NOT NULL`
      );
      finalProductCode = String((maxRows[0].max_code || 0) + 1).padStart(3, '0');
    }

    // Process sizes and ensure barcodes are valid
    let processedSizes = sizes || {};
    let calculatedTotal = 0;
    if (typeof processedSizes === 'object') {
      const catCode = (category === 'เสื้อชั้นใน' ? '10' : (category === 'ชุดชั้นใน' ? '11' : (category === 'กางเกงใน' ? '20' : (category === 'อุปกรณ์เสริม' ? '30' : '90'))));
      
      for (const [sizeName, sizeData] of Object.entries(processedSizes)) {
        const stock = typeof sizeData === 'object' ? (Number(sizeData.stock) || 0) : (Number(sizeData) || 0);
        calculatedTotal += stock;
        
        let b = typeof sizeData === 'object' ? sizeData.barcode : '';
        if (!b || String(b).includes('000') || String(b).length < 12) {
          const cRes = await client.query(`UPDATE barcode_counter SET last_value = last_value + 1 WHERE id = 1 RETURNING last_value`);
          const counterVal = cRes.rows[0].last_value;
          const sizeCode = (sizeName === '-' ? '00' : (sizeName.toLowerCase().includes('free') ? '01' : (sizeName === '2XS' ? '02' : (sizeName === 'XS' ? '03' : (sizeName === 'S' ? '04' : (sizeName === 'M' ? '05' : (sizeName === 'L' ? '06' : (sizeName === 'XL' ? '07' : (sizeName === '2XL' ? '08' : (sizeName === '3XL' ? '09' : (sizeName === '4XL' ? '10' : sizeName)))))))))));
          const ss = String(sizeCode).padStart(2, '0');
          const nnnnn = String(counterVal).padStart(5, '0');
          b = `${catCode}${finalProductCode}${ss}${nnnnn}`;
        }
        processedSizes[sizeName] = { stock, barcode: b };
      }
    }

    const q = `
      INSERT INTO products (name, category, price, barcode, description, threshold, sizes, total_stock, product_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [name, category, price || 0, barcode, description, threshold, JSON.stringify(processedSizes), calculatedTotal, finalProductCode];
    const { rows } = await client.query(q, values);
    const newProduct = rows[0];

    // Log to dispensing_history
    const sizeEntries = Object.entries(processedSizes);
    const hasInitialStock = sizeEntries.some(([_, s]) => (Number(s?.stock) || 0) > 0);
    
    if (hasInitialStock) {
      for (const [size, sizeData] of sizeEntries) {
        const initialStock = Number(sizeData?.stock) || 0;
        if (initialStock > 0) {
          const historyQ = `
            INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8)
          `;
          await client.query(historyQ, [
            newProduct.id,
            name,
            size,
            initialStock,
            '-',
            seller || 'System',
            'เพิ่มสินค้าใหม่ (สต็อกเริ่มต้น)',
            'IN'
          ]);
        }
      }
    } else {
      // Log registration entry even with 0 stock so employee is recorded
      const historyQ = `
        INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8)
      `;
      await client.query(historyQ, [
        newProduct.id,
        name,
        sizeEntries.length > 0 ? sizeEntries[0][0] : '-',
        0,
        '-',
        seller || 'System',
        'เพิ่มสินค้าใหม่เข้าระบบ',
        'IN'
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json(newProduct);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error in POST /api/products:', err);
    res.status(500).json({ error: 'Failed to create product: ' + err.message });
  } finally {
    client.release();
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, category, price, barcode, description, threshold, sizes, totalStock, product_code, seller } = req.body;
    
    await client.query('BEGIN');
    
    // Get old sizes to detect stock adjustments
    const { rows: oldRows } = await client.query('SELECT sizes FROM products WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const oldSizes = oldRows[0].sizes || {};
    
    // Check for stock changes and log history
    if (sizes && typeof sizes === 'object') {
      for (const [size, sizeData] of Object.entries(sizes)) {
        const newStock = typeof sizeData === 'object' ? (Number(sizeData.stock) || 0) : (Number(sizeData) || 0);
        const oldSizeData = oldSizes[size];
        const oldStock = oldSizeData !== undefined 
          ? (typeof oldSizeData === 'object' ? (Number(oldSizeData.stock) || 0) : (Number(oldSizeData) || 0))
          : 0;
          
        const diff = newStock - oldStock;
        
        if (diff !== 0) {
          const type = diff > 0 ? 'IN' : 'OUT';
          const qty = Math.abs(diff);
          const historyQ = `
            INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8)
          `;
          await client.query(historyQ, [
            id, 
            name, 
            size, 
            qty, 
            '-', 
            seller || 'System', 
            'ปรับสต็อก (แก้ไขสินค้า)', 
            type
          ]);
        }
      }
    }
    
    const q = `
      UPDATE products 
      SET name = $1, category = $2, price = $3, barcode = $4, description = $5, 
          threshold = $6, sizes = $7, total_stock = $8, product_code = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    const values = [name, category, price || 0, barcode, description, threshold, JSON.stringify(sizes), totalStock, product_code || null, id];
    const { rows } = await client.query(q, values);
    
    // Update product name in history to keep them in sync
    await client.query('UPDATE dispensing_history SET product_name = $1 WHERE product_id = $2', [name, id]);
    
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { sizes, totalStock } = req.body;
    
    await client.query('BEGIN');
    
    // Get old sizes to detect stock adjustments
    const { rows: oldRows } = await client.query('SELECT name, sizes FROM products WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const prodName = oldRows[0].name;
    const oldSizes = oldRows[0].sizes || {};
    
    // Check for stock changes and log history
    if (sizes && typeof sizes === 'object') {
      for (const [size, sizeData] of Object.entries(sizes)) {
        const newStock = typeof sizeData === 'object' ? (Number(sizeData.stock) || 0) : (Number(sizeData) || 0);
        const oldSizeData = oldSizes[size];
        const oldStock = oldSizeData !== undefined 
          ? (typeof oldSizeData === 'object' ? (Number(oldSizeData.stock) || 0) : (Number(oldSizeData) || 0))
          : 0;
          
        const diff = newStock - oldStock;
        
        if (diff !== 0) {
          const type = diff > 0 ? 'IN' : 'OUT';
          const qty = Math.abs(diff);
          const historyQ = `
            INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8)
          `;
          await client.query(historyQ, [
            id, 
            prodName, 
            size, 
            qty, 
            '-', 
            'System', 
            'ปรับสต็อก (แก้ไขด่วน)', 
            type
          ]);
        }
      }
    }
    
    const q = `
      UPDATE products 
      SET sizes = $1, total_stock = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await client.query(q, [JSON.stringify(sizes), totalStock, id]);
    
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock' });
  } finally {
    client.release();
  }
});

// Bulk Import / Upsert Products from Excel
app.post('/api/products/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { items, mode = 'upsert' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลสินค้าสำหรับนำเข้า' });
    }

    await client.query('BEGIN');
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      const name = String(item.name || '').trim();
      const code = item.product_code ? String(item.product_code).trim() : null;
      const category = item.category ? String(item.category).trim() : 'อื่นๆ';
      const threshold = item.threshold !== undefined && item.threshold !== null && item.threshold !== '' ? Number(item.threshold) : 30;
      const price = Number(item.price) || 0;
      const barcode = item.barcode ? String(item.barcode).trim() : null;
      const description = item.description || '';
      const sizes = item.sizes || {};
      const totalStock = item.totalStock !== undefined ? Number(item.totalStock) : 
        Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s?.stock : s) || 0), 0);

      if (!name) continue;

      // Check if product already exists by product_code or name
      let findRes;
      if (code) {
        findRes = await client.query('SELECT * FROM products WHERE product_code = $1 OR name = $2 LIMIT 1', [code, name]);
      } else {
        findRes = await client.query('SELECT * FROM products WHERE name = $1 LIMIT 1', [name]);
      }

      if (findRes.rows.length > 0) {
        const existing = findRes.rows[0];
        const existingSizes = existing.sizes || {};
        let mergedSizes = {};

        if (mode === 'add_stock') {
          // Add to existing stock
          mergedSizes = { ...existingSizes };
          for (const [sizeKey, sizeVal] of Object.entries(sizes)) {
            const addQty = typeof sizeVal === 'object' ? Number(sizeVal.stock || 0) : Number(sizeVal || 0);
            const curData = existingSizes[sizeKey];
            const curQty = curData ? (typeof curData === 'object' ? Number(curData.stock || 0) : Number(curData || 0)) : 0;
            const barcode = (typeof sizeVal === 'object' ? sizeVal.barcode : '') || (curData && typeof curData === 'object' ? curData.barcode : '');
            mergedSizes[sizeKey] = {
              stock: curQty + addQty,
              barcode: barcode
            };

            // Log history if added quantity > 0
            if (addQty > 0) {
              await client.query(
                `INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
                 VALUES ($1, $2, $3, $4, CURRENT_DATE, '-', $5, $6, 'IN')`,
                [existing.id, name, sizeKey, addQty, 'นำเข้าผ่าน Excel', 'รับเข้าสต็อกเพิ่มจากไฟล์ Excel']
              );
            }
          }
        } else {
          // Default: Replace / set as new balance
          mergedSizes = { ...existingSizes, ...sizes };
          for (const [sizeKey, sizeVal] of Object.entries(sizes)) {
            const newQty = typeof sizeVal === 'object' ? Number(sizeVal.stock || 0) : Number(sizeVal || 0);
            const curData = existingSizes[sizeKey];
            const curQty = curData ? (typeof curData === 'object' ? Number(curData.stock || 0) : Number(curData || 0)) : 0;
            
            if (newQty > curQty) {
              const diff = newQty - curQty;
              await client.query(
                `INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
                 VALUES ($1, $2, $3, $4, CURRENT_DATE, '-', $5, $6, 'IN')`,
                [existing.id, name, sizeKey, diff, 'นำเข้าผ่าน Excel', 'ปรับปรุงยอดสต็อกเพิ่มจากการนำเข้า Excel']
              );
            } else if (newQty < curQty) {
              const diff = curQty - newQty;
              await client.query(
                `INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
                 VALUES ($1, $2, $3, $4, CURRENT_DATE, '-', $5, $6, 'OUT')`,
                [existing.id, name, sizeKey, diff, 'นำเข้าผ่าน Excel', 'ปรับปรุงยอดสต็อกลดลงจากการตรวจนับ Excel']
              );
            }
          }
        }

        const mergedTotalStock = Object.values(mergedSizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s?.stock : s) || 0), 0);

        await client.query(
          `UPDATE products 
           SET name = $1, category = $2, price = $3, barcode = COALESCE($4, barcode), 
               description = COALESCE($5, description), threshold = $6, sizes = $7, 
               total_stock = $8, product_code = COALESCE($9, product_code), updated_at = CURRENT_TIMESTAMP
           WHERE id = $10`,
          [name, category, price, barcode, description, threshold, JSON.stringify(mergedSizes), mergedTotalStock, code, existing.id]
        );
        updatedCount++;
      } else {
        const insertRes = await client.query(
          `INSERT INTO products (name, category, price, barcode, description, threshold, sizes, total_stock, product_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [name, category, price, barcode, description, threshold, JSON.stringify(sizes), totalStock, code]
        );
        insertedCount++;

        const newId = insertRes.rows[0]?.id;
        // Log history for each initial size stock > 0
        for (const [sizeKey, sizeVal] of Object.entries(sizes)) {
          const initQty = typeof sizeVal === 'object' ? Number(sizeVal.stock || 0) : Number(sizeVal || 0);
          if (initQty > 0) {
            await client.query(
              `INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
               VALUES ($1, $2, $3, $4, CURRENT_DATE, '-', $5, $6, 'IN')`,
              [newId, name, sizeKey, initQty, 'นำเข้าผ่าน Excel', 'บันทึกสต็อกตั้งต้นจากการนำเข้า Excel']
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `นำเข้าสินค้าเรียบร้อย (เพิ่มใหม่ ${insertedCount} รายการ, อัปเดต ${updatedCount} รายการ)`,
      insertedCount,
      updatedCount,
      totalProcessed: insertedCount + updatedCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk product import error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการนำเข้าสินค้า: ' + err.message });
  } finally {
    client.release();
  }
});

// Get stock movement & top dispensed products for dashboard
app.get('/api/dashboard/movement', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    
    // 1. Daily Movement: IN vs OUT in last N days
    const dailyQuery = `
      SELECT 
        TO_CHAR(dispensed_date, 'YYYY-MM-DD') as date_str,
        SUM(CASE WHEN type = 'OUT' OR type IS NULL THEN quantity ELSE 0 END) as total_out,
        SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as total_in,
        COUNT(*) as total_transactions
      FROM dispensing_history
      WHERE DATE(dispensed_date) >= CURRENT_DATE - ($1 || ' days')::INTERVAL
      GROUP BY TO_CHAR(dispensed_date, 'YYYY-MM-DD')
      ORDER BY date_str ASC
    `;
    const dailyRes = await query(dailyQuery, [days]);

    // 2. Top Dispensed Products (type = 'OUT') in last N days
    const topQuery = `
      SELECT 
        product_name,
        SUM(quantity) as total_quantity,
        COUNT(*) as times_dispensed
      FROM dispensing_history
      WHERE (type = 'OUT' OR type IS NULL)
        AND DATE(dispensed_date) >= CURRENT_DATE - ($1 || ' days')::INTERVAL
      GROUP BY product_name
      ORDER BY total_quantity DESC
      LIMIT 5
    `;
    const topRes = await query(topQuery, [days]);

    res.json({
      dailyMovement: dailyRes.rows,
      topProducts: topRes.rows
    });
  } catch (err) {
    console.error('Error fetching dashboard movement:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard movement' });
  }
});

// --- Database Backup & Restore ---

// Full Database Backup Endpoint
app.get('/api/backup', async (req, res) => {
  try {
    const productsRes = await query('SELECT * FROM products ORDER BY created_at ASC');
    const historyRes = await query('SELECT * FROM dispensing_history ORDER BY dispensed_date ASC, created_at ASC');
    const categoryCodesRes = await query('SELECT * FROM category_codes ORDER BY code ASC');
    const sizeCodesRes = await query('SELECT * FROM size_codes ORDER BY code ASC');

    const backupData = {
      metadata: {
        system: 'BSI-Stock',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        counts: {
          products: productsRes.rows.length,
          dispensing_history: historyRes.rows.length,
          category_codes: categoryCodesRes.rows.length,
          size_codes: sizeCodesRes.rows.length
        }
      },
      products: productsRes.rows,
      dispensing_history: historyRes.rows,
      category_codes: categoryCodesRes.rows,
      size_codes: sizeCodesRes.rows
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bsi_stock_backup_${dateStr}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('Database backup error:', err);
    res.status(500).json({ error: 'Failed to create database backup: ' + err.message });
  }
});

// Full Database Restore Endpoint
app.post('/api/restore', async (req, res) => {
  const client = await pool.connect();
  try {
    const { metadata, products, dispensing_history, category_codes, size_codes, settings } = req.body;

    if (!Array.isArray(products) || !Array.isArray(dispensing_history)) {
      return res.status(400).json({ error: 'รูปแบบไฟล์สำรองไม่ถูกต้อง (ไม่พบโครงสร้างข้อมูล products หรือ dispensing_history)' });
    }

    await client.query('BEGIN');

    // 1. Clear existing data
    await client.query('DELETE FROM dispensing_history');
    await client.query('DELETE FROM products');
    if (Array.isArray(category_codes) && category_codes.length > 0) {
      await client.query('DELETE FROM category_codes');
    }
    if (Array.isArray(size_codes) && size_codes.length > 0) {
      await client.query('DELETE FROM size_codes');
    }

    // 2. Restore category_codes
    if (Array.isArray(category_codes)) {
      for (const cat of category_codes) {
        if (cat.code && cat.name) {
          await client.query(
            'INSERT INTO category_codes (code, name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = $2',
            [String(cat.code).padStart(2, '0'), cat.name]
          );
        }
      }
    }

    // 3. Restore size_codes
    if (Array.isArray(size_codes)) {
      for (const sz of size_codes) {
        if (sz.code && sz.name) {
          await client.query(
            'INSERT INTO size_codes (code, name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = $2',
            [String(sz.code).padStart(2, '0'), sz.name]
          );
        }
      }
    }

    // 4. Restore products
    for (const p of products) {
      await client.query(
        `INSERT INTO products (id, name, category, price, barcode, description, threshold, sizes, total_stock, product_code, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP), COALESCE($12, CURRENT_TIMESTAMP))
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           price = EXCLUDED.price,
           barcode = EXCLUDED.barcode,
           description = EXCLUDED.description,
           threshold = EXCLUDED.threshold,
           sizes = EXCLUDED.sizes,
           total_stock = EXCLUDED.total_stock,
           product_code = EXCLUDED.product_code,
           updated_at = EXCLUDED.updated_at`,
        [
          p.id,
          p.name,
          p.category || 'อื่นๆ',
          p.price || 0,
          p.barcode || null,
          p.description || '',
          p.threshold || 30,
          typeof p.sizes === 'string' ? p.sizes : JSON.stringify(p.sizes || {}),
          p.total_stock || 0,
          p.product_code || null,
          p.created_at || null,
          p.updated_at || null
        ]
      );
    }

    // 5. Restore dispensing_history
    for (const h of dispensing_history) {
      await client.query(
        `INSERT INTO dispensing_history (id, product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP))
         ON CONFLICT (id) DO NOTHING`,
        [
          h.id,
          h.product_id || null,
          h.product_name,
          h.size,
          h.quantity,
          h.dispensed_date,
          h.hn || '',
          h.seller || '',
          h.note || '',
          h.type || 'OUT',
          h.created_at || null
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'กู้คืนฐานข้อมูลสำเร็จเรียบร้อย',
      restored: {
        products: products.length,
        dispensing_history: dispensing_history.length,
        category_codes: category_codes?.length || 0,
        size_codes: size_codes?.length || 0
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database restore error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการกู้คืนฐานข้อมูล: ' + err.message });
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const { product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type } = req.body;
    const dispenseQty = Number(quantity);

    if (!dispenseQty || dispenseQty < 1) {
      return res.status(400).json({ error: 'กรุณาระบุจำนวนที่ถูกต้อง (ต้องมากกว่า 0)' });
    }

    await client.query('BEGIN');

    const isOut = !type || type === 'OUT';

    // 1. Stock validation & deduction
    if (product_id && isOut) {
      const { rows: prodRows } = await client.query('SELECT id, name, sizes, total_stock FROM products WHERE id = $1 FOR UPDATE', [product_id]);
      if (prodRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'ไม่พบข้อมูลสินค้า' });
      }

      const prod = prodRows[0];
      let sizes = prod.sizes || {};
      const sizeData = sizes[size];
      const availableStock = sizeData !== undefined ? (typeof sizeData === 'object' ? Number(sizeData.stock) || 0 : Number(sizeData) || 0) : 0;

      if (availableStock < dispenseQty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `สต็อกคงเหลือไม่เพียงพอ สำหรับสินค้า "${prod.name}" ไซส์ ${size} (คงเหลือ: ${availableStock} ชิ้น, ต้องการเบิก: ${dispenseQty} ชิ้น)` 
        });
      }

      if (typeof sizes[size] === 'object') {
        sizes[size].stock = Math.max(0, availableStock - dispenseQty);
      } else {
        sizes[size] = Math.max(0, availableStock - dispenseQty);
      }

      const totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
      await client.query('UPDATE products SET sizes = $1, total_stock = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [JSON.stringify(sizes), totalStock, product_id]);
    } else if (product_id && type === 'IN') {
      const { rows: prodRows } = await client.query('SELECT id, name, sizes, total_stock FROM products WHERE id = $1 FOR UPDATE', [product_id]);
      if (prodRows.length > 0) {
        const prod = prodRows[0];
        let sizes = prod.sizes || {};
        const sizeData = sizes[size];
        const oldStock = sizeData !== undefined ? (typeof sizeData === 'object' ? Number(sizeData.stock) || 0 : Number(sizeData) || 0) : 0;
        
        if (typeof sizes[size] === 'object') {
          sizes[size].stock = oldStock + dispenseQty;
        } else {
          sizes[size] = oldStock + dispenseQty;
        }
        const totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
        await client.query('UPDATE products SET sizes = $1, total_stock = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [JSON.stringify(sizes), totalStock, product_id]);
      }
    }

    // 2. Insert record
    const q = `
      INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [product_id, product_name, size, dispenseQty, dispensed_date, hn, seller, note, type || 'OUT'];
    const { rows } = await client.query(q, values);
    const newRecord = rows[0];

    await client.query('COMMIT');
    res.status(201).json(newRecord);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to create dispensing record: ' + err.message });
  } finally {
    client.release();
  }
});

// Bulk create dispensing records (and update stock)
app.post('/api/dispensing-history/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { mode, dispensed_date, hn, seller, note, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'ไม่มีรายการสินค้าที่ต้องการบันทึก' });
    }

    await client.query('BEGIN');

    // If OUT mode, aggregate requested quantities per product and size, and lock rows to validate stock
    if (mode === 'OUT') {
      const requestedByProduct = {};
      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `จำนวนสินค้า "${item.product_name}" ต้องมากกว่า 0` });
        }
        if (item.product_id) {
          if (!requestedByProduct[item.product_id]) {
            requestedByProduct[item.product_id] = { productName: item.product_name, sizes: {} };
          }
          requestedByProduct[item.product_id].sizes[item.size] = (requestedByProduct[item.product_id].sizes[item.size] || 0) + qty;
        }
      }

      for (const [prodId, reqData] of Object.entries(requestedByProduct)) {
        const { rows: prodRows } = await client.query('SELECT id, name, sizes, total_stock FROM products WHERE id = $1 FOR UPDATE', [prodId]);
        if (prodRows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `ไม่พบข้อมูลสินค้า "${reqData.productName}"` });
        }
        const prod = prodRows[0];
        const sizes = prod.sizes || {};
        for (const [sz, reqQty] of Object.entries(reqData.sizes)) {
          const sizeData = sizes[sz];
          const availableStock = sizeData !== undefined ? (typeof sizeData === 'object' ? Number(sizeData.stock) || 0 : Number(sizeData) || 0) : 0;
          if (availableStock < reqQty) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: `สต็อกคงเหลือไม่เพียงพอ สำหรับสินค้า "${prod.name}" ไซส์ ${sz} (คงเหลือ: ${availableStock} ชิ้น, ต้องการเบิก: ${reqQty} ชิ้น)`
            });
          }
        }
      }
    }

    const createdRecords = [];

    for (const item of items) {
      const { product_id, product_name, size, quantity } = item;
      const qty = Number(quantity) || 0;

      // 1. Insert record
      const q = `
        INSERT INTO dispensing_history (product_id, product_name, size, quantity, dispensed_date, hn, seller, note, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [product_id, product_name, size, qty, dispensed_date, hn, seller, note, mode];
      const { rows } = await client.query(q, values);
      createdRecords.push(rows[0]);

      // 2. Update stock
      if (product_id) {
        const { rows: prodRows } = await client.query('SELECT sizes, total_stock FROM products WHERE id = $1', [product_id]);
        if (prodRows.length > 0) {
          const prod = prodRows[0];
          let sizes = prod.sizes || {};
          let totalStock = prod.total_stock || 0;

          if (sizes[size] !== undefined) {
            let oldStock = 0;
            if (typeof sizes[size] === 'object') {
              oldStock = Number(sizes[size].stock) || 0;
              sizes[size].stock = mode === 'IN' ? oldStock + qty : Math.max(0, oldStock - qty);
            } else {
              oldStock = Number(sizes[size]) || 0;
              sizes[size] = mode === 'IN' ? oldStock + qty : Math.max(0, oldStock - qty);
            }
            
            totalStock = Object.values(sizes).reduce((sum, sizeData) => {
              const s = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
              return sum + (Number(s) || 0);
            }, 0);

            await client.query('UPDATE products SET sizes = $1, total_stock = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [JSON.stringify(sizes), totalStock, product_id]);
          }
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, count: createdRecords.length, records: createdRecords });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to process bulk dispensing: ' + err.message });
  } finally {
    client.release();
  }
});

// Update dispensing record
app.put('/api/dispensing-history/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { product_id, product_name, size, quantity, dispensed_date, hn, seller, note } = req.body;
    const newQty = Number(quantity);
    if (!newQty || newQty < 1) {
      return res.status(400).json({ error: 'กรุณาระบุจำนวนที่ถูกต้อง (ต้องมากกว่า 0)' });
    }

    await client.query('BEGIN');

    // Get old record to handle stock adjustment
    const { rows: oldRows } = await client.query('SELECT * FROM dispensing_history WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Record not found' });
    }
    const oldRecord = oldRows[0];
    const oldQty = Number(oldRecord.quantity) || 0;
    const isOutRecord = !oldRecord.type || oldRecord.type === 'OUT';

    // 1. Revert old stock
    if (oldRecord.product_id) {
      const { rows: pRows } = await client.query('SELECT sizes, total_stock FROM products WHERE id = $1 FOR UPDATE', [oldRecord.product_id]);
      if (pRows.length > 0) {
        const prod = pRows[0];
        let sizes = prod.sizes || {};
        if (sizes[oldRecord.size] !== undefined) {
          const qtyDiff = isOutRecord ? oldQty : -oldQty;
          if (typeof sizes[oldRecord.size] === 'object') {
            sizes[oldRecord.size].stock = (Number(sizes[oldRecord.size].stock) || 0) + qtyDiff;
          } else {
            sizes[oldRecord.size] = (Number(sizes[oldRecord.size]) || 0) + qtyDiff;
          }
          let totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
          await client.query('UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3', [JSON.stringify(sizes), totalStock, oldRecord.product_id]);
        }
      }
    }

    // 2. Validate and Apply new stock
    if (product_id) {
      const { rows: pRows } = await client.query('SELECT id, name, sizes, total_stock FROM products WHERE id = $1 FOR UPDATE', [product_id]);
      if (pRows.length > 0) {
        const prod = pRows[0];
        let sizes = prod.sizes || {};
        const sizeData = sizes[size];
        const availableStock = sizeData !== undefined ? (typeof sizeData === 'object' ? Number(sizeData.stock) || 0 : Number(sizeData) || 0) : 0;
        
        if (isOutRecord) {
          if (availableStock < newQty) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: `สต็อกคงเหลือไม่เพียงพอ สำหรับสินค้า "${prod.name}" ไซส์ ${size} (คงเหลือ: ${availableStock} ชิ้น, ต้องการเบิก: ${newQty} ชิ้น)`
            });
          }
          if (typeof sizes[size] === 'object') {
            sizes[size].stock = availableStock - newQty;
          } else {
            sizes[size] = availableStock - newQty;
          }
        } else {
          // IN record, add stock
          if (typeof sizes[size] === 'object') {
            sizes[size].stock = availableStock + newQty;
          } else {
            sizes[size] = availableStock + newQty;
          }
        }
        
        let totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
        await client.query('UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3', [JSON.stringify(sizes), totalStock, product_id]);
      }
    }

    const q = `
      UPDATE dispensing_history 
      SET product_id = $1, product_name = $2, size = $3, quantity = $4, dispensed_date = $5, hn = $6, seller = $7, note = $8
      WHERE id = $9
      RETURNING *
    `;
    const values = [product_id, product_name, size, newQty, dispensed_date, hn, seller, note, id];
    const { rows } = await client.query(q, values);
    
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to update dispensing record: ' + err.message });
  } finally {
    client.release();
  }
});

// Delete dispensing record
app.delete('/api/dispensing-history/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    const { rows: oldRows } = await client.query('SELECT * FROM dispensing_history WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Record not found' });
    }
    const oldRecord = oldRows[0];

    // Revert stock
    if (oldRecord.product_id) {
      const { rows: pRows } = await client.query('SELECT sizes, total_stock FROM products WHERE id = $1', [oldRecord.product_id]);
      if (pRows.length > 0) {
        const prod = pRows[0];
        let sizes = prod.sizes || {};
        if (sizes[oldRecord.size] !== undefined) {
          const isOutRecord = !oldRecord.type || oldRecord.type === 'OUT';
          const qtyDiff = isOutRecord ? oldRecord.quantity : -oldRecord.quantity;

          if (typeof sizes[oldRecord.size] === 'object') {
            sizes[oldRecord.size].stock = (Number(sizes[oldRecord.size].stock) || 0) + qtyDiff;
          } else {
            sizes[oldRecord.size] = (Number(sizes[oldRecord.size]) || 0) + qtyDiff;
          }
          let totalStock = Object.values(sizes).reduce((sum, s) => sum + (Number(typeof s === 'object' ? s.stock : s) || 0), 0);
          await client.query('UPDATE products SET sizes = $1, total_stock = $2 WHERE id = $3', [JSON.stringify(sizes), totalStock, oldRecord.product_id]);
        }
      }
    }

    await client.query('DELETE FROM dispensing_history WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to delete dispensing record' });
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const oldCode = req.params.code;
    const { code: newCode, name } = req.body;
    const formattedNewCode = String(newCode || oldCode).trim().padStart(2, '0');

    if (formattedNewCode !== oldCode) {
      const existing = await client.query('SELECT * FROM category_codes WHERE code = $1', [formattedNewCode]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `รหัสหมวดหมู่ ${formattedNewCode} มีอยู่ในระบบแล้ว` });
      }
    }

    const oldCat = await client.query('SELECT * FROM category_codes WHERE code = $1', [oldCode]);
    const oldName = oldCat.rows[0]?.name;

    await client.query('BEGIN');
    if (formattedNewCode !== oldCode) {
      await client.query('UPDATE category_codes SET code = $1, name = $2 WHERE code = $3', [formattedNewCode, name, oldCode]);
    } else {
      await client.query('UPDATE category_codes SET name = $1 WHERE code = $2', [name, oldCode]);
    }

    if (oldName && oldName !== name) {
      await client.query('UPDATE products SET category = $1 WHERE category = $2', [name, oldName]);
    }

    await client.query('COMMIT');
    res.json({ success: true, code: formattedNewCode, name });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to update category code' });
  } finally {
    client.release();
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

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await query('SELECT global_threshold, notifications_enabled FROM settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({ global_threshold: 30, notifications_enabled: true });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { global_threshold, notifications_enabled } = req.body;
    const q = `
      INSERT INTO settings (id, global_threshold, notifications_enabled)
      VALUES (1, $1, $2)
      ON CONFLICT (id) DO UPDATE 
      SET global_threshold = $1, notifications_enabled = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING global_threshold, notifications_enabled
    `;
    const { rows } = await query(q, [global_threshold, notifications_enabled]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
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

if (!process.env.VERCEL) {
  const server = app.listen(PORT, async () => {
    await initDb();
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (e) => console.error('Server error:', e));
  server.on('close', () => console.log('Server closed!'));

  // Keep process alive just in case
  setInterval(() => {}, 1000 * 60 * 60);
}

export default app;

