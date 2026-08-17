import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarcodeScanner } from '../components/Barcode/BarcodeScanner';
import { useProducts } from '../hooks/useProducts';
import { Modal } from '../components/common/Modal';
import { ProductForm } from '../components/Products/ProductForm';
import { Plus, Minus, Check, PackagePlus, Box, ScanLine } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';

export function BarcodePage() {
  const [scanResult, setScanResult] = useState(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  
  // Quick stock adjustment state
  const [editingSizes, setEditingSizes] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState(Date.now());

  const { getProductByBarcode, updateProductStock, addProduct } = useProducts();
  const manualInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Play beep sound for successful scan increment
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio not supported or blocked");
    }
  };

  // Debounced Auto-Save function
  const triggerAutoSave = useCallback((productId, newSizes) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setSaveSuccessMsg(false);
    setIsSaving(true);
    
    saveTimeoutRef.current = setTimeout(async () => {
      const totalStock = Object.values(newSizes).reduce((sum, sizeData) => {
        const stock = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
        return sum + (Number(stock) || 0);
      }, 0);

      await updateProductStock(productId, newSizes, totalStock);
      
      setIsSaving(false);
      setSaveSuccessMsg(true);
      
      setTimeout(() => setSaveSuccessMsg(false), 2000);
    }, 500); // Wait 500ms after last scan/edit to save
  }, [updateProduct]);

  const handleScanSuccess = useCallback((decodedText) => {
    setLastScannedTime(Date.now());
    
    setScanResult(prevResult => {
      const match = getProductByBarcode(decodedText);
      const product = match?.product || null;

      if (!product) {
        return {
          barcode: decodedText,
          product: null,
          matchedSize: null
        };
      }

      // Check if this is a repeated scan of the SAME barcode
      if (prevResult?.product?.id === product.id && prevResult?.barcode === decodedText && match.matchedSize) {
        // Increment the specific size
        setEditingSizes(prevSizes => {
          const currentSizeData = prevSizes[match.matchedSize] || {};
          const isOldFormat = typeof currentSizeData === 'number' || typeof currentSizeData === 'string';
          const currentStock = isOldFormat ? Number(currentSizeData) : (currentSizeData?.stock || 0);
          
          const newSizes = {
            ...prevSizes,
            [match.matchedSize]: isOldFormat ? (currentStock + 1) : { ...currentSizeData, stock: currentStock + 1 }
          };
          
          // Debounce auto-save
          triggerAutoSave(product.id, newSizes);
          
          return newSizes;
        });
        
        playBeep();
        
        return {
          ...prevResult,
          barcode: decodedText,
          matchedSize: match.matchedSize
        };
      }

      // It's a new product or different barcode entirely
      setEditingSizes(product.sizes || {});
      playBeep();
      return {
        barcode: decodedText,
        product: product,
        matchedSize: match?.matchedSize || null
      };
    });
    
    // Focus back to manual input so scanner can keep typing
    setTimeout(() => {
      if (manualInputRef.current) manualInputRef.current.focus();
    }, 50);

  }, [getProductByBarcode, triggerAutoSave]);

  const handleScanError = (error) => {
    // silent ignore
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScanSuccess(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const handleSizeQtyChange = (size, newValue) => {
    if (!scanResult || !scanResult.product) return;
    
    const parsedValue = Math.max(0, parseInt(newValue) || 0);
    
    setEditingSizes(prev => {
      const currentSizeData = prev[size] || {};
      const isOldFormat = typeof currentSizeData === 'number' || typeof currentSizeData === 'string';
      const newSizes = {
        ...prev,
        [size]: isOldFormat ? parsedValue : { ...currentSizeData, stock: parsedValue }
      };
      
      triggerAutoSave(scanResult.product.id, newSizes);
      return newSizes;
    });
  };

  const handleSizeQtyAdjust = (size, delta) => {
    if (!scanResult || !scanResult.product) return;
    
    setEditingSizes(prev => {
      const currentSizeData = prev[size] || {};
      const isOldFormat = typeof currentSizeData === 'number' || typeof currentSizeData === 'string';
      const currentStock = isOldFormat ? Number(currentSizeData) : (currentSizeData?.stock || 0);
      const updatedStock = Math.max(0, currentStock + delta);
      
      const newSizes = {
        ...prev,
        [size]: isOldFormat ? updatedStock : { ...currentSizeData, stock: updatedStock }
      };
      
      triggerAutoSave(scanResult.product.id, newSizes);
      return newSizes;
    });
  };

  const handleOpenAddProduct = () => {
    setNewProductBarcode(scanResult?.barcode || '');
    setIsAddProductModalOpen(true);
  };

  const handleAddProductSubmit = async (data) => {
    await addProduct(data);
    setIsAddProductModalOpen(false);
    // Re-scan it so it shows up
    handleScanSuccess(newProductBarcode);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>สแกนเช็คสต็อก</h1>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ padding: '32px' }}>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <input
              ref={manualInputRef}
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="สแกนหรือพิมพ์บาร์โค้ดที่นี่ แล้วกด Enter..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--primary)',
                fontSize: '1.125rem',
                fontFamily: 'monospace',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                padding: '0 24px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              ค้นหา
            </button>
          </form>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-surface)', padding: '0 12px', color: 'var(--text-tertiary)', fontSize: '0.875rem', zIndex: 1 }}>
              หรือใช้กล้องสแกน
            </div>
            <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 24px 0' }}></div>
            <BarcodeScanner elementId="page-barcode-scanner" onScan={handleScanSuccess} onError={handleScanError} />
          </div>
        </div>
      </div>

      {/* INLINE Scan Result */}
      {scanResult && (
        <div 
          key={lastScannedTime} 
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '2px solid var(--primary)',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)',
            animation: 'pulse-border 0.5s ease-out'
          }}
        >
          <style>{`
            @keyframes pulse-border {
              0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4); }
              70% { box-shadow: 0 0 0 15px rgba(14, 165, 233, 0); }
              100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
            }
          `}</style>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px' }}>
                <ScanLine size={18} />
                <span>รหัสล่าสุด: {scanResult.barcode}</span>
              </div>
            </div>
            
            <div>
              {isSaving ? (
                <Badge type="warning">กำลังบันทึก...</Badge>
              ) : saveSuccessMsg ? (
                <Badge type="success"><Check size={12} style={{marginRight: 4}}/> บันทึกแล้ว</Badge>
              ) : null}
            </div>
          </div>

          {scanResult.product ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box size={32} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{scanResult.product.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    หมวดหมู่: {scanResult.product.category}
                  </p>
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {scanResult.matchedSize ? `อัปเดตสต็อก (ไซส์: ${scanResult.matchedSize})` : `อัปเดตสต็อกทุกไซส์:`}
                </h4>
                
                {Object.keys(editingSizes).length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    สินค้านี้ยังไม่ได้ระบุไซส์
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(editingSizes).map(([size, sizeData]) => {
                      if (scanResult.matchedSize && size !== scanResult.matchedSize) return null;

                      const isOldFormat = typeof sizeData === 'number' || typeof sizeData === 'string';
                      const qty = isOldFormat ? Number(sizeData) : (sizeData?.stock || 0);
                      const isHighlighted = scanResult.matchedSize === size;

                      return (
                        <div key={size} style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                          padding: '12px 16px', 
                          backgroundColor: isHighlighted ? 'rgba(14, 165, 233, 0.05)' : 'white', 
                          border: `1px solid ${isHighlighted ? 'var(--primary)' : 'var(--border)'}`, 
                          borderRadius: 'var(--radius-md)' 
                        }}>
                          <span style={{ fontWeight: 600, fontSize: '1.125rem', color: isHighlighted ? 'var(--primary)' : 'var(--text-primary)' }}>{size}</span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleSizeQtyAdjust(size, -1)}
                              style={{ padding: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                              <Minus size={16} />
                            </button>
                            
                            <input
                              type="number"
                              value={qty}
                              onChange={(e) => handleSizeQtyChange(size, e.target.value)}
                              style={{ 
                                width: '80px', 
                                textAlign: 'center', 
                                fontSize: '1.25rem', 
                                fontWeight: 700,
                                padding: '8px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)',
                                backgroundColor: 'white'
                              }}
                              min="0"
                            />
                            
                            <button
                              type="button"
                              onClick={() => handleSizeQtyAdjust(size, 1)}
                              style={{ padding: '8px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', cursor: 'pointer' }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <p style={{ margin: '16px 0 0 0', fontSize: '0.875rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  ระบบจะบันทึกให้อัตโนมัติ สามารถสแกนซ้ำหรือสแกนชิ้นต่อไปได้เลย หรือจิ้มที่ช่องเพื่อพิมพ์ตัวเลข
                </p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ padding: '24px', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(217, 119, 6, 0.2)', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--warning)', margin: '0 0 8px 0' }}>ไม่พบสินค้าในระบบ</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  บาร์โค้ด {scanResult.barcode} ยังไม่ได้ถูกผูกกับสินค้าใดๆ คุณต้องการเพิ่มเป็นสินค้าใหม่หรือไม่?
                </p>
              </div>
              <button
                onClick={handleOpenAddProduct}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <PackagePlus size={18} /> เพิ่มเป็นสินค้าใหม่ด้วยรหัสนี้
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal (triggered from scanning new barcode) */}
      <Modal 
        isOpen={isAddProductModalOpen} 
        onClose={() => setIsAddProductModalOpen(false)} 
        title="เพิ่มสินค้าใหม่จากบาร์โค้ดที่สแกน"
      >
        <ProductForm 
          initialData={{ barcode: newProductBarcode }}
          onSubmit={handleAddProductSubmit}
          onCancel={() => setIsAddProductModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

// Simple Badge component for local use if not imported globally
function Badge({ children, type = 'default' }) {
  const colors = {
    success: { bg: 'var(--success-bg)', text: 'var(--success)' },
    warning: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
    default: { bg: 'var(--bg-main)', text: 'var(--text-secondary)' }
  };
  const color = colors[type] || colors.default;
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: color.bg,
      color: color.text
    }}>
      {children}
    </span>
  );
}
