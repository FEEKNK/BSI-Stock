import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarcodeScanner } from '../components/Barcode/BarcodeScanner';
import { useProducts } from '../hooks/useProducts';
import { Modal } from '../components/common/Modal';
import { ProductForm } from '../components/Products/ProductForm';
import { Plus, Minus, Check, PackagePlus, Box, ScanLine, ShoppingCart, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';

export function BarcodePage() {
  const { products, getProductByBarcode, updateProductStock, addProduct } = useProducts();
  
  // Cart state: Array of { id, product, matchedSize, quantity }
  const [cart, setCart] = useState([]);
  
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  
  const manualInputRef = useRef(null);

  // Play beep sound
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // Classic POS scanner beep (7-11 style)
      // Crisp, high-pitched sine wave around 2200Hz, lasting ~100ms
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(2200, audioCtx.currentTime); 
      
      // Quick envelope to sound snappy
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio not supported or blocked");
    }
  };

  const handleScanSuccess = useCallback((decodedText) => {
    const match = getProductByBarcode(decodedText);
    const product = match?.product || null;

    if (!product) {
      // Product not found
      setNewProductBarcode(decodedText);
      setIsAddProductModalOpen(true);
      return;
    }

    // Determine which size to add. If no specific matchedSize, we might need them to pick one, 
    // but for now, if a product has no sizes, we use a default key or just standard update.
    // Let's assume matchedSize exists or fallback to first available size.
    const sizeKeys = Object.keys(product.sizes || {});
    let targetSize = match.matchedSize;
    
    if (!targetSize && sizeKeys.length > 0) {
      // If they scanned the main product barcode, just default to the first size for simplicity in cart,
      // or we can prompt them. Let's use the first size as a fallback.
      targetSize = sizeKeys[0];
    } else if (!targetSize) {
      targetSize = "Default"; // fallback if product literally has no sizes defined yet
    }

    const cartItemId = `${product.id}_${targetSize}`;

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === cartItemId);
      if (existingItemIndex >= 0) {
        // Increment quantity immutably (fixes Strict Mode double-increment bug)
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + 1
        };
        return newCart;
      } else {
        // Add new item to TOP of the cart
        return [{
          id: cartItemId,
          product: product,
          matchedSize: targetSize,
          barcodeScanned: decodedText,
          quantity: 1
        }, ...prevCart];
      }
    });

    playBeep();
    
    // Focus back to manual input
    setTimeout(() => {
      if (manualInputRef.current) manualInputRef.current.focus();
    }, 50);

  }, [getProductByBarcode]);

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

  const updateCartItemQuantity = (cartItemId, newQty) => {
    const qty = Math.max(1, parseInt(newQty) || 1); // minimum 1 in cart
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: qty } : item));
  };

  const removeCartItem = (cartItemId) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  // Helper to commit changes
  const processStock = async (mode) => {
    if (cart.length === 0) return;
    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      // Group cart items by productId
      const groupedByProduct = {};
      cart.forEach(item => {
        if (!groupedByProduct[item.product.id]) {
          groupedByProduct[item.product.id] = [];
        }
        groupedByProduct[item.product.id].push(item);
      });

      // Process each product
      for (const productId of Object.keys(groupedByProduct)) {
        // Get fresh product data from context
        const freshProduct = products.find(p => p.id === productId);
        if (!freshProduct) continue;

        let newSizes = { ...(freshProduct.sizes || {}) };
        const cartItems = groupedByProduct[productId];

        // Apply adjustments
        cartItems.forEach(cartItem => {
          const size = cartItem.matchedSize;
          const currentSizeData = newSizes[size] || {};
          const isOldFormat = typeof currentSizeData === 'number' || typeof currentSizeData === 'string';
          const oldStock = isOldFormat ? Number(currentSizeData) : (currentSizeData?.stock || 0);
          
          let newStock = oldStock;
          if (mode === 'IN') {
            newStock += cartItem.quantity;
          } else if (mode === 'OUT') {
            newStock = Math.max(0, newStock - cartItem.quantity);
          }

          newSizes[size] = isOldFormat ? newStock : { ...currentSizeData, stock: newStock };
        });

        // Calculate new total stock
        const totalStock = Object.values(newSizes).reduce((sum, sizeData) => {
          const stock = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
          return sum + (Number(stock) || 0);
        }, 0);

        // Save to DB
        await updateProductStock(productId, newSizes, totalStock);
      }

      setSaveSuccessMsg(`บันทึกสต็อกเรียบร้อยแล้ว (${mode === 'IN' ? 'รับเข้า' : 'เบิกออก'})`);
      setCart([]); // Clear cart
      
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      if (manualInputRef.current) manualInputRef.current.focus();

    } catch (err) {
      console.error('Failed to process stock', err);
      alert('เกิดข้อผิดพลาดในการบันทึกสต็อก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProductSubmit = async (data) => {
    await addProduct(data);
    setIsAddProductModalOpen(false);
    // Re-scan it so it gets added to cart
    handleScanSuccess(newProductBarcode);
  };

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

      {saveSuccessMsg && (
        <div style={{ padding: '16px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Check size={20} /> {saveSuccessMsg}
        </div>
      )}

      {/* Cart View */}
      {cart.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '2px solid var(--primary)',
          boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <ShoppingCart size={24} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>รายการสินค้าที่สแกน ({cart.length} รายการ)</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.125rem', color: 'var(--text-primary)' }}>{item.product.name}</h3>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <span>ไซส์: <strong style={{ color: 'var(--text-primary)' }}>{item.matchedSize}</strong></span>
                      <span>|</span>
                      <span>บาร์โค้ด: {item.barcodeScanned}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                      style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      <Minus size={16} />
                    </button>
                    
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCartItemQuantity(item.id, e.target.value)}
                      style={{ 
                        width: '80px', 
                        textAlign: 'center', 
                        fontSize: '1.25rem', 
                        fontWeight: 700,
                        padding: '8px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--primary)',
                        backgroundColor: 'white'
                      }}
                      min="1"
                    />
                    
                    <button
                      type="button"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      style={{ padding: '8px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', cursor: 'pointer' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeCartItem(item.id)}
                    style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    title="ลบรายการนี้"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              ตรวจสอบรายการด้านบนให้ครบถ้วน จากนั้นเลือกดำเนินการ:
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => processStock('IN')}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: 'var(--success)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                }}
              >
                <ArrowDownToLine size={24} />
                {isSaving ? 'กำลังบันทึก...' : 'รับเข้าสต็อก (บวกเพิ่ม)'}
              </button>
              
              <button
                onClick={() => processStock('OUT')}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)'
                }}
              >
                <ArrowUpFromLine size={24} />
                {isSaving ? 'กำลังบันทึก...' : 'เบิกออก (ตัดสต็อก)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal (triggered from scanning new barcode) */}
      <Modal 
        isOpen={isAddProductModalOpen} 
        onClose={() => setIsAddProductModalOpen(false)} 
        title="ไม่พบสินค้า - เพิ่มสินค้าใหม่"
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
