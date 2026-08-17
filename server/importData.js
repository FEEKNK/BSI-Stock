
const products = [
  {
    name: "Sabina",
    category: "เสื้อชั้นใน",
    sizes: {},
    totalStock: 0,
    price: 0, barcode: null, description: null, threshold: 30
  },
  {
    name: "Anne",
    category: "เสื้อชั้นใน",
    sizes: {},
    totalStock: 0,
    price: 0, barcode: null, description: null, threshold: 30
  },
  {
    name: "Avie",
    category: "เสื้อชั้นใน",
    sizes: { "M": 3 },
    totalStock: 3,
    price: 0, barcode: null, description: null, threshold: 30
  },
  {
    name: "Wacoal",
    category: "เสื้อชั้นใน",
    sizes: {
      "2XS": 6,
      "XS": 10,
      "S": 16,
      "M": 15,
      "L": 23,
      "XL": 8,
      "2XL": 4,
      "3XL": 4,
      "40": 14,
      "42": 17,
      "44": 20,
      "46": 11,
      "48": 15,
      "50": 22
    },
    totalStock: 185,
    price: 0, barcode: null, description: null, threshold: 30
  },
  {
    name: "เกาะอก",
    category: "เสื้อชั้นใน",
    sizes: { "free size": 97 },
    totalStock: 97,
    price: 0, barcode: null, description: null, threshold: 30
  },
  {
    name: "ผ้าคลุมหน้าอก",
    category: "อุปกรณ์เสริม",
    sizes: { "free size": 48 },
    totalStock: 48,
    price: 0, barcode: null, description: null, threshold: 30
  }
];

async function importData() {
  for (const p of products) {
    try {
      const res = await fetch('http://localhost:3001/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      if (!res.ok) {
        console.error('Failed to insert', p.name, await res.text());
      } else {
        console.log('Inserted', p.name);
      }
    } catch (err) {
      console.error('Error inserting', p.name, err);
    }
  }
}

importData();
