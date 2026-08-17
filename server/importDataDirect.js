import { pool } from './db.js';

const products = [
  { name: "Sabina", category: "เสื้อชั้นใน", sizes: {}, totalStock: 0, price: 0, barcode: null, description: null, threshold: 30 },
  { name: "Anne", category: "เสื้อชั้นใน", sizes: {}, totalStock: 0, price: 0, barcode: null, description: null, threshold: 30 },
  { name: "Avie", category: "เสื้อชั้นใน", sizes: { "M": 3 }, totalStock: 3, price: 0, barcode: null, description: null, threshold: 30 },
  { name: "Wacoal", category: "เสื้อชั้นใน", sizes: { "2XS": 6, "XS": 10, "S": 16, "M": 15, "L": 23, "XL": 8, "2XL": 4, "3XL": 4, "40": 14, "42": 17, "44": 20, "46": 11, "48": 15, "50": 22 }, totalStock: 185, price: 0, barcode: null, description: null, threshold: 30 },
  { name: "เกาะอก", category: "เสื้อชั้นใน", sizes: { "free size": 97 }, totalStock: 97, price: 0, barcode: null, description: null, threshold: 30 },
  { name: "ผ้าคลุมหน้าอก", category: "อุปกรณ์เสริม", sizes: { "free size": 48 }, totalStock: 48, price: 0, barcode: null, description: null, threshold: 30 }
];

async function run() {
  try {
    for (const p of products) {
      const q = `
        INSERT INTO products (name, category, price, barcode, description, threshold, sizes, total_stock)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      const values = [p.name, p.category, p.price, p.barcode, p.description, p.threshold, JSON.stringify(p.sizes), p.totalStock];
      await pool.query(q, values);
      console.log('Inserted', p.name);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
