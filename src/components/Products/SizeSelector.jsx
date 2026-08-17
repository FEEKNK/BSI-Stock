import React, { useState } from 'react';
import { Plus, X, Layers, Tag } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export function SizeSelector({ value = {}, onChange }) {
  const { savedSizes, addSavedSize, removeSavedSize } = useAppContext();
  const [customSize, setCustomSize] = useState('');

  const handleQuantityChange = (size, qty) => {
    const newValue = { ...value, [size]: Number(qty) };
    if (qty === '' || isNaN(qty) || Number(qty) < 0) {
      newValue[size] = 0;
    }
    onChange(newValue);
  };

  const removeSizeFromProduct = (size) => {
    const newValue = { ...value };
    delete newValue[size];
    onChange(newValue);
  };

  const addCustomSize = (e) => {
    if (e) e.preventDefault();
    const trimmed = customSize.trim();
    if (trimmed) {
      // Add to saved sizes list
      addSavedSize(trimmed);
      // Add to current product if not yet present
      if (value[trimmed] === undefined) {
        onChange({ ...value, [trimmed]: 0 });
      }
      setCustomSize('');
    }
  };

  const handleSelectSavedSize = (size) => {
    if (value[size] === undefined) {
      onChange({ ...value, [size]: 0 });
    }
  };

  const sizeKeys = Object.keys(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Saved Sizes Quick Selection */}
      {savedSizes.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Tag size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              ไซส์ที่บันทึกไว้ (คลิกเพื่อเลือกใช้):
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {savedSizes.map(size => {
              const isSelected = value[size] !== undefined;
              return (
                <div
                  key={size}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSavedSize(size)}
                    style={{
                      padding: '6px 10px',
                      color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.875rem'
                    }}
                  >
                    {isSelected ? `✓ ${size}` : `+ ${size}`}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSavedSize(size);
                    }}
                    style={{
                      padding: '6px 8px',
                      color: 'var(--text-tertiary)',
                      borderLeft: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="ลบไซส์นี้ออกจากรายการที่บันทึกไว้"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Size Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={customSize}
          onChange={(e) => setCustomSize(e.target.value)}
          placeholder="พิมพ์ชื่อไซส์ใหม่ (เช่น S, M, L, 42, ฟรีไซส์, กล่อง)..."
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            flex: 1
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomSize(e);
            }
          }}
        />
        <button 
          type="button" 
          onClick={addCustomSize} 
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          <Plus size={16} /> เพิ่มและบันทึกไซส์
        </button>
      </div>

      {/* Configured Sizes Table */}
      {sizeKeys.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-tertiary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Layers size={24} />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>ยังไม่ได้เลือกไซส์สำหรับสินค้านี้ พิมพ์ไซส์ใหม่หรือคลิกเลือกจากไซส์ที่บันทึกไว้ด้านบน</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            จำนวนสต็อกตามไซส์ของสินค้านี้ ({sizeKeys.length} ไซส์)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(value).map(([size, qty]) => (
              <div 
                key={size} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: '100px' }}>
                  {size}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>จำนวน:</span>
                  <input 
                    type="number"
                    min="0"
                    value={qty}
                    onChange={(e) => handleQuantityChange(size, e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      width: '100px',
                      textAlign: 'center',
                      fontWeight: 600
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ชิ้น</span>
                  <button 
                    type="button" 
                    onClick={() => removeSizeFromProduct(size)} 
                    style={{ 
                      color: 'var(--danger)', 
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="ลบไซส์นี้ออกจากสินค้านี้"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
