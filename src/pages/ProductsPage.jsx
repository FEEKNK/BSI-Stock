import React, { useState } from 'react';
import { Plus, Search, Filter, Printer, Download, Upload, SlidersHorizontal, Sparkles, AlertCircle, Edit3 } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductList } from '../components/Products/ProductList';
import { ProductForm } from '../components/Products/ProductForm';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { BarcodeGenerator } from '../components/Barcode/BarcodeGenerator';
import { PrintMasterSheetModal } from '../components/Products/PrintMasterSheetModal';
import { ImportProductsModal } from '../components/Products/ImportProductsModal';
import { exportProductsToExcel } from '../utils/excel';
import { generateStructuredBarcode } from '../utils/barcode';
import { useToast } from '../context/ToastContext';

export function ProductsPage() {
  const { products, isLoadingProducts, addProduct, updateProduct, deleteProduct, updateStock, filterProducts, refreshProducts } = useProducts();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productToPrint, setProductToPrint] = useState(null);
  const [isPrintMasterOpen, setIsPrintMasterOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    stockStatus: 'all'
  });

  const filteredProducts = filterProducts(filters);
  
  // Extract unique categories from current products list
  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (data) => {
    if (editingProduct && editingProduct.id) {
      await updateProduct(editingProduct.id, data);
      toast.success('บันทึกการแก้ไขสินค้าสำเร็จ');
    } else {
      await addProduct(data);
      toast.success('เพิ่มสินค้าใหม่สำเร็จ');
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setProductToDelete(product);
    }
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete.id);
      toast.success(`ลบสินค้า "${productToDelete.name}" สำเร็จ`);
      setProductToDelete(null);
    }
  };

  const handleExportExcel = () => {
    const success = exportProductsToExcel(filteredProducts.length > 0 ? filteredProducts : products);
    if (success !== false) {
      toast.success('ส่งออกรายการสินค้าเป็น Excel สำเร็จ');
    } else {
      toast.warning('ไม่มีข้อมูลสินค้าสำหรับส่งออก');
    }
  };

  const inputStyle = {
    padding: '8px 12px 8px 36px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    width: '100%'
  };

  const [isGeneratingBarcodes, setIsGeneratingBarcodes] = useState(false);

  const missingBarcodeSizes = productToPrint?.sizes 
    ? Object.entries(productToPrint.sizes).filter(([_, data]) => {
        const b = typeof data === 'object' ? data?.barcode : productToPrint.barcode;
        return !b || !String(b).trim();
      })
    : [];

  const handleGenerateBarcodeForSize = async (size) => {
    if (!productToPrint) return;
    try {
      setIsGeneratingBarcodes(true);
      const newBarcode = await generateStructuredBarcode(productToPrint.category, productToPrint.product_code || '000', size);
      const currentSizes = { ...productToPrint.sizes };
      const curData = currentSizes[size];
      const updatedData = typeof curData === 'object' ? { ...curData, barcode: newBarcode } : { stock: Number(curData) || 0, barcode: newBarcode };
      const updatedSizes = { ...currentSizes, [size]: updatedData };
      
      const updatedProduct = {
        ...productToPrint,
        sizes: updatedSizes
      };
      
      await updateProduct(productToPrint.id, updatedProduct);
      setProductToPrint(updatedProduct);
      toast.success(`สร้างบาร์โค้ดสำหรับไซส์ ${size} สำเร็จ (${newBarcode})`);
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถสร้างบาร์โค้ดได้');
    } finally {
      setIsGeneratingBarcodes(false);
    }
  };

  const handleGenerateAllMissingBarcodes = async () => {
    if (!productToPrint || missingBarcodeSizes.length === 0) return;
    try {
      setIsGeneratingBarcodes(true);
      const updatedSizes = { ...productToPrint.sizes };
      for (const [size, data] of missingBarcodeSizes) {
        const newBarcode = await generateStructuredBarcode(productToPrint.category, productToPrint.product_code || '000', size);
        const curData = updatedSizes[size];
        updatedSizes[size] = typeof curData === 'object' ? { ...curData, barcode: newBarcode } : { stock: Number(curData) || 0, barcode: newBarcode };
      }
      const updatedProduct = {
        ...productToPrint,
        sizes: updatedSizes
      };
      await updateProduct(productToPrint.id, updatedProduct);
      setProductToPrint(updatedProduct);
      toast.success(`สร้างบาร์โค้ดสำเร็จ ${missingBarcodeSizes.length} ไซส์`);
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถสร้างบาร์โค้ดได้');
    } finally {
      setIsGeneratingBarcodes(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>จัดการสินค้า</h1>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
            title="นำเข้าข้อมูลสินค้าจากไฟล์ Excel (.xlsx)"
          >
            <Upload size={18} /> Import Excel
          </button>

          <button
            onClick={handleExportExcel}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid #10b981',
              color: '#10b981',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
            title="ดาวน์โหลดรายการสินค้าเป็นไฟล์ Excel (.xlsx)"
          >
            <Download size={18} /> Export Excel
          </button>

          <button
            onClick={() => setIsPrintMasterOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              backgroundColor: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              color: 'var(--warning)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Printer size={18} /> พิมพ์แผ่นบาร์โค้ด
          </button>

          <button
            onClick={() => handleOpenModal()}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={20} /> เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า, รหัสสินค้า, หรือบาร์โค้ด..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ position: 'relative', width: '200px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            style={{ ...inputStyle, paddingLeft: '36px', appearance: 'none', cursor: 'pointer' }}
          >
            <option value="all">ทุกหมวดหมู่</option>
            {existingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div style={{ position: 'relative', width: '220px' }}>
          <SlidersHorizontal size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <select
            value={filters.stockStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
            style={{ ...inputStyle, paddingLeft: '36px', appearance: 'none', cursor: 'pointer' }}
          >
            <option value="all">สถานะสต็อก: ทั้งหมด</option>
            <option value="out_of_stock">🔴 มีไซส์หมดสต็อก</option>
            <option value="low_stock">🟡 มีไซส์ใกล้หมด</option>
            <option value="normal">🟢 สต็อกปกติทั้งหมด</option>
          </select>
        </div>
      </div>

      {isLoadingProducts ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          กำลังโหลดข้อมูลสินค้า...
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="ยังไม่มีสินค้าในคลัง"
          description="เริ่มต้นจัดการคลังสินค้าของคุณโดยการเพิ่มสินค้าชิ้นแรก"
          action={
            <button
              onClick={() => handleOpenModal()}
              style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
            >
              เพิ่มสินค้าเลย
            </button>
          }
        />
      ) : (
        <ProductList
          products={filteredProducts}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
          onPrint={(p) => setProductToPrint(p)}
        />
      )}

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct && editingProduct.id ? 'แก้ไขสินค้า / ปรับสต็อก' : 'เพิ่มสินค้าใหม่'}
      >
        <ProductForm
          initialData={editingProduct}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        title="ยืนยันการลบสินค้า"
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ margin: '0 0 24px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
            คุณแน่ใจหรือไม่ที่จะลบสินค้า <strong>{productToDelete?.name}</strong>?
            <br/>
            <span style={{ fontSize: '0.875rem', color: 'var(--danger)', display: 'block', marginTop: '8px' }}>
              การกระทำนี้ไม่สามารถกู้คืนได้
            </span>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setProductToDelete(null)}
              style={{
                padding: '10px 24px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}
            >
              ยกเลิก
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: '10px 24px',
                backgroundColor: 'var(--danger)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                color: '#fff'
              }}
            >
              ลบทิ้ง
            </button>
          </div>
        </div>
      </Modal>

      {/* Print Barcodes Modal */}
      <Modal
        isOpen={!!productToPrint}
        onClose={() => setProductToPrint(null)}
        title={`ปรินต์บาร์โค้ด - ${productToPrint?.name}`}
      >
        <div style={{ textAlign: 'center' }}>
          <p className="no-print" style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            ระบบจะจัดเรียงรูปบาร์โค้ดของทุกไซส์สำหรับสินค้านี้ คุณสามารถกดสั่งปรินต์ลงกระดาษ A4 ได้ทันที
          </p>

          {/* Warning banner if some sizes lack barcodes */}
          {missingBarcodeSizes.length > 0 && (
            <div className="no-print" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#fffbeb',
              border: '1px solid #f59e0b',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              textAlign: 'left',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>
                  มี {missingBarcodeSizes.length} ไซส์ที่ยังไม่มีรหัสบาร์โค้ด
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateAllMissingBarcodes}
                disabled={isGeneratingBarcodes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  backgroundColor: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: isGeneratingBarcodes ? 'wait' : 'pointer'
                }}
              >
                <Sparkles size={14} />
                {isGeneratingBarcodes ? 'กำลังสร้าง...' : 'สร้างบาร์โค้ดให้ครบทั้งหมด'}
              </button>
            </div>
          )}

          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }} className="no-print">
            {productToPrint && productToPrint.sizes && Object.keys(productToPrint.sizes).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.entries(productToPrint.sizes).map(([size, data]) => {
                  const barcode = typeof data === 'object' ? data?.barcode : (productToPrint.barcode || '');
                  const hasBarcode = Boolean(barcode && String(barcode).trim());

                  return (
                    <div key={size} style={{ padding: '16px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>ไซส์: {size}</h4>
                      {hasBarcode ? (
                        <BarcodeGenerator value={barcode} />
                      ) : (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '16px',
                          backgroundColor: 'var(--bg-main)',
                          border: '1px dashed var(--border)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            ⚠️ ยังไม่ได้กำหนดรหัสบาร์โค้ดสำหรับไซส์นี้
                          </span>
                          <button
                            type="button"
                            onClick={() => handleGenerateBarcodeForSize(size)}
                            disabled={isGeneratingBarcodes}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              backgroundColor: 'var(--primary)',
                              color: '#fff',
                              borderRadius: 'var(--radius-sm)',
                              border: 'none',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: isGeneratingBarcodes ? 'wait' : 'pointer'
                            }}
                          >
                            <Sparkles size={14} />
                            {isGeneratingBarcodes ? 'กำลังสร้าง...' : 'สร้างบาร์โค้ดอัตโนมัติ'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>ไม่มีบาร์โค้ดของไซส์ใดๆ สำหรับสินค้านี้</p>
            )}
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
            <button
              onClick={() => setProductToPrint(null)}
              style={{ padding: '10px 24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={() => window.print()}
              disabled={!productToPrint || !productToPrint.sizes || Object.keys(productToPrint.sizes).length === 0}
              style={{ padding: '10px 24px', backgroundColor: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, color: '#fff', opacity: (!productToPrint || !productToPrint.sizes || Object.keys(productToPrint.sizes).length === 0) ? 0.5 : 1, cursor: 'pointer' }}
            >
              สั่งปรินต์
            </button>
          </div>
        </div>
      </Modal>
      </div>

      {/* Hidden Print Area for Individual Product */}
      <div id="print-area" style={{ display: 'none' }}>
        {productToPrint && (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>บาร์โค้ดสินค้า: {productToPrint.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
              {Object.entries(productToPrint.sizes || {}).map(([size, data]) => {
                const barcode = typeof data === 'object' ? data.barcode : '';
                if (!barcode) return null;
                return (
                  <div key={size} style={{ textAlign: 'center', breakInside: 'avoid', border: '1px dashed #ccc', padding: '10px', minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>{productToPrint.name} - ไซส์ {size}</h4>
                    <BarcodeGenerator value={barcode} hideWrapper={true} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Master Barcode Sheet Modal */}
      <PrintMasterSheetModal
        isOpen={isPrintMasterOpen}
        onClose={() => setIsPrintMasterOpen(false)}
        products={products}
      />

      {/* Import Products from Excel Modal */}
      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={refreshProducts}
      />
    </div>
  );
}
