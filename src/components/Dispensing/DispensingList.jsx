import React, { useState } from 'react';
import { Edit2, Trash2, Calendar, Clock, User, Package, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export function DispensingList({ history, onEdit, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        ไม่พบประวัติการทำรายการ
      </div>
    );
  }

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDateTime = (record) => {
    const rawDate = record.dispensed_date || record.created_at;
    if (!rawDate) return { dateStr: '-', timeStr: '' };

    let dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime()) && record.created_at) {
      dateObj = new Date(record.created_at);
    }
    if (isNaN(dateObj.getTime())) return { dateStr: '-', timeStr: '' };

    const dateStr = dateObj.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    // Check time
    let timeObj = dateObj;
    if (record.created_at) {
      const createdObj = new Date(record.created_at);
      if (!isNaN(createdObj.getTime())) {
        timeObj = createdObj;
      }
    }

    const timeStr = timeObj.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return { dateStr, timeStr };
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>วัน/เวลาทำรายการ</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ประเภท</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>HN</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>สินค้า</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ไซส์</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>จำนวน</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ผู้เบิก/หมายเหตุ</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHistory.map(record => {
              const { dateStr, timeStr } = formatDateTime(record);
              return (
                <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                        <Calendar size={15} style={{ color: 'var(--primary)' }} />
                        <span>{dateStr}</span>
                      </div>
                      {timeStr && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-tertiary)', paddingLeft: '21px' }}>
                          <Clock size={12} />
                          <span>{timeStr} น.</span>
                        </div>
                      )}
                    </div>
                  </td>
                <td style={{ padding: '16px' }}>
                  {record.type === 'IN' ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--success-bg)', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
                      <ArrowDownToLine size={12} /> รับเข้า
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                      <ArrowUpFromLine size={12} /> เบิกออก
                    </div>
                  )}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--primary)' }}>{record.hn || '-'}</div>
                </td>
                <td style={{ padding: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} style={{ color: 'var(--text-tertiary)' }} />
                    {record.product_name}
                  </div>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{record.size}</td>
                <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{record.quantity}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {record.seller ? <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} style={{ color: 'var(--text-tertiary)' }}/>{record.seller}</div> : '-'}
                  </div>
                  {record.note && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.note}>
                      {record.note}
                    </div>
                  )}
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => onEdit(record)}
                      style={{ padding: '6px', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
                      title="แก้ไข"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(record.id)}
                      style={{ padding: '6px', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
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
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, history.length)} จากทั้งหมด {history.length} รายการ
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
