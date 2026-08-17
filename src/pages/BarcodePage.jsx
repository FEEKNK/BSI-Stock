import React, { useState } from 'react';
import { BarcodeScanner } from '../components/Barcode/BarcodeScanner';
import { BarcodeGenerator } from '../components/Barcode/BarcodeGenerator';
import { useBarcode } from '../hooks/useBarcode';
import { useProducts } from '../hooks/useProducts';
import { Modal } from '../components/common/Modal';

export function BarcodePage() {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState(null);
  const [generatorValue, setGeneratorValue] = useState('');
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  
  const { generateNewBarcode } = useBarcode();
  const { getProductByBarcode } = useProducts();

  const handleScanSuccess = (decodedText) => {
    const product = getProductByBarcode(decodedText);
    setScanResult({
      barcode: decodedText,
      product: product
    });
    setIsResultModalOpen(true);
  };

  const handleScanError = (error) => {
    // silent ignore
  };

  const handleGenerate = () => {
    setGeneratorValue(generateNewBarcode());
  };

  const tabStyle = (isActive) => ({
    flex: 1,
    padding: '14px',
    textAlign: 'center',
    fontWeight: 600,
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
    backgroundColor: isActive ? 'var(--bg-surface)' : 'var(--bg-main)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>จัดการบาร์โค้ด</h1>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <div style={tabStyle(activeTab === 'scan')} onClick={() => setActiveTab('scan')}>สแกนบาร์โค้ด</div>
          <div style={tabStyle(activeTab === 'generate')} onClick={() => setActiveTab('generate')}>สร้างบาร์โค้ด</div>
        </div>

        <div style={{ padding: '32px' }}>
          {activeTab === 'scan' ? (
            <div>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                อนุญาตให้เบราว์เซอร์เข้าถึงกล้องเพื่อสแกนบาร์โค้ด
              </p>
              <BarcodeScanner onScan={handleScanSuccess} onError={handleScanError} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px', margin: '0 auto' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>ป้อนรหัส หรือ สุ่มบาร์โค้ด</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={generatorValue}
                    onChange={(e) => setGeneratorValue(e.target.value)}
                    style={{
                      flex: 1, padding: '10px 14px',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    onClick={handleGenerate}
                    style={{
                      padding: '0 16px', backgroundColor: 'var(--primary)', color: 'white',
                      borderRadius: 'var(--radius-md)', fontWeight: 500
                    }}
                  >
                    สุ่มบาร์โค้ด
                  </button>
                </div>
              </div>
              
              {generatorValue && (
                <div style={{ marginTop: '16px' }}>
                  <BarcodeGenerator value={generatorValue} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title="ผลการสแกน">
        {scanResult && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              บาร์โค้ด: {scanResult.barcode}
            </div>
            
            {scanResult.product ? (
              <div style={{ padding: '24px', backgroundColor: 'var(--success-bg)', borderRadius: 'var(--radius-md)', marginTop: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h3 style={{ color: 'var(--success)', margin: '0 0 8px 0' }}>พบสินค้าในระบบ</h3>
                <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{scanResult.product.name}</p>
                <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>สต็อกปัจจุบัน: {scanResult.product.totalStock} ชิ้น</p>
              </div>
            ) : (
              <div style={{ padding: '24px', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', marginTop: '16px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                <h3 style={{ color: 'var(--warning)', margin: '0 0 8px 0' }}>ไม่พบสินค้าในระบบ</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>บาร์โค้ดนี้ยังไม่ได้ผูกกับสินค้าใดๆ</p>
              </div>
            )}

            <div style={{ marginTop: '24px' }}>
              <button
                onClick={() => setIsResultModalOpen(false)}
                style={{
                  padding: '10px 24px', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', fontWeight: 500
                }}
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
