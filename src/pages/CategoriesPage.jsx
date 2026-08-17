import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, X, Tags, Search, Package } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { ReferenceTable } from '../components/common/ReferenceTable';

export function CategoriesPage() {
  const { products, savedCategories, addSavedCategory, removeSavedCategory } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Calculate usage count for each category
  const categoryUsage = {};
  products.forEach(p => {
    if (p.category) {
      categoryUsage[p.category] = (categoryUsage[p.category] || 0) + 1;
    }
  });

  // Combine saved and used categories for display
  const allCategories = Array.from(
    new Set([...savedCategories, ...Object.keys(categoryUsage)])
  );

  const filteredCategories = allCategories.filter(cat => 
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort();

  const handleAddCategory = (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      addSavedCategory(trimmed);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (cat) => {
    if (categoryUsage[cat] > 0) {
      if (!window.confirm(`หมวดหมู่ "${cat}" มีสินค้าใช้งานอยู่ ${categoryUsage[cat]} รายการ คุณแน่ใจหรือไม่ที่จะลบออกจากรายการที่บันทึกไว้? (จะไม่กระทบกับสินค้าที่มีอยู่)`)) {
        return;
      }
    }
    removeSavedCategory(cat);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>จัดการหมวดหมู่สินค้า</h1>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Col: Add & Search */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Add Category Box */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', color: 'var(--text-primary)' }}>เพิ่มหมวดหมู่ใหม่</h3>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="เช่น เสื้อยืด, กางเกง, เครื่องใช้ไฟฟ้า..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: newCategoryName.trim() ? 'var(--primary)' : 'var(--bg-main)',
                  color: newCategoryName.trim() ? 'white' : 'var(--text-secondary)',
                  border: newCategoryName.trim() ? 'none' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={18} /> บันทึกหมวดหมู่
              </button>
            </form>
          </div>

          {/* Search Box */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>ค้นหาหมวดหมู่</h3>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Col: Category List */}
        <div style={{ flex: 1 }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)' }}>รายการหมวดหมู่ทั้งหมด</h2>
              <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600 }}>
                {filteredCategories.length} รายการ
              </span>
            </div>
            
            {filteredCategories.length === 0 ? (
              <EmptyState 
                title={searchTerm ? 'ไม่พบหมวดหมู่ที่ค้นหา' : 'ยังไม่มีหมวดหมู่'} 
                description={searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'เพิ่มหมวดหมู่ใหม่ทางด้านซ้ายเพื่อเริ่มต้น'} 
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', padding: '20px' }}>
                {filteredCategories.map(cat => {
                  const isSaved = savedCategories.includes(cat);
                  const usage = categoryUsage[cat] || 0;
                  
                  return (
                    <div 
                      key={cat}
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <Tags size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cat}>
                            {cat}
                          </h4>
                        </div>
                        {isSaved && (
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            style={{
                              backgroundColor: 'transparent',
                              color: 'var(--text-tertiary)',
                              padding: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.backgroundColor = 'var(--danger-bg)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            title="ลบหมวดหมู่นี้ออกจากที่บันทึกไว้"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <Package size={14} />
                        <span>สินค้าในหมวดนี้: <strong>{usage}</strong> รายการ</span>
                      </div>
                      
                      {!isSaved && usage > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          * หมวดหมู่นี้มาจากข้อมูลสินค้า
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Reference Table Section */}
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>อ้างอิงรหัสบาร์โค้ด</h2>
        <ReferenceTable />
      </div>
    </div>
  );
}
