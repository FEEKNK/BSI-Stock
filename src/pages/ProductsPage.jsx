import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductList } from '../components/Products/ProductList';
import { ProductForm } from '../components/Products/ProductForm';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

export function ProductsPage() {
  const { products, isLoadingProducts, addProduct, updateProduct, deleteProduct, filterProducts } = useProducts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
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
    if (editingProduct) {
      updateProduct(editingProduct.id, data);
    } else {
      addProduct(data);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) {
      deleteProduct(id);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>จัดการสินค้า</h1>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600
          }}
        >
          <Plus size={20} /> เพิ่มสินค้าใหม่
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า, บาร์โค้ด..."
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
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
      >
        <ProductForm
          initialData={editingProduct}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
