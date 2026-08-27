import React, { useState, useEffect } from 'react';
import { SizeSelector } from './SizeSelector';
import { validateProduct } from '../../utils/validators';
import { generateBarcodeValue, generateStructuredBarcode } from '../../utils/barcode';
import { useAppContext } from '../../context/AppContext';
import { BarcodeScanner } from '../Barcode/BarcodeScanner';
import { Modal } from '../common/Modal';
import { Plus, X, Check, Camera, Sparkles } from 'lucide-react';

export function ProductForm({ initialData = null, onSubmit, onCancel }) {
  const { products, settings } = useAppContext();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    sizes: {},
    threshold: settings.globalThreshold,
    product_code: null,
    seller: ''
  });

  const [errors, setErrors] = useState({});

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch('/api/category-codes')
      .then(res => res.ok ? res.json() : [])
      .then(data => setDbCategories(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
      
    if (initialData) {
      setFormData({ ...initialData, seller: '' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    // Auto-fetch product_code when category changes (new product only)
    if (name === 'category' && !initialData?.id && value) {
      fetch(`/api/next-product-code/${encodeURIComponent(value)}`)
        .then(r => r.ok ? r.json() : {})
        .then(d => {
          if (d?.product_code) {
            setFormData(prev => ({ ...prev, product_code: d.product_code }));
          }
        })
        .catch(() => {});
    }
  };

  const handleSizeChange = (newSizes) => {
    setFormData(prev => ({ ...prev, sizes: newSizes }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateProduct(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Ensure all sizes have a valid barcode before submitting
    const updatedSizes = { ...formData.sizes };
    for (const [sizeName, sData] of Object.entries(updatedSizes)) {
      const currentBarcode = typeof sData === 'object' ? sData?.barcode : '';
      if (!currentBarcode || !String(currentBarcode).trim()) {
        const generated = await generateStructuredBarcode(formData.category, formData.product_code || '000', sizeName);
        updatedSizes[sizeName] = typeof sData === 'object' 
          ? { ...sData, barcode: generated }
          : { stock: Number(sData) || 0, barcode: generated };
      }
    }

    const totalStock = Object.values(updatedSizes).reduce((sum, sizeData) => {
      const stock = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
      return sum + (Number(stock) || 0);
    }, 0);
    
    onSubmit({
      ...formData,
      sizes: updatedSizes,
      totalStock
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    marginBottom: '4px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 500,
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>


        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>ชื่อสินค้า <span style={{color: 'var(--danger)'}}>*</span></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={{...inputStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border)'}}
              placeholder="เช่น เสื้อยืดคอกลม"
            />
            {errors.name && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.name}</span>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>หมวดหมู่ <span style={{color: 'var(--danger)'}}>*</span></label>
              <a href="/categories" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                จัดการหมวดหมู่
              </a>
            </div>
            
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              style={{
                ...inputStyle,
                width: '100%',
                borderColor: errors.category ? 'var(--danger)' : 'var(--border)',
                cursor: 'pointer'
              }}
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {dbCategories.map(cat => (
                <option key={cat.code} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {errors.category && <span style={{color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block'}}>{errors.category}</span>}
          </div>
        </div>



        <div>
          <label style={labelStyle}>รายละเอียดเพิ่มเติม</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
            placeholder="ระบุรายละเอียดสินค้า (ถ้ามี)..."
          />
        </div>

        {!!initialData && (
          <div>
            <label style={labelStyle}>ชื่อผู้ปรับสต็อก <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem'}}>(แสดงในประวัติ)</span></label>
            <input
              type="text"
              name="seller"
              value={formData.seller || ''}
              onChange={handleChange}
              style={inputStyle}
              placeholder="ชื่อพนักงานที่ปรับสต็อก"
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>แจ้งเตือนเมื่อสต็อกต่ำกว่า (ชิ้น)</label>
          <input
            type="number"
            name="threshold"
            min="0"
            value={formData.threshold}
            onChange={handleChange}
            style={{...inputStyle, width: '150px'}}
          />
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'var(--bg-main)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>จัดการไซส์และสต็อก</h3>
          <SizeSelector 
            value={formData.sizes} 
            onChange={handleSizeChange} 
            category={formData.category}
            productCode={formData.product_code || '000'}
            isEdit={!!initialData}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500
            }}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600
            }}
          >
            {formData.id ? 'บันทึกสต็อกและข้อมูล' : (initialData ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า')}
          </button>
        </div>

      </form>
    </>
  );
}
