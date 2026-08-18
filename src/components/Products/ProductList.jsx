import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Box, Printer } from 'lucide-react';
import { formatCurrency } from '../../utils/formatter';
import { Badge } from '../common/Badge';
import { useAppContext } from '../../context/AppContext';

export function ProductList({ products, onEdit, onDelete, onPrint }) {
  const { settings } = useAppContext();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  if (!products || products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        ไม่พบสินค้า
      </div>
    );
  }

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStockStatus = (product) => {
    const threshold = product.threshold || settings.globalThreshold;
    const currentStock = product.totalStock !== undefined ? product.totalStock : 
                         (product.total_stock !== undefined ? product.total_stock : 
                         (product.sizes ? Object.values(product.sizes).reduce((sum, d) => sum + (Number(typeof d === 'object' ? d?.stock : d) || 0), 0) : 0));
                         
    if (currentStock === 0) return { label: 'หมด', type: 'danger' };
    if (currentStock <= threshold) return { label: 'ใกล้หมด', type: 'warning' };
    return { label: 'ปกติ', type: 'success' };
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ชื่อสินค้า</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>หมวดหมู่</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>สต็อกรวม</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>สถานะ</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'right' }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {paginatedProducts.map(product => {
            const status = getStockStatus(product);
            return (
              <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--primary)'
                    }}>
                      <Box size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {product.product_code ? `รหัส: ${product.product_code}` : (product.barcode || '')}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{product.category}</td>
                <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{
                  product.totalStock || product.total_stock || (product.sizes ? Object.values(product.sizes).reduce((sum, d) => sum + (Number(typeof d === 'object' ? d?.stock : d) || 0), 0) : 0)
                }</td>
                <td style={{ padding: '16px' }}>
                  <Badge type={status.type}>{status.label}</Badge>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => onPrint && onPrint(product)}
                      style={{ padding: '6px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}
                      title="ปรินต์บาร์โค้ด"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(product)}
                      style={{ padding: '6px', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}
                      title="แก้ไข"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      style={{ padding: '6px', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}
                      title="ลบ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, products.length)} จากทั้งหมด {products.length} รายการ
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: currentPage === 1 ? 'var(--bg-surface)' : 'var(--bg-main)',
                color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ก่อนหน้า
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const page = idx + 1;
                // Simple pagination logic to show max 5 buttons (always first, last, and around current)
                if (
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: currentPage === page ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: currentPage === page ? 'var(--primary)' : 'var(--bg-main)',
                        color: currentPage === page ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: currentPage === page ? 600 : 400
                      }}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 || 
                  page === currentPage + 2
                ) {
                  return <span key={page} style={{ padding: '0 4px', color: 'var(--text-secondary)' }}>...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: currentPage === totalPages ? 'var(--bg-surface)' : 'var(--bg-main)',
                color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
