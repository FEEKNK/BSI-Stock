import React, { useState, useRef, useCallback } from 'react';
import { BarcodeScanner } from '../components/Barcode/BarcodeScanner';
import { useProducts } from '../hooks/useProducts';
import { Modal } from '../components/common/Modal';
import { ProductForm } from '../components/Products/ProductForm';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Plus, Minus, Check, Box, ShoppingCart, Trash2, ArrowDownToLine, ArrowUpFromLine, RefreshCcw } from 'lucide-react';

export function BarcodePage() {
  const { products, getProductByBarcode, addProduct } = useProducts();
  const { refreshProducts } = useAppContext();
  const { toast } = useToast();
  
  const [mode, setMode] = useState(null); // 'IN' | 'OUT' | null
  
  const today = new Date().toISOString().split('T')[0];
  const [sharedData, setSharedData] = useState({
    dispensed_date: today,
    hn: '',
    seller: '',
    note: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const [cart, setCart] = useState([]);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  
  const manualInputRef = useRef(null);

  const getItemAvailableStock = (product, size) => {
    if (!product || !product.sizes) return 0;
    const sizeData = product.sizes[size];
    if (sizeData === undefined || sizeData === null) return 0;
    return typeof sizeData === 'object' ? Number(sizeData.stock) || 0 : Number(sizeData) || 0;
  };

  const showWarning = (msg) => {
    toast.warning(msg);
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(2200, audioCtx.currentTime); 
      
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
      setNewProductBarcode(decodedText);
      setIsAddProductModalOpen(true);
      return;
    }

    const sizeKeys = Object.keys(product.sizes || {});
    let targetSize = match.matchedSize;
    
    if (!targetSize && sizeKeys.length > 0) {
      targetSize = sizeKeys[0];
    } else if (!targetSize) {
      targetSize = "Default";
    }

    const cartItemId = `${product.id}_${targetSize}`;
    const availableStock = getItemAvailableStock(product, targetSize);

    // Stock check for OUT mode
    if (mode === 'OUT') {
      if (availableStock <= 0) {
        showWarning(`สินค้า "${product.name}" ไซส์ ${targetSize} หมดสต็อก (คงเหลือ 0 ชิ้น)`);
        return;
      }
    }

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === cartItemId);
      if (existingItemIndex >= 0) {
        const currentQty = prevCart[existingItemIndex].quantity;
        if (mode === 'OUT' && currentQty + 1 > availableStock) {
          showWarning(`สินค้า "${product.name}" ไซส์ ${targetSize} สต็อกคงเหลือมีเพียง ${availableStock} ชิ้น (ในตะกร้ามีแล้ว ${currentQty} ชิ้น)`);
          return prevCart;
        }

        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: currentQty + 1
        };
        return newCart;
      } else {
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
    
    setTimeout(() => {
      if (manualInputRef.current) manualInputRef.current.focus();
    }, 50);

  }, [getProductByBarcode, mode]);

  const handleScanError = (error) => {};

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScanSuccess(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const updateCartItemQuantity = (cartItemId, newQty) => {
    const item = cart.find(i => i.id === cartItemId);
    if (!item) return;

    let qty = Math.max(1, parseInt(newQty) || 1);
    if (mode === 'OUT') {
      const availableStock = getItemAvailableStock(item.product, item.matchedSize);
      if (qty > availableStock) {
        qty = Math.max(1, availableStock);
        showWarning(`สินค้า "${item.product.name}" ไซส์ ${item.matchedSize} มีสต็อกคงเหลือเพียง ${availableStock} ชิ้น`);
      }
    }
    setCart(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity: qty } : i));
  };

  const removeCartItem = (cartItemId) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const processBulkDispense = async () => {
    if (cart.length === 0) return;

    const errs = {};
    if (!sharedData.dispensed_date) {
      errs.dispensed_date = 'กรุณาระบุวันที่';
    }
    if (mode === 'OUT' && (!sharedData.hn || !sharedData.hn.trim())) {
      errs.hn = 'กรุณาระบุรหัส HN คนไข้';
    }
    if (!sharedData.seller || !sharedData.seller.trim()) {
      errs.seller = 'กรุณาระบุชื่อผู้ทำรายการ';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      toast.warning(Object.values(errs)[0]);
      return;
    }

    // Validate stock before sending in OUT mode
    if (mode === 'OUT') {
      for (const item of cart) {
        const availableStock = getItemAvailableStock(item.product, item.matchedSize);
        if (item.quantity > availableStock) {
          toast.error(`สินค้า "${item.product.name}" ไซส์ ${item.matchedSize} มีสต็อกคงเหลือเพียง ${availableStock} ชิ้น แต่มียอดเบิก ${item.quantity} ชิ้น`);
          return;
        }
      }
    }

    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        size: item.matchedSize,
        quantity: item.quantity
      }));

      const res = await fetch('/api/dispensing-history/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          ...sharedData,
          items
        })
      });

      if (res.ok) {
        toast.success(`บันทึก${mode === 'IN' ? 'รับเข้า' : 'เบิกออก'}สำเร็จแล้ว (${cart.length} รายการ)`);
        setCart([]);
        setSharedData(prev => ({ ...prev, hn: '', seller: '', note: '' }));
        setFormErrors({});
        refreshProducts();
        
        if (manualInputRef.current) manualInputRef.current.focus();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error('Failed to process bulk dispense', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProductSubmit = async (data) => {
    await addProduct(data);
    setIsAddProductModalOpen(false);
    handleScanSuccess(newProductBarcode);
  };

  const sharedInputStyle = {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-primary)',
    width: '100%',
    fontSize: '0.875rem'
  };

  if (!mode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '32px', paddingTop: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>ทำรายการสินค้าคงคลัง</h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', margin: 0 }}>กรุณาเลือกรูปแบบรายการเพื่อเริ่มการสแกนบาร์โค้ด</p>
        </div>

        <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '600px' }}>
          <button
            onClick={() => setMode('IN')}
            style={{
              flex: 1, padding: '40px 20px', borderRadius: 'var(--radius-lg)', border: '2px solid var(--success)',
              backgroundColor: 'var(--success-bg)', color: 'var(--success)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)', transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <ArrowDownToLine size={48} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>รับสินค้าเข้า</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '4px' }}>(เพิ่มสต็อก)</div>
            </div>
          </button>
          
          <button
            onClick={() => setMode('OUT')}
            style={{
              flex: 1, padding: '40px 20px', borderRadius: 'var(--radius-lg)', border: '2px solid var(--danger)',
              backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)', transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <ArrowUpFromLine size={48} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>เบิกสินค้าออก</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '4px' }}>(ตัดสต็อก / จ่ายให้คนไข้)</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', paddingBottom: '100px' }}>
      
      {/* LEFT COLUMN: Scanner */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', color: 'white',
              backgroundColor: mode === 'IN' ? 'var(--success)' : 'var(--danger)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              {mode === 'IN' ? <ArrowDownToLine size={16}/> : <ArrowUpFromLine size={16}/>}
              โหมด{mode === 'IN' ? 'รับเข้า' : 'เบิกออก'}
            </span>
            สแกนสินค้า
          </h1>
          <button 
            onClick={() => { setCart([]); setMode(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
          >
            <RefreshCcw size={14} /> เปลี่ยนโหมด
          </button>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ padding: '24px' }}>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input
                ref={manualInputRef}
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="สแกนหรือพิมพ์บาร์โค้ดที่นี่ แล้วกด Enter..."
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '2px solid var(--primary)',
                  fontSize: '1.125rem', fontFamily: 'monospace', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)'
                }}
                autoFocus
              />
              <button
                type="submit"
                style={{
                  padding: '0 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none',
                  borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer'
                }}
              >
                เพิ่ม
              </button>
            </form>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-surface)', padding: '0 12px', color: 'var(--text-tertiary)', fontSize: '0.875rem', zIndex: 1 }}>
                หรือใช้กล้อง
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 24px 0' }}></div>
              <BarcodeScanner elementId="page-barcode-scanner" onScan={handleScanSuccess} onError={handleScanError} />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Cart & Checkout */}
      <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Cart Shared Info */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '20px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>ข้อมูลรายการ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                วันที่ <span style={{color: 'var(--danger)'}}>*</span>
              </label>
              <input 
                type="date" 
                value={sharedData.dispensed_date} 
                onChange={e => {
                  setSharedData(p => ({...p, dispensed_date: e.target.value}));
                  if (formErrors.dispensed_date) setFormErrors(p => ({...p, dispensed_date: null}));
                }} 
                style={{
                  ...sharedInputStyle,
                  borderColor: formErrors.dispensed_date ? 'var(--danger)' : 'var(--border)'
                }} 
              />
              {formErrors.dispensed_date && (
                <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                  {formErrors.dispensed_date}
                </span>
              )}
            </div>
            {mode === 'OUT' && (
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  HN คนไข้ <span style={{color: 'var(--danger)'}}>*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="รหัสคนไข้" 
                  value={sharedData.hn} 
                  onChange={e => {
                    setSharedData(p => ({...p, hn: e.target.value}));
                    if (formErrors.hn) setFormErrors(p => ({...p, hn: null}));
                  }} 
                  style={{
                    ...sharedInputStyle,
                    borderColor: formErrors.hn ? 'var(--danger)' : 'var(--border)'
                  }} 
                />
                {formErrors.hn && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                    {formErrors.hn}
                  </span>
                )}
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                ผู้ทำรายการ <span style={{color: 'var(--danger)'}}>*</span>
              </label>
              <input 
                type="text" 
                placeholder="ชื่อพนักงาน" 
                value={sharedData.seller} 
                onChange={e => {
                  setSharedData(p => ({...p, seller: e.target.value}));
                  if (formErrors.seller) setFormErrors(p => ({...p, seller: null}));
                }} 
                style={{
                  ...sharedInputStyle,
                  borderColor: formErrors.seller ? 'var(--danger)' : 'var(--border)'
                }} 
              />
              {formErrors.seller && (
                <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                  {formErrors.seller}
                </span>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>หมายเหตุ</label>
              <textarea placeholder="รายละเอียดเพิ่มเติม" value={sharedData.note} onChange={e => setSharedData(p => ({...p, note: e.target.value}))} style={{...sharedInputStyle, minHeight: '60px', resize: 'vertical'}} />
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--primary)', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
            <ShoppingCart size={20} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)', fontWeight: 700 }}>ตะกร้าสินค้า ({cart.length})</h2>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                ยังไม่มีสินค้าในตะกร้า<br/><span style={{ fontSize: '0.875rem' }}>สแกนบาร์โค้ดเพื่อเพิ่มรายการ</span>
              </div>
            ) : cart.map((item) => {
              const availableStock = getItemAvailableStock(item.product, item.matchedSize);
              const isOverStock = mode === 'OUT' && item.quantity > availableStock;
              const isAtMaxStock = mode === 'OUT' && item.quantity >= availableStock;

              return (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '12px', 
                    backgroundColor: isOverStock ? 'var(--danger-bg)' : 'var(--bg-main)', 
                    border: `1px solid ${isOverStock ? 'var(--danger)' : 'var(--border)'}`, 
                    borderRadius: 'var(--radius-md)' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.product.name}</div>
                    <button onClick={() => removeCartItem(item.id)} style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', marginTop: '-4px', marginRight: '-4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px 0' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      ไซส์: <strong style={{ color: 'var(--text-primary)' }}>{item.matchedSize}</strong>
                    </div>
                    {mode === 'OUT' && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: availableStock > 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: availableStock > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {availableStock > 0 ? `สต็อก: ${availableStock}` : 'หมดสต็อก'}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)} 
                        style={{ padding: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateCartItemQuantity(item.id, e.target.value)}
                        style={{ 
                          width: '60px', 
                          textAlign: 'center', 
                          fontSize: '1rem', 
                          fontWeight: 600, 
                          padding: '4px', 
                          border: `1px solid ${isOverStock ? 'var(--danger)' : 'var(--border)'}`, 
                          borderRadius: 'var(--radius-sm)', 
                          color: isOverStock ? 'var(--danger)' : 'var(--primary)', 
                          backgroundColor: 'white' 
                        }}
                        min="1"
                        max={mode === 'OUT' ? availableStock : undefined}
                      />
                      <button 
                        type="button" 
                        onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)} 
                        disabled={isAtMaxStock}
                        style={{ 
                          padding: '6px', 
                          backgroundColor: isAtMaxStock ? 'var(--bg-surface)' : 'var(--primary-light)', 
                          border: `1px solid ${isAtMaxStock ? 'var(--border)' : 'var(--primary)'}`, 
                          borderRadius: 'var(--radius-sm)', 
                          color: isAtMaxStock ? 'var(--text-tertiary)' : 'var(--primary)', 
                          cursor: isAtMaxStock ? 'not-allowed' : 'pointer',
                          opacity: isAtMaxStock ? 0.6 : 1
                        }}
                        title={isAtMaxStock ? 'ถึงจำนวนสต็อกคงเหลือสูงสุดแล้ว' : 'เพิ่มจำนวน'}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {isOverStock && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                        เกินสต็อกคงเหลือ!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
            <button
              onClick={processBulkDispense}
              disabled={isSaving || cart.length === 0}
              style={{
                width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '1.125rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none',
                backgroundColor: cart.length === 0 ? 'var(--border)' : (mode === 'IN' ? 'var(--success)' : 'var(--danger)'),
                color: cart.length === 0 ? 'var(--text-tertiary)' : 'white',
                cursor: isSaving || cart.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: cart.length > 0 ? `0 4px 12px ${mode === 'IN' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` : 'none'
              }}
            >
              {isSaving ? 'กำลังบันทึก...' : `บันทึก${mode === 'IN' ? 'รับเข้า' : 'เบิกออก'}`}
            </button>
          </div>
        </div>

        {warningMsg && (
          <div style={{ padding: '14px 16px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ {warningMsg}
          </div>
        )}

        {saveSuccessMsg && (
          <div style={{ padding: '16px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Check size={20} /> {saveSuccessMsg}
          </div>
        )}
      </div>

      <Modal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} title="ไม่พบสินค้า - เพิ่มสินค้าใหม่">
        <ProductForm 
          initialData={{ barcode: newProductBarcode }}
          onSubmit={handleAddProductSubmit}
          onCancel={() => setIsAddProductModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
