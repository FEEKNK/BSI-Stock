import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Info } from 'lucide-react';

export function ReferenceTable() {
  const { products } = useAppContext();
  const [categoryCodes, setCategoryCodes] = useState([]);
  const [sizeCodes, setSizeCodes] = useState([]);

  useEffect(() => {
    // Fetch category and size codes
    Promise.all([
      fetch('/api/category-codes').then(res => res.json()),
      fetch('/api/size-codes').then(res => res.json())
    ]).then(([cats, sizes]) => {
      setCategoryCodes(cats);
      setSizeCodes(sizes);
    }).catch(err => console.error("Error fetching codes:", err));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Structure explanation */}
      <div style={{ padding: '20px', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)', fontSize: '1rem' }}>
          <Info size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          โครงสร้างบาร์โค้ด 12 หลัก
        </h3>
        <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '2px' }}>
          [CC] [PPP] [SS] [NNNNN]
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>CC (หลัก 1-2)</span><span>รหัสหมวดหมู่</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>PPP (หลัก 3-5)</span><span>รหัสสินค้า (ลำดับในหมวดหมู่)</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>SS (หลัก 6-7)</span><span>รหัสไซส์</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>NNNNN (หลัก 8-12)</span><span>เลขรันนิ่ง (ป้องกันซ้ำ)</span>
        </div>
      </div>

      {/* Category codes table */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontWeight: 600 }}>📁 ตารางรหัสหมวดหมู่ (CC)</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--primary)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>รหัส</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>หมวดหมู่</th>
            </tr>
          </thead>
          <tbody>
            {categoryCodes.map((c, i) => (
              <tr key={c.code} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{c.code}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{c.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Size codes table */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontWeight: 600 }}>📏 ตารางรหัสไซส์ (SS)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
          {sizeCodes.map(s => (
            <div key={s.code} style={{
              padding: '10px 14px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem', color: 'var(--primary)' }}>{s.code}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Product codes table */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontWeight: 600 }}>🏷️ ตารางรหัสสินค้า (PPP)</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--primary)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>รหัส (PPP)</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>ชื่อสินค้า</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>หมวดหมู่</th>
            </tr>
          </thead>
          <tbody>
            {products.filter(p => p.product_code).sort((a, b) => {
              if (a.category !== b.category) return a.category.localeCompare(b.category);
              return (a.product_code || '').localeCompare(b.product_code || '');
            }).map((p, i) => (
              <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{p.product_code}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{p.name}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
