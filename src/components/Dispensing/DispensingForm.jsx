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

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.dispensed_date) newErrors.dispensed_date = 'กรุณาระบุวันที่';
    if (!formData.product_id) newErrors.product_id = 'กรุณาเลือกสินค้า';
    if (!formData.size) newErrors.size = 'กรุณาเลือกไซส์';
    if (!formData.quantity || formData.quantity < 1) newErrors.quantity = 'ระบุจำนวนที่ถูกต้อง';

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
          <label style={labelStyle}>HN คนไข้</label>
          <input
            type="text"
            name="hn"
            value={formData.hn}
            onChange={handleChange}
            style={inputStyle}
            placeholder="รหัส HN"
          />
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
          <label style={labelStyle}>เลือกไซส์ <span style={{color: 'var(--danger)'}}>*</span></label>
          <select
            name="size"
            value={formData.size}
            onChange={handleChange}
            disabled={!formData.product_id}
            style={{...inputStyle, borderColor: errors.size ? 'var(--danger)' : 'var(--border)', cursor: formData.product_id ? 'pointer' : 'not-allowed'}}
          >
            <option value="">-- เลือกไซส์ --</option>
            {availableSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          {errors.size && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.size}</span>}
        </div>
        <div>
          <label style={labelStyle}>จำนวน <span style={{color: 'var(--danger)'}}>*</span></label>
          <input
            type="number"
            name="quantity"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            style={{...inputStyle, borderColor: errors.quantity ? 'var(--danger)' : 'var(--border)'}}
          />
          {errors.quantity && <span style={{color: 'var(--danger)', fontSize: '0.75rem'}}>{errors.quantity}</span>}
        </div>
      </div>

      <div>
        <label style={labelStyle}>ผู้ขาย / ผู้เบิก</label>
        <input
          type="text"
          name="seller"
          value={formData.seller}
          onChange={handleChange}
          style={inputStyle}
          placeholder="ชื่อผู้เบิกสินค้า"
        />
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
