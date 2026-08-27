import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Search, Filter, Printer } from 'lucide-react';
import { BarcodeGenerator } from '../Barcode/BarcodeGenerator';

export function PrintMasterSheetModal({ isOpen, onClose, products }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const existingCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
                          (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = category === 'all' || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [products, search, category]);

  // Group by category for rendering
  const groupedProducts = useMemo(() => {
    const groups = {};
    filteredProducts.forEach(p => {
      const cat = p.category || 'ไม่มีหมวดหมู่';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const inputStyle = {
    padding: '8px 12px 8px 36px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    width: '100%'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="แผ่นรวมบาร์โค้ด (Master Barcode Sheet)">
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          เลือกตัวกรองเพื่อพิมพ์แผ่นรวมบาร์โค้ดเฉพาะหมวดหมู่ที่ต้องการ หรือกด <strong>พิมพ์ทั้งหมด</strong> เพื่อพิมพ์สินค้าในคลังทั้งหมด
        </p>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า, บาร์โค้ด..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ position: 'relative', width: '200px' }}>
            <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">ทุกหมวดหมู่ (พิมพ์ทั้งหมด)</option>
              {existingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <button
            onClick={() => { setSearch(''); setCategory('all'); }}
            style={{ padding: '8px 16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
          >
            ล้างตัวกรอง
          </button>
        </div>

        <div style={{ padding: '16px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--warning)' }}>
          <strong>ข้อแนะนำ:</strong> หลังจากพิมพ์ลงกระดาษ A4 แล้ว แนะนำให้นำไปเคลือบพลาสติกใส (Laminate) เพื่อป้องกันกระดาษขาดหรือบาร์โค้ดจางลง ซึ่งจะช่วยให้เครื่องสแกนอ่านได้แม่นยำและใช้งานได้ยาวนานขึ้นครับ
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handlePrint}
            disabled={filteredProducts.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', backgroundColor: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, color: '#fff', cursor: filteredProducts.length === 0 ? 'not-allowed' : 'pointer', opacity: filteredProducts.length === 0 ? 0.5 : 1 }}
          >
            <Printer size={18} /> สั่งพิมพ์แผ่นบาร์โค้ด
          </button>
        </div>
      </div>
      </Modal>

      {isOpen && (
        <div id="print-master-area" style={{ display: 'none' }}>
        {Object.entries(groupedProducts).map(([cat, prods]) => (
          <table key={cat} style={{ width: '100%', marginBottom: '40px', pageBreakInside: 'auto' }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr>
                <th style={{ paddingBottom: '20px', textAlign: 'left' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '10px', margin: 0 }}>
                    หมวดหมู่: {cat}
                  </h1>
                </th>
              </tr>
            </thead>
            <tbody style={{ display: 'table-row-group' }}>
              <tr>
                <td>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
              {prods.map(product => {
                const sizes = product.sizes || {};
                const sizeKeys = Object.keys(sizes);
                if (sizeKeys.length === 0) return null;
                
                return sizeKeys.map(size => {
                  const barcode = typeof sizes[size] === 'object' ? sizes[size].barcode : '';
                  if (!barcode) return null;

                  return (
                    <div key={`${product.id}-${size}`} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: '1px dashed #666', padding: '16px 20px',
                      borderRadius: '8px', breakInside: 'avoid', marginBottom: '10px',
                      width: '100%', boxSizing: 'border-box', backgroundColor: '#fff'
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center', marginBottom: '6px', wordBreak: 'break-word', lineHeight: '1.3' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: '3px 14px', borderRadius: '12px', marginBottom: '12px' }}>
                        ไซส์: {size}
                      </div>
                      <BarcodeGenerator value={barcode} hideWrapper={true} />
                    </div>
                  );
                });
              })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ))}
          {filteredProducts.length === 0 && (
            <h2 style={{ textAlign: 'center', marginTop: '50px' }}>ไม่มีสินค้าในหมวดหมู่ที่เลือก</h2>
          )}
        </div>
      )}
    </>
  );
}
