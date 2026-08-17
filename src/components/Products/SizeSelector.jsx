import React, { useState, useEffect } from 'react';
import { Plus, Minus, X, Layers, Tag, Barcode, Check } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { generateStructuredBarcode, generateBarcodeValue } from '../../utils/barcode';

export function SizeSelector({ value = {}, onChange, category = '', productCode = '000' }) {
  const { addSavedSize } = useAppContext();
  const [customSize, setCustomSize] = useState('');
  const [dbSizes, setDbSizes] = useState([]);

  useEffect(() => {
    fetch('/api/size-codes')
      .then(res => res.json())
      .then(data => setDbSizes(data))
      .catch(err => console.error(err));
  }, []);

  const handleQuantityChange = (size, qty) => {
    const current = value[size] || { stock: 0, barcode: '' };
    const num = Number(qty);
    const updatedStock = (isNaN(num) || num < 0) ? 0 : num;
    onChange({ ...value, [size]: { ...current, stock: updatedStock } });
  };

  const handleIncrement = (size, delta) => {
    const current = value[size] || { stock: 0, barcode: '' };
    const currentStock = Number(current.stock) || 0;
    const updatedStock = Math.max(0, currentStock + delta);
    onChange({ ...value, [size]: { ...current, stock: updatedStock } });
  };

  const handleBarcodeChange = (size, barcodeValue) => {
    const current = value[size] || { stock: 0, barcode: '' };
    onChange({ ...value, [size]: { ...current, barcode: barcodeValue } });
  };

  const handleGenerateBarcode = async (size) => {
    const current = value[size] || { stock: 0, barcode: '' };
    const newBarcode = await generateStructuredBarcode(category, productCode, size);
    onChange({ ...value, [size]: { ...current, barcode: newBarcode } });
  };

  const removeSizeFromProduct = (size) => {
    const newValue = { ...value };
    delete newValue[size];
    onChange(newValue);
  };

  const addCustomSize = async (e) => {
    if (e) e.preventDefault();
    const trimmed = customSize.trim();
    if (trimmed) {
      addSavedSize(trimmed);
      if (value[trimmed] === undefined) {
        const newBarcode = await generateStructuredBarcode(category, productCode, trimmed);
        onChange({ ...value, [trimmed]: { stock: 0, barcode: newBarcode } });
      }
      setCustomSize('');
    }
  };

  const handleSelectSavedSize = async (size) => {
    if (value[size] === undefined) {
      const newBarcode = await generateStructuredBarcode(category, productCode, size);
      onChange({ ...value, [size]: { stock: 0, barcode: newBarcode } });
    } else {
      removeSizeFromProduct(size);
    }
  };

  const sizeKeys = Object.keys(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {dbSizes.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Tag size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              เลือกไซส์ (คลิกเพื่อเพิ่ม/ลบ):
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dbSizes.map(item => {
              const size = item.name;
              const isSelected = value[size] !== undefined;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSelectSavedSize(size)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 16px',
                    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: isSelected ? 600 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {isSelected && <Check size={14} />}
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={customSize}
          onChange={(e) => setCustomSize(e.target.value)}
          placeholder="พิมพ์ชื่อไซส์แบบกำหนดเอง (ถ้าไม่มีให้เลือกด้านบน)..."
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
          <Plus size={16} /> เพิ่มไซส์
        </button>
      </div>

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
            จำนวนสต็อกและบาร์โค้ดตามไซส์ ({sizeKeys.length} ไซส์)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(value).map(([size, sizeData]) => {
              // Backward compatibility for old format where sizeData is just a number
              const isOldFormat = typeof sizeData === 'number' || typeof sizeData === 'string';
              const stock = isOldFormat ? Number(sizeData) : (sizeData?.stock || 0);
              const barcode = isOldFormat ? '' : (sizeData?.barcode || '');

              return (
                <div 
                  key={size} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: '80px' }}>
                    {size}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
                    <Barcode size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <input 
                      type="text"
                      value={barcode}
                      onChange={(e) => handleBarcodeChange(size, e.target.value)}
                      placeholder="บาร์โค้ด"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        flex: 1,
                        fontSize: '0.875rem'
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => handleGenerateBarcode(size)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      สร้างรหัสใหม่
                    </button>
                  </div>

                  {/* Stepper Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>จำนวน:</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => handleIncrement(size, -1)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="ลด 1"
                      >
                        <Minus size={14} />
                      </button>
                      
                      <input 
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => handleQuantityChange(size, e.target.value)}
                        style={{
                          padding: '6px 8px',
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          width: '70px',
                          textAlign: 'center',
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => handleIncrement(size, 1)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="เพิ่ม 1"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleIncrement(size, 5)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600
                      }}
                      title="เพิ่ม 5 ชิ้น"
                    >
                      +5
                    </button>

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
                        justifyContent: 'center',
                        marginLeft: '8px'
                      }}
                      title="ลบไซส์นี้ออกจากสินค้านี้"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
