
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

export function DispensingForm({ initialData = null, onSubmit, onCancel }) {
  const { products } = useAppContext();
  
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    dispensed_date: today,
    hn: '',
    product_id: '',
    size: '',
    quantity: 1,
    seller: '',
    note: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        dispensed_date: initialData.dispensed_date ? new Date(initialData.dispensed_date).toISOString().split('T')[0] : today
      });
    }
  }, [initialData, today]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }

    if (name === 'product_id') {
      setFormData(prev => ({ ...prev, size: '' }));
    }
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);
  const availableSizes = selectedProduct && selectedProduct.sizes ? Object.keys(selectedProduct.sizes) : [];

  // Calculate actual stock available for this size
  let currentStock = 0;
  if (selectedProduct && formData.size && selectedProduct.sizes) {
    const sizeData = selectedProduct.sizes[formData.size];
    if (sizeData !== undefined) {
      currentStock = typeof sizeData === 'object' ? Number(sizeData.stock) || 0 : Number(sizeData) || 0;
    }
  }

  // If in edit mode and same product/size as initialData, add back initial quantity
  const isEditingSameSize = initialData && initialData.product_id === formData.product_id && initialData.size === formData.size;
  const maxAllowedStock = isEditingSameSize ? currentStock + (Number(initialData.quantity) || 0) : currentStock;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.dispensed_date) newErrors.dispensed_date = 'กรุณาระบุวันที่';
    if (!formData.hn || !formData.hn.trim()) newErrors.hn = 'กรุณาระบุรหัส HN คนไข้';
    if (!formData.product_id) newErrors.product_id = 'กรุณาเลือกสินค้า';
    if (!formData.size) newErrors.size = 'กรุณาเลือกไซส์';
    if (!formData.seller || !formData.seller.trim()) newErrors.seller = 'กรุณาระบุชื่อผู้เบิกสินค้า';
    
    const qty = Number(formData.quantity);
    const isOutRecord = !initialData || !initialData.type || initialData.type === 'OUT';
    
    if (!formData.quantity || qty < 1) {
      newErrors.quantity = 'ระบุจำนวนที่ถูกต้อง (ต้องมากกว่า 0)';
    } else if (formData.product_id && formData.size && isOutRecord) {
      if (maxAllowedStock <= 0) {
        newErrors.quantity = 'สินค้านี้หมดสต็อก ไม่สามารถทำรายการเบิกได้';
      } else if (qty > maxAllowedStock) {
        newErrors.quantity = `จำนวนเบิกเกินสต็อกคงเหลือ (คงเหลือ ${maxAllowedStock} ชิ้น)`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      product_name: selectedProduct.name,
      quantity: Number(formData.quantity)
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>วันที่เบิก/ใช้ <span style={{color: 'var(--danger)'}}>*</span></label>
          <input
            type="date"
            name="dispensed_date"
            value={formData.dispensed_date}
            onChange={handleChange}
            style={{...inputStyle, borderColor: errors.dispensed_date ? 'var(--danger)' : 'var(--border)'}}
          />
          {errors.dispensed_date && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.dispensed_date}</span>}
        </div>
        <div>
          <label style={labelStyle}>HN คนไข้ <span style={{color: 'var(--danger)'}}>*</span></label>
          <input
            type="text"
            name="hn"
            value={formData.hn}
            onChange={handleChange}
            style={{...inputStyle, borderColor: errors.hn ? 'var(--danger)' : 'var(--border)'}}
            placeholder="รหัส HN"
          />
          {errors.hn && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.hn}</span>}
        </div>
      </div>

      <div>
        <label style={labelStyle}>เลือกสินค้า <span style={{color: 'var(--danger)'}}>*</span></label>
        <select
          name="product_id"
          value={formData.product_id}
          onChange={handleChange}
          style={{...inputStyle, borderColor: errors.product_id ? 'var(--danger)' : 'var(--border)', cursor: 'pointer'}}
        >
          <option value="">-- เลือกสินค้า --</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} {p.category ? `(${p.category})` : ''}</option>
          ))}
        </select>
        {errors.product_id && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.product_id}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>เลือกไซส์ <span style={{color: 'var(--danger)'}}>*</span></label>
            {formData.size && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: maxAllowedStock > 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: maxAllowedStock > 0 ? 'var(--success)' : 'var(--danger)'
              }}>
                {maxAllowedStock > 0 ? `คงเหลือ ${maxAllowedStock} ชิ้น` : 'หมดสต็อก'}
              </span>
            )}
          </div>
          <select
            name="size"
            value={formData.size}
            onChange={handleChange}
            disabled={!formData.product_id}
            style={{...inputStyle, borderColor: errors.size ? 'var(--danger)' : 'var(--border)', cursor: formData.product_id ? 'pointer' : 'not-allowed'}}
          >
            <option value="">-- เลือกไซส์ --</option>
            {availableSizes.map(size => {
              const sData = selectedProduct?.sizes?.[size];
              const sStock = typeof sData === 'object' ? Number(sData?.stock || 0) : Number(sData || 0);
              const effStock = (initialData && initialData.product_id === formData.product_id && initialData.size === size)
                ? sStock + (Number(initialData.quantity) || 0)
                : sStock;
              return (
                <option key={size} value={size}>
                  {size} {effStock > 0 ? `(คงเหลือ ${effStock} ชิ้น)` : '(หมดสต็อก)'}
                </option>
              );
            })}
          </select>
          {errors.size && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.size}</span>}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>จำนวน <span style={{color: 'var(--danger)'}}>*</span></label>
            {formData.size && maxAllowedStock > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                (สูงสุด {maxAllowedStock})
              </span>
            )}
          </div>
          <input
            type="number"
            name="quantity"
            min="1"
            max={formData.size && maxAllowedStock > 0 ? maxAllowedStock : undefined}
            value={formData.quantity}
            onChange={handleChange}
            style={{...inputStyle, borderColor: errors.quantity ? 'var(--danger)' : 'var(--border)'}}
          />
          {errors.quantity && <span style={{color: 'var(--danger)', fontSize: '0.75rem', display: 'block'}}>{errors.quantity}</span>}
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          {formData.type === 'IN' ? 'ผู้รับเข้าสินค้า / ผู้บันทึก' : 'ผู้ทำรายการ / ผู้เบิก'} <span style={{color: 'var(--danger)'}}>*</span>
        </label>
        <input
          type="text"
          name="seller"
          value={formData.seller}
          onChange={handleChange}
          style={{...inputStyle, borderColor: errors.seller ? 'var(--danger)' : 'var(--border)'}}
          placeholder={formData.type === 'IN' ? 'ชื่อผู้รับเข้าสินค้า / ผู้บันทึก' : 'ชื่อผู้เบิกสินค้า'}
        />
        {errors.seller && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.seller}</span>}
      </div>

      <div>
        <label style={labelStyle}>หมายเหตุ</label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          style={{...inputStyle, minHeight: '60px', resize: 'vertical'}}
          placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)..."
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
            fontWeight: 500,
            cursor: 'pointer'
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
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          บันทึกการเบิก
        </button>
      </div>
    </form>
  );
}
