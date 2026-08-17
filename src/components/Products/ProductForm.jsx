import React, { useState, useEffect } from 'react';
import { SizeSelector } from './SizeSelector';
import { validateProduct } from '../../utils/validators';
import { generateBarcodeValue } from '../../utils/barcode';
import { useAppContext } from '../../context/AppContext';
import { Tag, X } from 'lucide-react';

export function ProductForm({ initialData = null, onSubmit, onCancel }) {
  const { products, settings, savedCategories, addSavedCategory, removeSavedCategory } = useAppContext();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    barcode: '',
    sizes: {},
    threshold: settings.globalThreshold
  });

  const [errors, setErrors] = useState({});

  // Combine savedCategories and unique categories from existing products
  const allCategories = Array.from(
    new Set([...savedCategories, ...products.map(p => p.category).filter(Boolean)])
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectCategory = (cat) => {
    setFormData(prev => ({ ...prev, category: cat }));
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: null }));
    }
  };

  const handleSizeChange = (newSizes) => {
    setFormData(prev => ({ ...prev, sizes: newSizes }));
  };

  const handleGenerateBarcode = () => {
    setFormData(prev => ({ ...prev, barcode: generateBarcodeValue() }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateProduct(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Save the category for next time
    if (formData.category) {
      addSavedCategory(formData.category);
    }

    const totalStock = Object.values(formData.sizes).reduce((sum, sizeData) => {
      const stock = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
      return sum + (Number(stock) || 0);
    }, 0);
    
    onSubmit({
      ...formData,
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
          <label style={labelStyle}>หมวดหมู่ <span style={{color: 'var(--danger)'}}>*</span></label>
          <input
            type="text"
            name="category"
            list="category-suggestions"
            value={formData.category}
            onChange={handleChange}
            style={{...inputStyle, borderColor: errors.category ? 'var(--danger)' : 'var(--border)'}}
            placeholder="พิมพ์หรือเลือกหมวดหมู่..."
          />
          <datalist id="category-suggestions">
            {allCategories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          {errors.category && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.category}</span>}

          {/* Quick select saved categories */}
          {allCategories.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Tag size={12} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>หมวดหมู่ที่บันทึกไว้:</span>
              {allCategories.map(cat => {
                const isSelected = formData.category === cat;
                return (
                  <span
                    key={cat}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-main)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <span onClick={() => handleSelectCategory(cat)} style={{ fontWeight: isSelected ? 600 : 400 }}>
                      {cat}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedCategory(cat);
                      }}
                      style={{
                        marginLeft: '4px',
                        color: 'var(--text-tertiary)',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="ลบหมวดหมู่นี้ออกจากที่บันทึกไว้"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>ราคา (บาท)</label>
          <input
            type="number"
            name="price"
            min="0"
            value={formData.price}
            onChange={handleChange}
            style={{...inputStyle, borderColor: errors.price ? 'var(--danger)' : 'var(--border)'}}
            placeholder="0.00"
          />
          {errors.price && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.price}</span>}
        </div>

        <div>
          <label style={labelStyle}>บาร์โค้ด</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              style={{...inputStyle, flex: 1}}
              placeholder="สแกนหรือพิมพ์บาร์โค้ด"
            />
            <button
              type="button"
              onClick={handleGenerateBarcode}
              style={{
                padding: '0 16px',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'nowrap',
                fontWeight: 500
              }}
            >
              สุ่มบาร์โค้ด
            </button>
          </div>
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
        <SizeSelector value={formData.sizes} onChange={handleSizeChange} />
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
          {initialData ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
        </button>
      </div>

    </form>
  );
}
