import React from 'react';

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
    }}>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        แสดง {startItem} ถึง {endItem} จากทั้งหมด {totalItems} รายการ
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            backgroundColor: currentPage === 1 ? 'var(--bg-surface)' : 'var(--bg-main)',
            color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 500
          }}
        >
          ก่อนหน้า
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {Array.from({ length: totalPages }).map((_, idx) => {
            const page = idx + 1;
            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: currentPage === page ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: currentPage === page ? 'var(--primary)' : 'var(--bg-main)',
                    color: currentPage === page ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: currentPage === page ? 600 : 400
                  }}
                >
                  {page}
                </button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} style={{ padding: '0 2px', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            backgroundColor: currentPage === totalPages ? 'var(--bg-surface)' : 'var(--bg-main)',
            color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 500
          }}
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
}
