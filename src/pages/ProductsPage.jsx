import React, { useState } from 'react';
import { Plus, Search, Filter, Printer } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductList } from '../components/Products/ProductList';
import { ProductForm } from '../components/Products/ProductForm';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { BarcodeGenerator } from '../components/Barcode/BarcodeGenerator';
import { PrintMasterSheetModal } from '../components/Products/PrintMasterSheetModal';

export function ProductsPage() {
  const { products, isLoadingProducts, addProduct, updateProduct, deleteProduct, filterProducts } = useProducts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productToPrint, setProductToPrint] = useState(null);
  const [isPrintMasterOpen, setIsPrintMasterOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    category: 'all'
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

  const handleSubmit = (data) => {
    if (editingProduct && editingProduct.id) {
      updateProduct(editingProduct.id, data);
    } else {
      addProduct(data);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setProductToDelete(product);
    }
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>จัดการสินค้า</h1>
        
        <div style={{ display: 'flex', gap: '12px' }}>
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

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า..."
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
          <p className="no-print" style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            ระบบจะจัดเรียงรูปบาร์โค้ดของทุกไซส์สำหรับสินค้านี้ คุณสามารถกดสั่งปรินต์ลงกระดาษ A4 ได้ทันที
          </p>

          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }} className="no-print">
            {productToPrint && productToPrint.sizes && Object.keys(productToPrint.sizes).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.entries(productToPrint.sizes).map(([size, data]) => (
                  <div key={size} style={{ padding: '16px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ margin: '0 0 12px 0' }}>ไซส์: {size}</h4>
                    <BarcodeGenerator value={typeof data === 'object' ? data.barcode : ''} />
                  </div>
                ))}
              </div>
            ) : (
              <p>ไม่มีบาร์โค้ดของไซส์ใดๆ สำหรับสินค้านี้</p>
            )}
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
            <button
              onClick={() => setProductToPrint(null)}
              style={{ padding: '10px 24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={() => window.print()}
              disabled={!productToPrint || !productToPrint.sizes || Object.keys(productToPrint.sizes).length === 0}
              style={{ padding: '10px 24px', backgroundColor: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, color: '#fff', opacity: (!productToPrint || !productToPrint.sizes || Object.keys(productToPrint.sizes).length === 0) ? 0.5 : 1 }}
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
    </div>
  );
}
