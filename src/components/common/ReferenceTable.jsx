import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Info, Plus, X, Trash2 } from 'lucide-react';

export function ReferenceTable() {
  const { products } = useAppContext();
  const [categoryCodes, setCategoryCodes] = useState([]);
  const [sizeCodes, setSizeCodes] = useState([]);
  const [pppCurrentPage, setPppCurrentPage] = useState(1);
  const pppItemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    Promise.all([
      fetch('/api/category-codes').then(res => res.json()),
      fetch('/api/size-codes').then(res => res.json())
    ]).then(([cats, sizes]) => {
      setCategoryCodes(cats);
      setSizeCodes(sizes);
    }).catch(err => console.error("Error fetching codes:", err));
  };

  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newSizeCode, setNewSizeCode] = useState('');
  const [newSizeName, setNewSizeName] = useState('');

  const handleAddCategoryCode = async (e) => {
    e.preventDefault();
    if (!newCatCode || !newCatName) return;
    await fetch('/api/category-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCatCode.padStart(2, '0'), name: newCatName })
    });
    setNewCatCode('');
    setNewCatName('');
    fetchData();
  };

  const handleDeleteCategoryCode = async (code) => {
    if (!window.confirm(`แน่ใจหรือไม่ที่จะลบรหัสหมวดหมู่ ${code}?`)) return;
    await fetch(`/api/category-codes/${code}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddSizeCode = async (e) => {
    e.preventDefault();
    if (!newSizeCode || !newSizeName) return;
    await fetch('/api/size-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newSizeCode.padStart(2, '0'), name: newSizeName })
    });
    setNewSizeCode('');
    setNewSizeName('');
    fetchData();
  };

  const handleDeleteSizeCode = async (code) => {
    if (!window.confirm(`แน่ใจหรือไม่ที่จะลบรหัสไซส์ ${code}?`)) return;
    await fetch(`/api/size-codes/${code}`, { method: 'DELETE' });
    fetchData();
  };

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
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>PPP (หลัก 3-5)</span><span>รหัสสินค้า (หรือ รหัสรุ่น/แบรนด์)</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>SS (หลัก 6-7)</span><span>รหัสไซส์</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>NNNNN (หลัก 8-12)</span><span>เลขรันนิ่ง (ป้องกันซ้ำ)</span>
        </div>
      </div>

      {/* Category codes table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>📁 ตารางรหัสหมวดหมู่ (CC)</h4>
        </div>
        <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleAddCategoryCode} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="text" value={newCatCode} onChange={e => setNewCatCode(e.target.value)} placeholder="รหัส (เช่น 10)" maxLength={2} style={{ width: '100px', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="ชื่อหมวดหมู่ (เช่น เสื้อยืด)" style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
            <button type="submit" style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={16} /> เพิ่ม</button>
          </form>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '2px solid var(--primary)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>รหัส</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>หมวดหมู่</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {categoryCodes.map((c, i) => (
                <tr key={c.code} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{c.code}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{c.name}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteCategoryCode(c.code)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} title="ลบรหัสนี้"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Size codes table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>📏 ตารางรหัสไซส์ (SS)</h4>
        </div>
        <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleAddSizeCode} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="text" value={newSizeCode} onChange={e => setNewSizeCode(e.target.value)} placeholder="รหัส (เช่น 01)" maxLength={2} style={{ width: '100px', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
            <input type="text" value={newSizeName} onChange={e => setNewSizeName(e.target.value)} placeholder="ชื่อไซส์ (เช่น XS)" style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
            <button type="submit" style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={16} /> เพิ่ม</button>
          </form>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {sizeCodes.map(s => (
              <div key={s.code} style={{
                padding: '8px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem', color: 'var(--primary)', marginRight: '8px' }}>{s.code}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{s.name}</span>
                </div>
                <button onClick={() => handleDeleteSizeCode(s.code)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title="ลบรหัสนี้"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product codes table */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontWeight: 600 }}>🏷️ ตารางรหัสสินค้า (PPP)</h4>
        <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--primary)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>รหัส (PPP)</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>ชื่อสินค้า</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>หมวดหมู่</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredProducts = products.filter(p => p.product_code).sort((a, b) => {
                  if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '');
                  return (a.product_code || '').localeCompare(b.product_code || '');
                });
                const totalPages = Math.ceil(filteredProducts.length / pppItemsPerPage);
                const paginatedProducts = filteredProducts.slice((pppCurrentPage - 1) * pppItemsPerPage, pppCurrentPage * pppItemsPerPage);

                return (
                  <>
                    {paginatedProducts.map((p, i) => (
                      <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{p.product_code}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{p.name}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.category}</td>
                      </tr>
                    ))}
                    {totalPages > 1 && (
                      <tr style={{ backgroundColor: 'var(--bg-main)' }}>
                        <td colSpan={3} style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              แสดง {((pppCurrentPage - 1) * pppItemsPerPage) + 1} ถึง {Math.min(pppCurrentPage * pppItemsPerPage, filteredProducts.length)} จากทั้งหมด {filteredProducts.length} รายการ
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setPppCurrentPage(p => Math.max(1, p - 1))}
                                disabled={pppCurrentPage === 1}
                                style={{
                                  padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                                  backgroundColor: pppCurrentPage === 1 ? 'var(--bg-surface)' : 'var(--bg-main)',
                                  color: pppCurrentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                  cursor: pppCurrentPage === 1 ? 'not-allowed' : 'pointer'
                                }}
                              >
                                ก่อนหน้า
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                  const page = idx + 1;
                                  if (page === 1 || page === totalPages || (page >= pppCurrentPage - 1 && page <= pppCurrentPage + 1)) {
                                    return (
                                      <button
                                        key={page} onClick={() => setPppCurrentPage(page)}
                                        style={{
                                          padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid',
                                          borderColor: pppCurrentPage === page ? 'var(--primary)' : 'var(--border)',
                                          backgroundColor: pppCurrentPage === page ? 'var(--primary)' : 'var(--bg-main)',
                                          color: pppCurrentPage === page ? '#fff' : 'var(--text-primary)', cursor: 'pointer'
                                        }}
                                      >
                                        {page}
                                      </button>
                                    );
                                  } else if (page === pppCurrentPage - 2 || page === pppCurrentPage + 2) {
                                    return <span key={page} style={{ padding: '0 4px', color: 'var(--text-secondary)' }}>...</span>;
                                  }
                                  return null;
                                })}
                              </div>
                              <button
                                onClick={() => setPppCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={pppCurrentPage === totalPages}
                                style={{
                                  padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                                  backgroundColor: pppCurrentPage === totalPages ? 'var(--bg-surface)' : 'var(--bg-main)',
                                  color: pppCurrentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                  cursor: pppCurrentPage === totalPages ? 'not-allowed' : 'pointer'
                                }}
                              >
                                ถัดไป
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
