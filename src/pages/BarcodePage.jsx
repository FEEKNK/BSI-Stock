import React, { useState } from 'react';
import { BarcodeScanner } from '../components/Barcode/BarcodeScanner';
import { useProducts } from '../hooks/useProducts';
import { Modal } from '../components/common/Modal';
import { ProductForm } from '../components/Products/ProductForm';
import { Plus, Minus, Check, PackagePlus, Box } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';

export function BarcodePage() {
  const [scanResult, setScanResult] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  
  // Quick stock adjustment state
  const [editingSizes, setEditingSizes] = useState({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const { getProductByBarcode, updateProduct, addProduct } = useProducts();

  const handleScanSuccess = (decodedText) => {
    const match = getProductByBarcode(decodedText);
    const product = match?.product || null;

    setScanResult({
      barcode: decodedText,
      product: product,
      matchedSize: match?.matchedSize || null
    });
    
    if (product) {
      setEditingSizes(product.sizes || {});
    }
    setSaveSuccessMsg(false);
    setIsResultModalOpen(true);
  };

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

  const handleGenerate = () => {
    setGeneratorValue(generateNewBarcode());
  };

  const handleSizeQtyChange = (size, delta) => {
    const currentSizeData = editingSizes[size] || {};
    const isOldFormat = typeof currentSizeData === 'number' || typeof currentSizeData === 'string';
    const currentStock = isOldFormat ? Number(currentSizeData) : (currentSizeData?.stock || 0);
    const updatedStock = Math.max(0, currentStock + delta);
    
    setEditingSizes(prev => ({
      ...prev,
      [size]: isOldFormat ? updatedStock : { ...currentSizeData, stock: updatedStock }
    }));
  };

  const handleSaveStock = async () => {
    if (!scanResult || !scanResult.product) return;
    
    const totalStock = Object.values(editingSizes).reduce((sum, sizeData) => {
      const stock = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
      return sum + (Number(stock) || 0);
    }, 0);

    await updateProduct(scanResult.product.id, {
      sizes: editingSizes,
      totalStock
    });
    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
      setIsResultModalOpen(false);
    }, 1200);
  };

  const handleOpenAddProduct = () => {
    setNewProductBarcode(scanResult?.barcode || '');
    setIsResultModalOpen(false);
    setIsAddProductModalOpen(true);
  };

  const handleAddProductSubmit = async (data) => {
    await addProduct(data);
    setIsAddProductModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>สแกนบาร์โค้ด</h1>

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
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              อนุญาตให้เบราว์เซอร์เข้าถึงกล้องเพื่อสแกนบาร์โค้ด
            </p>
            <BarcodeScanner elementId="page-barcode-scanner" onScan={handleScanSuccess} onError={handleScanError} />
          </div>
        </div>
      </div>

      {/* Result Modal with Instant Stock Adjuster */}
      <Modal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title="ผลการสแกนบาร์โค้ด">
        {scanResult && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>รหัสบาร์โค้ด:</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px' }}>
                {scanResult.barcode}
              </div>
            </div>
            
            {scanResult.product ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{scanResult.product.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      หมวดหมู่: {scanResult.product.category} | ราคา: {scanResult.product.price ? formatCurrency(scanResult.product.price) : '-'}
                    </p>
                  </div>
                </div>

                {/* Size list with instant +/- buttons */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {scanResult.matchedSize ? `ปรับสต็อกสำหรับไซส์ที่สแกนเจอ (${scanResult.matchedSize}):` : `ปรับสต็อกตามไซส์ (สแกนบาร์โค้ดรวม):`}
                  </h4>
                  
                  {Object.keys(editingSizes).length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                      สินค้านี้ยังไม่ได้ระบุไซส์
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(editingSizes).map(([size, sizeData]) => {
                        // If matchedSize is present, only show the matched size
                        if (scanResult.matchedSize && size !== scanResult.matchedSize) return null;

                        const isOldFormat = typeof sizeData === 'number' || typeof sizeData === 'string';
                        const qty = isOldFormat ? Number(sizeData) : (sizeData?.stock || 0);

                        return (
                          <div key={size} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: scanResult.matchedSize ? 'var(--primary-light)' : 'var(--bg-surface)', border: `1px solid ${scanResult.matchedSize ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontWeight: 600, color: scanResult.matchedSize ? 'var(--primary)' : 'var(--text-primary)' }}>{size}</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSizeQtyChange(size, -1)}
                                  style={{ padding: '6px 10px', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                                >
                                  <Minus size={14} />
                                </button>
                                <span style={{ padding: '6px 12px', minWidth: '45px', textAlign: 'center', fontWeight: 700, backgroundColor: 'var(--bg-surface)' }}>
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSizeQtyChange(size, 1)}
                                  style={{ padding: '6px 10px', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSizeQtyChange(size, 5)}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
                              >
                                +5
                              </button>
                              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ชิ้น</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {saveSuccessMsg && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Check size={18} /> บันทึกจำนวนสต็อกสำเร็จ!
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={handleSaveStock}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Check size={18} /> บันทึกสต็อกทันที
                  </button>
                  <button
                    onClick={() => setIsResultModalOpen(false)}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 500
                    }}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ padding: '24px', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(217, 119, 6, 0.2)', marginBottom: '20px' }}>
                  <h3 style={{ color: 'var(--warning)', margin: '0 0 8px 0' }}>ไม่พบสินค้าในระบบ</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    บาร์โค้ดนี้ยังไม่ได้ถูกผูกกับสินค้าใดๆ คุณต้องการเพิ่มเป็นสินค้าใหม่หรือไม่?
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleOpenAddProduct}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <PackagePlus size={18} /> เพิ่มเป็นสินค้าใหม่ด้วยรหัสนี้
                  </button>
                  <button
                    onClick={() => setIsResultModalOpen(false)}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 500
                    }}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

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
