import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Box, Printer, ChevronDown, ChevronRight, Copy, Check, Barcode as BarcodeIcon, ChevronsUpDown, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatter';
import { Badge } from '../common/Badge';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

export function ProductList({ products, onEdit, onDelete, onPrint }) {
  const { settings } = useAppContext();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  const toggleExpandRow = (productId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedRows.size === paginatedProducts.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(paginatedProducts.map(p => p.id)));
    }
  };

  const handleCopyBarcode = (barcode, sizeName) => {
    if (!barcode || barcode === '-') {
      toast.warning('สินค้านี้ยังไม่มีรหัสบาร์โค้ด');
      return;
    }
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    toast.success(`คัดลอกบาร์โค้ด ${barcode} (${sizeName}) สำเร็จ`);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  if (!products || products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา
      </div>
    );
  }

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getProductStockAnalysis = (product) => {
    const threshold = product.threshold !== undefined && product.threshold !== null && product.threshold !== ''
      ? Number(product.threshold) 
      : (Number(settings?.globalThreshold) || 30);

    const sizeKeys = product.sizes ? Object.keys(product.sizes) : [];
    
    let currentStock = 0;
    const outOfStockSizes = [];
    const lowStockSizes = [];
    const normalSizes = [];
    const allSizeList = [];

    if (sizeKeys.length === 0) {
      currentStock = Number(product.totalStock ?? product.total_stock ?? 0);
      const barcode = product.barcode || product.product_code || '-';
      if (currentStock === 0) {
        return {
          type: 'danger',
          summary: 'หมดสต็อก',
          problemCount: 0,
          allSizeList: [{ size: 'ค่าเริ่มต้น', stock: 0, barcode, status: 'out' }],
          tooltip: `สต็อก ${product.name}: หมดสต็อก (0 ชิ้น)`
        };
      }
      if (currentStock <= threshold) {
        return {
          type: 'warning',
          summary: `ใกล้หมด: ${currentStock} ชิ้น`,
          problemCount: 1,
          allSizeList: [{ size: 'ค่าเริ่มต้น', stock: currentStock, barcode, status: 'low' }],
          tooltip: `สต็อก ${product.name}: เหลือ ${currentStock} ชิ้น (ใกล้หมด)`
        };
      }
      return {
        type: 'success',
        summary: 'ปกติ',
        problemCount: 0,
        allSizeList: [{ size: 'ค่าเริ่มต้น', stock: currentStock, barcode, status: 'normal' }],
        tooltip: `สต็อก ${product.name}: ${currentStock} ชิ้น (ปกติ)`
      };
    }

    sizeKeys.forEach(size => {
      const sizeData = product.sizes[size];
      const stock = sizeData
        ? (typeof sizeData === 'object' ? Number(sizeData?.stock ?? 0) : Number(sizeData))
        : 0;
      const barcode = (typeof sizeData === 'object' ? sizeData.barcode : '') || product.barcode || '-';
      currentStock += stock;

      if (stock === 0) {
        outOfStockSizes.push({ size, stock, barcode });
        allSizeList.push({ size, stock, barcode, status: 'out' });
      } else if (stock <= threshold) {
        lowStockSizes.push({ size, stock, barcode });
        allSizeList.push({ size, stock, barcode, status: 'low' });
      } else {
        normalSizes.push({ size, stock, barcode });
        allSizeList.push({ size, stock, barcode, status: 'normal' });
      }
    });

    const problemCount = outOfStockSizes.length + lowStockSizes.length;

    // Tooltip breakdown
    const tooltipLines = [`สต็อก ${product.name} (รวม ${currentStock} ชิ้น):`];
    allSizeList.forEach(s => {
      const statusDesc = s.stock === 0 ? 'หมดสต็อก' : (s.stock <= threshold ? 'ใกล้หมด' : 'ปกติ');
      tooltipLines.push(`• ไซส์ ${s.size}: ${s.stock} ชิ้น (${statusDesc})`);
    });
    const tooltip = tooltipLines.join('\n');

    if (currentStock === 0) {
      return {
        type: 'danger',
        summary: 'หมดสต็อก',
        problemCount,
        allSizeList,
        tooltip
      };
    }

    if (problemCount === 0) {
      return {
        type: 'success',
        summary: 'ปกติ',
        problemCount: 0,
        allSizeList,
        tooltip
      };
    }

    // 1-2 Problem Sizes: Show concise specific size details
    let summary = '';
    let badgeType = outOfStockSizes.length > 0 ? 'danger' : 'warning';

    if (problemCount === 1) {
      if (outOfStockSizes.length === 1) {
        summary = `⚠️ หมดสต็อก: ไซส์ ${outOfStockSizes[0].size} (0)`;
        badgeType = 'danger';
      } else {
        summary = `⚠️ ใกล้หมด: ไซส์ ${lowStockSizes[0].size} (${lowStockSizes[0].stock})`;
        badgeType = 'warning';
      }
    } else if (problemCount === 2) {
      const parts = [];
      if (outOfStockSizes.length > 0) {
        parts.push(`หมด: ${outOfStockSizes.map(s => s.size).join(',')}`);
      }
      if (lowStockSizes.length > 0) {
        parts.push(`ใกล้หมด: ${lowStockSizes.map(s => `${s.size}(${s.stock})`).join(', ')}`);
      }
      summary = `⚠️ ${parts.join(' | ')}`;
      badgeType = outOfStockSizes.length > 0 ? 'danger' : 'warning';
    } else {
      // 3 or more problem sizes: Show clean summary count
      if (outOfStockSizes.length > 0 && lowStockSizes.length > 0) {
        summary = `⚠️ ${outOfStockSizes.length} ไซส์หมด, ${lowStockSizes.length} ไซส์ใกล้หมด`;
      } else if (outOfStockSizes.length > 0) {
        summary = `⚠️ หมดสต็อก ${outOfStockSizes.length} ไซส์`;
      } else {
        summary = `⚠️ ใกล้หมด ${lowStockSizes.length} ไซส์`;
      }
      badgeType = outOfStockSizes.length > 0 ? 'danger' : 'warning';
    }

    return {
      type: badgeType,
      summary,
      problemCount,
      allSizeList,
      tooltip
    };
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
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', width: '48px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={toggleExpandAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={expandedRows.size === paginatedProducts.length ? 'ยุบสต็อกแยกไซส์ทั้งหมด' : 'ขยายดูสต็อกแยกไซส์ทั้งหมด'}
              >
                <ChevronsUpDown size={18} />
              </button>
            </th>
            <th style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ชื่อสินค้า</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>หมวดหมู่</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>สต็อกรวม</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', minWidth: '220px' }}>สถานะ</th>
            <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'right' }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {paginatedProducts.map(product => {
            const status = getProductStockAnalysis(product);
            const isExpanded = expandedRows.has(product.id);
            const totalStock = product.totalStock || product.total_stock || (product.sizes ? Object.values(product.sizes).reduce((sum, d) => sum + (Number(typeof d === 'object' ? d?.stock : d) || 0), 0) : 0);

            return (
              <React.Fragment key={product.id}>
                <tr 
                  style={{ 
                    borderBottom: isExpanded ? '1px dashed var(--border)' : '1px solid var(--border)',
                    backgroundColor: isExpanded ? 'rgba(0, 45, 116, 0.02)' : 'transparent',
                    transition: 'background-color 0.15s'
                  }}
                >
                  {/* Expand Toggle Column */}
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleExpandRow(product.id)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        backgroundColor: isExpanded ? 'var(--primary)' : 'var(--bg-main)',
                        color: isExpanded ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      title={isExpanded ? 'ซ่อนสต็อกแยกไซส์' : 'คลิกเพื่อดูสต็อกแยกไซส์และบาร์โค้ด'}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>

                  {/* Product Name Column */}
                  <td style={{ padding: '16px 8px' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      onClick={() => toggleExpandRow(product.id)}
                    >
                      <div style={{
                        width: '40px', height: '40px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isExpanded ? 'var(--primary)' : 'var(--primary-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isExpanded ? '#ffffff' : 'var(--primary)',
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                      }}>
                        <Box size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{product.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
                            {isExpanded ? '▲ ซ่อนไซส์' : '▼ ดูไซส์'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {product.product_code ? `รหัส: ${product.product_code}` : (product.barcode || '')}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{product.category}</td>

                  {/* Total Stock */}
                  <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {totalStock} ชิ้น
                  </td>

                  {/* Status Badges */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }} title={status.tooltip}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                      <Badge type={status.type}>{status.summary}</Badge>

                      {/* If 3 or more problem sizes: Render compact Size Pills */}
                      {status.problemCount >= 3 && status.allSizeList.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {status.allSizeList.map(s => {
                            let pillBg = 'var(--bg-main)';
                            let pillColor = 'var(--text-secondary)';
                            let pillBorder = 'var(--border)';
                            let fontWt = 400;

                            if (s.status === 'out') {
                              pillBg = '#fee2e2';
                              pillColor = '#dc2626';
                              pillBorder = '#fca5a5';
                              fontWt = 700;
                            } else if (s.status === 'low') {
                              pillBg = '#fef3c7';
                              pillColor = '#b45309';
                              pillBorder = '#fde68a';
                              fontWt = 700;
                            }

                            return (
                              <span
                                key={s.size}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: pillBg,
                                  color: pillColor,
                                  border: `1px solid ${pillBorder}`,
                                  fontWeight: fontWt,
                                  whiteSpace: 'nowrap'
                                }}
                                title={`ไซส์ ${s.size}: ${s.stock} ชิ้น`}
                              >
                                {s.size}:{s.stock}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => onPrint && onPrint(product)}
                        style={{ padding: '6px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}
                        title="พิมพ์บาร์โค้ด"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        style={{ padding: '6px', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}
                        title="แก้ไขสินค้า"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product.id)}
                        style={{ padding: '6px', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}
                        title="ลบสินค้า"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expandable Sub-Row (Mini Table / Cards for Size Breakdown) */}
                {isExpanded && (
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
                    <td colSpan={6} style={{ padding: '16px 20px 20px 20px' }}>
                      <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        {/* Sub-row Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layers size={18} color="var(--primary)" />
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              สต็อกและบาร์โค้ดแยกตามไซส์: {product.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              (เกณฑ์แจ้งเตือนสต็อก: ≤ {product.threshold !== undefined && product.threshold !== null && product.threshold !== '' ? product.threshold : (settings?.globalThreshold || 30)} ชิ้น)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onEdit(product)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--primary)',
                              backgroundColor: 'var(--primary-light)',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={13} /> แก้ไขจำนวนไซส์ในแบบฟอร์ม
                          </button>
                        </div>

                        {/* Size Breakdown Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
                          {status.allSizeList.map(s => {
                            let cardBorder = 'var(--border)';
                            let badgeBg = 'var(--bg-main)';
                            let badgeColor = 'var(--text-primary)';
                            let statusText = 'ปกติ';

                            if (s.status === 'out') {
                              cardBorder = '#fca5a5';
                              badgeBg = 'var(--danger-bg)';
                              badgeColor = 'var(--danger)';
                              statusText = 'หมดสต็อก';
                            } else if (s.status === 'low') {
                              cardBorder = '#fde68a';
                              badgeBg = 'var(--warning-bg)';
                              badgeColor = 'var(--warning)';
                              statusText = 'ใกล้หมด';
                            } else {
                              cardBorder = '#a7f3d0';
                              badgeBg = 'rgba(16, 185, 129, 0.1)';
                              badgeColor = '#059669';
                              statusText = 'ปกติ';
                            }

                            return (
                              <div
                                key={s.size}
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  border: `1px solid ${cardBorder}`,
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '10px 12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    ไซส์ {s.size}
                                  </span>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor: badgeBg,
                                    color: badgeColor
                                  }}>
                                    {statusText}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>คงเหลือ:</span>
                                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: s.stock === 0 ? 'var(--danger)' : (s.status === 'low' ? 'var(--warning)' : 'var(--text-primary)') }}>
                                    {s.stock} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ชิ้น</span>
                                  </span>
                                </div>

                                {/* Barcode info & copy action */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '4px 8px',
                                  backgroundColor: 'var(--bg-main)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  fontSize: '0.75rem'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <BarcodeIcon size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {s.barcode || '-'}
                                    </span>
                                  </div>
                                  
                                  {s.barcode && s.barcode !== '-' && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyBarcode(s.barcode, s.size)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: copiedBarcode === s.barcode ? '#10b981' : 'var(--text-tertiary)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.15s'
                                      }}
                                      title="คัดลอกบาร์โค้ด"
                                    >
                                      {copiedBarcode === s.barcode ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
