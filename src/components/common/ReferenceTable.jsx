import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Info, Plus, X, Trash2, Edit2, Folder, Ruler, Tag, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

export function ReferenceTable() {
  const { products } = useAppContext();
  const { toast } = useToast();
  const [categoryCodes, setCategoryCodes] = useState([]);
  const [sizeCodes, setSizeCodes] = useState([]);

  // Validation / Error states for Add
  const [catError, setCatError] = useState('');
  const [sizeError, setSizeError] = useState('');

  // Edit states
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatError, setEditingCatError] = useState('');

  const [editingSize, setEditingSize] = useState(null);
  const [editingSizeError, setEditingSizeError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'cat' | 'size', code: string, name: string }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    Promise.all([
      fetch('/api/category-codes').then(res => res.ok ? res.json() : []).catch(() => []),
      fetch('/api/size-codes').then(res => res.ok ? res.json() : []).catch(() => [])
    ]).then(([cats, sizes]) => {
      setCategoryCodes(Array.isArray(cats) ? cats : []);
      setSizeCodes(Array.isArray(sizes) ? sizes : []);
    }).catch(err => console.error("Error fetching codes:", err));
  };

  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newSizeCode, setNewSizeCode] = useState('');
  const [newSizeName, setNewSizeName] = useState('');

  const handleAddCategoryCode = async (e) => {
    e.preventDefault();
    setCatError('');

    const rawCode = newCatCode.trim();
    const rawName = newCatName.trim();

    if (!rawCode || !rawName) {
      setCatError('กรุณากรอกทั้งรหัสและชื่อหมวดหมู่');
      return;
    }

    if (!/^\d{1,2}$/.test(rawCode)) {
      setCatError('รหัสหมวดหมู่ต้องเป็นตัวเลข 1-2 หลัก (เช่น 10, 20, 99)');
      return;
    }

    const formattedCode = rawCode.padStart(2, '0');

    // 1. Check duplicate code
    const existingByCode = categoryCodes.find(c => c.code === formattedCode);
    if (existingByCode) {
      setCatError(`รหัสหมวดหมู่ '${formattedCode}' ซ้ำกับ "${existingByCode.name}" ที่มีอยู่แล้ว`);
      return;
    }

    // 2. Check duplicate name
    const existingByName = categoryCodes.find(c => c.name.trim().toLowerCase() === rawName.toLowerCase());
    if (existingByName) {
      setCatError(`ชื่อหมวดหมู่ "${rawName}" ซ้ำกับรหัส ${existingByName.code} ที่มีอยู่แล้ว`);
      return;
    }

    try {
      const res = await fetch('/api/category-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formattedCode, name: rawName })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
      setNewCatCode('');
      setNewCatName('');
      setCatError('');
      toast.success(`เพิ่มหมวดหมู่ "${rawName}" สำเร็จ`);
      fetchData();
    } catch (err) {
      setCatError(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleDeleteCategoryCode = (c) => {
    setDeleteTarget({ type: 'category', code: c.code, name: c.name });
  };

  // Start Edit Category
  const handleStartEditCat = (c) => {
    setEditingCat({ code: c.code, name: c.name, originalCode: c.code });
    setEditingCatError('');
  };

  // Save Edit Category
  const handleSaveEditCat = async (e) => {
    e.preventDefault();
    setEditingCatError('');
    if (!editingCat) return;

    const rawCode = editingCat.code.trim();
    const rawName = editingCat.name.trim();

    if (!rawCode || !rawName) {
      setEditingCatError('กรุณากรอกทั้งรหัสและชื่อหมวดหมู่');
      return;
    }

    if (!/^\d{1,2}$/.test(rawCode)) {
      setEditingCatError('รหัสหมวดหมู่ต้องเป็นตัวเลข 1-2 หลัก (เช่น 10, 20)');
      return;
    }

    const formattedCode = rawCode.padStart(2, '0');

    // Duplicate check for Code (excluding currently edited item)
    if (formattedCode !== editingCat.originalCode) {
      const existingByCode = categoryCodes.find(c => c.code === formattedCode);
      if (existingByCode) {
        setEditingCatError(`รหัสหมวดหมู่ '${formattedCode}' ซ้ำกับ "${existingByCode.name}" ที่มีอยู่แล้ว`);
        return;
      }
    }

    // Duplicate check for Name (excluding currently edited item)
    const existingByName = categoryCodes.find(c => c.code !== editingCat.originalCode && c.name.trim().toLowerCase() === rawName.toLowerCase());
    if (existingByName) {
      setEditingCatError(`ชื่อหมวดหมู่ "${rawName}" ซ้ำกับรหัส ${existingByName.code} ที่มีอยู่แล้ว`);
      return;
    }

    try {
      const res = await fetch(`/api/category-codes/${editingCat.originalCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formattedCode, name: rawName })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
      setEditingCat(null);
      toast.success(`แก้ไขหมวดหมู่ "${rawName}" สำเร็จ`);
      fetchData();
    } catch (err) {
      setEditingCatError(err.message || 'บันทึกการแก้ไขไม่สำเร็จ');
    }
  };

  const handleAddSizeCode = async (e) => {
    e.preventDefault();
    setSizeError('');

    const rawCode = newSizeCode.trim();
    const rawName = newSizeName.trim();

    if (!rawCode || !rawName) {
      setSizeError('กรุณากรอกทั้งรหัสและชื่อไซส์');
      return;
    }

    if (!/^\d{1,2}$/.test(rawCode)) {
      setSizeError('รหัสไซส์ต้องเป็นตัวเลข 1-2 หลัก (เช่น 01, 02, 32)');
      return;
    }

    const formattedCode = rawCode.padStart(2, '0');

    // 1. Check duplicate code
    const existingByCode = sizeCodes.find(s => s.code === formattedCode);
    if (existingByCode) {
      setSizeError(`รหัสไซส์ '${formattedCode}' ซ้ำกับไซส์ "${existingByCode.name}" ที่มีอยู่แล้ว`);
      return;
    }

    // 2. Check duplicate name
    const existingByName = sizeCodes.find(s => s.name.trim().toLowerCase() === rawName.toLowerCase());
    if (existingByName) {
      setSizeError(`ชื่อไซส์ "${rawName}" ซ้ำกับรหัส ${existingByName.code} ที่มีอยู่แล้ว`);
      return;
    }

    try {
      const res = await fetch('/api/size-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formattedCode, name: rawName })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
      setNewSizeCode('');
      setNewSizeName('');
      setSizeError('');
      toast.success(`เพิ่มไซส์ "${rawName}" สำเร็จ`);
      fetchData();
    } catch (err) {
      setSizeError(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleDeleteSizeCode = (s) => {
    setDeleteTarget({ type: 'size', code: s.code, name: s.name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const url = deleteTarget.type === 'category'
        ? `/api/category-codes/${deleteTarget.code}`
        : `/api/size-codes/${deleteTarget.code}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ลบไม่สำเร็จ');
      }
      toast.success(`ลบ${deleteTarget.type === 'category' ? 'หมวดหมู่' : 'ไซส์'} "${deleteTarget.name}" สำเร็จ`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Start Edit Size
  const handleStartEditSize = (s) => {
    setEditingSize({ code: s.code, name: s.name, originalCode: s.code });
    setEditingSizeError('');
  };

  // Save Edit Size
  const handleSaveEditSize = async (e) => {
    e.preventDefault();
    setEditingSizeError('');
    if (!editingSize) return;

    const rawCode = editingSize.code.trim();
    const rawName = editingSize.name.trim();

    if (!rawCode || !rawName) {
      setEditingSizeError('กรุณากรอกทั้งรหัสและชื่อไซส์');
      return;
    }

    if (!/^\d{1,2}$/.test(rawCode)) {
      setEditingSizeError('รหัสไซส์ต้องเป็นตัวเลข 1-2 หลัก (เช่น 01, 02)');
      return;
    }

    const formattedCode = rawCode.padStart(2, '0');

    // Duplicate check for Code (excluding currently edited item)
    if (formattedCode !== editingSize.originalCode) {
      const existingByCode = sizeCodes.find(s => s.code === formattedCode);
      if (existingByCode) {
        setEditingSizeError(`รหัสไซส์ '${formattedCode}' ซ้ำกับ "${existingByCode.name}" ที่มีอยู่แล้ว`);
        return;
      }
    }

    // Duplicate check for Name (excluding currently edited item)
    const existingByName = sizeCodes.find(s => s.code !== editingSize.originalCode && s.name.trim().toLowerCase() === rawName.toLowerCase());
    if (existingByName) {
      setEditingSizeError(`ชื่อไซส์ "${rawName}" ซ้ำกับรหัส ${existingByName.code} ที่มีอยู่แล้ว`);
      return;
    }

    try {
      const res = await fetch(`/api/size-codes/${editingSize.originalCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formattedCode, name: rawName })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
      setEditingSize(null);
      toast.success(`แก้ไขไซส์ "${rawName}" สำเร็จ`);
      fetchData();
    } catch (err) {
      setEditingSizeError(err.message || 'บันทึกการแก้ไขไม่สำเร็จ');
    }
  };

  const filteredProducts = products.filter(p => p.product_code).sort((a, b) => {
    if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '');
    return (a.product_code || '').localeCompare(b.product_code || '');
  });

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

      {/* Category codes table with Freeze Panel */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={18} color="var(--primary)" />
            ตารางรหัสหมวดหมู่ (CC)
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              {categoryCodes.length} รายการ
            </span>
          </h4>
        </div>
        <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px' }}>
            {catError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                marginBottom: '12px',
                fontWeight: 500
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{catError}</span>
              </div>
            )}
            <form onSubmit={handleAddCategoryCode} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={newCatCode} 
                onChange={e => {
                  setNewCatCode(e.target.value);
                  if (catError) setCatError('');
                }} 
                placeholder="รหัส (เช่น 10) *" 
                maxLength={2} 
                style={{ width: '110px', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${catError ? 'var(--danger)' : 'var(--border)'}` }} 
              />
              <input 
                type="text" 
                value={newCatName} 
                onChange={e => {
                  setNewCatName(e.target.value);
                  if (catError) setCatError('');
                }} 
                placeholder="ชื่อหมวดหมู่ (เช่น เสื้อยืด) *" 
                style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${catError ? 'var(--danger)' : 'var(--border)'}` }} 
              />
              <button 
                type="submit" 
                style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </form>
          </div>

          {/* Freeze Panel (Scrollable Body + Sticky Header) */}
          <div style={{ maxHeight: '320px', overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-surface)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 1px 0 var(--border)'
                }}>
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => handleStartEditCat(c)} 
                          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} 
                          title="แก้ไขรหัสหมวดหมู่นี้"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategoryCode(c)} 
                          style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} 
                          title="ลบรหัสนี้"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categoryCodes.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      ยังไม่มีรหัสหมวดหมู่
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Size codes table with Freeze Panel */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ruler size={18} color="var(--primary)" />
            ตารางรหัสไซส์ (SS)
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              {sizeCodes.length} รายการ
            </span>
          </h4>
        </div>
        <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px' }}>
            {sizeError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                marginBottom: '12px',
                fontWeight: 500
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{sizeError}</span>
              </div>
            )}
            <form onSubmit={handleAddSizeCode} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={newSizeCode} 
                onChange={e => {
                  setNewSizeCode(e.target.value);
                  if (sizeError) setSizeError('');
                }} 
                placeholder="รหัส (เช่น 01) *" 
                maxLength={2} 
                style={{ width: '110px', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${sizeError ? 'var(--danger)' : 'var(--border)'}` }} 
              />
              <input 
                type="text" 
                value={newSizeName} 
                onChange={e => {
                  setNewSizeName(e.target.value);
                  if (sizeError) setSizeError('');
                }} 
                placeholder="ชื่อไซส์ (เช่น XS) *" 
                style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${sizeError ? 'var(--danger)' : 'var(--border)'}` }} 
              />
              <button 
                type="submit" 
                style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </form>
          </div>

          {/* Freeze Panel for Size Codes */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '16px', borderTop: '1px solid var(--border)' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                      onClick={() => handleStartEditSize(s)} 
                      style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} 
                      title="แก้ไขรหัสไซส์"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSizeCode(s)} 
                      style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} 
                      title="ลบรหัสนี้"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {sizeCodes.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  ยังไม่มีรหัสไซส์
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product codes table with Freeze Panel */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} color="var(--primary)" />
            ตารางรหัสสินค้า (PPP)
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              {filteredProducts.length} รายการ
            </span>
          </h4>
        </div>
        <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Freeze Panel (Scrollable Body + Sticky Header) */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-surface)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 1px 0 var(--border)'
                }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>รหัส (PPP)</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>ชื่อสินค้า</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>หมวดหมู่</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, i) => (
                  <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{p.product_code}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.category}</td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      ยังไม่มีรหัสสินค้าที่บันทึก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      <Modal
        isOpen={!!editingCat}
        onClose={() => setEditingCat(null)}
        title={`แก้ไขรหัสหมวดหมู่ (${editingCat?.originalCode})`}
      >
        {editingCat && (
          <form onSubmit={handleSaveEditCat} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {editingCatError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{editingCatError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                รหัสหมวดหมู่ (CC - 2 หลัก) <span style={{color: 'var(--danger)'}}>*</span>
              </label>
              <input
                type="text"
                value={editingCat.code}
                onChange={(e) => {
                  setEditingCat(prev => ({ ...prev, code: e.target.value }));
                  if (editingCatError) setEditingCatError('');
                }}
                maxLength={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                ชื่อหมวดหมู่ <span style={{color: 'var(--danger)'}}>*</span>
              </label>
              <input
                type="text"
                value={editingCat.name}
                onChange={(e) => {
                  setEditingCat(prev => ({ ...prev, name: e.target.value }));
                  if (editingCatError) setEditingCatError('');
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Size Modal */}
      <Modal
        isOpen={!!editingSize}
        onClose={() => setEditingSize(null)}
        title={`แก้ไขรหัสไซส์ (${editingSize?.originalCode})`}
      >
        {editingSize && (
          <form onSubmit={handleSaveEditSize} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {editingSizeError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{editingSizeError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                รหัสไซส์ (SS - 2 หลัก) <span style={{color: 'var(--danger)'}}>*</span>
              </label>
              <input
                type="text"
                value={editingSize.code}
                onChange={(e) => {
                  setEditingSize(prev => ({ ...prev, code: e.target.value }));
                  if (editingSizeError) setEditingSizeError('');
                }}
                maxLength={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                ชื่อไซส์ <span style={{color: 'var(--danger)'}}>*</span>
              </label>
              <input
                type="text"
                value={editingSize.name}
                onChange={(e) => {
                  setEditingSize(prev => ({ ...prev, name: e.target.value }));
                  if (editingSizeError) setEditingSizeError('');
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setEditingSize(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`ยืนยันการลบ${deleteTarget?.type === 'category' ? 'หมวดหมู่' : 'ไซส์'}`}
      >
        {deleteTarget && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trash2 size={28} />
            </div>
            
            <p style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              คุณแน่ใจหรือไม่ว่าต้องการลบ {deleteTarget.type === 'category' ? 'หมวดหมู่' : 'ไซส์'} "{deleteTarget.name}"?
            </p>
            
            <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              รหัส: <code style={{ fontWeight: 700, color: 'var(--primary)' }}>{deleteTarget.code}</code>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
