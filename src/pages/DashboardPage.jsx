import React, { useMemo, useState } from 'react';
import { Package, AlertTriangle, AlertOctagon, TrendingUp, FileSpreadsheet, Table2, Filter } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useAppContext } from '../context/AppContext';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { StockChart } from '../components/Dashboard/StockChart';
import { Badge } from '../components/common/Badge';
import { exportStockReportToExcel } from '../utils/excel';

export function DashboardPage() {
  const { stats, lowStockItems } = useDashboard();
  const { products } = useAppContext();

  // Build the stock matrix (like the paper sheet)
  const groupedStockMatrix = useMemo(() => {
    const sizeOrder = ['free size', 'ฟรีไซส์', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50'];
    const paperOrder = ['Sabina', 'Anne', 'Avie', 'Wacoal', 'เกาะอก', 'ผ้าคลุมหน้าอก'];
    
    // Group by category
    const grouped = {};
    products.forEach(p => {
      const cat = p.category || 'ไม่มีหมวดหมู่';
      if (!grouped[cat]) grouped[cat] = { products: [], sizesSet: new Set() };
      grouped[cat].products.push(p);
      if (p.sizes) {
        Object.keys(p.sizes).forEach(s => grouped[cat].sizesSet.add(s));
      }
    });

    // Format and sort each group
    const result = [];
    Object.keys(grouped).sort().forEach(cat => {
      const data = grouped[cat];
      
      data.products.sort((a, b) => {
        const idxA = paperOrder.indexOf(a.name);
        const idxB = paperOrder.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.product_code || '').localeCompare(b.product_code || '');
      });

      const allSizes = [...data.sizesSet].sort((a, b) => {
        const ia = sizeOrder.indexOf(a);
        const ib = sizeOrder.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

      result.push({ category: cat, products: data.products, sizes: allSizes });
    });

    return result;
  }, [products]);

  const [activeCategoryTab, setActiveCategoryTab] = useState('ทั้งหมด');

  const handleExportExcel = () => {
    exportStockReportToExcel(groupedStockMatrix, products);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>ภาพรวมคลังสินค้า</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <StatsCard 
          title="สินค้าทั้งหมด (แบบ)" 
          value={stats.totalProducts} 
          icon={Package} 
          color="#002d74" 
        />
        <StatsCard 
          title="สต็อกรวมทั้งหมด (ชิ้น)" 
          value={stats.totalItems} 
          icon={TrendingUp} 
          color="#10b981" 
        />
        <StatsCard 
          title="สินค้าใกล้หมด" 
          value={stats.lowStockCount} 
          icon={AlertTriangle} 
          color="#d97706" 
        />
        <StatsCard 
          title="สินค้าหมดสต็อก" 
          value={stats.outOfStockCount} 
          icon={AlertOctagon} 
          color="#ef4444" 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <StockChart />
        
        {/* Low Stock Alert */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>สินค้าที่ต้องสั่งซื้อด่วน</h3>
          
          {lowStockItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              ไม่มีสินค้าที่ใกล้หมด
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 0', fontWeight: 500, color: 'var(--text-secondary)' }}>ชื่อสินค้า</th>
                    <th style={{ padding: '12px 0', fontWeight: 500, color: 'var(--text-secondary)' }}>หมวดหมู่</th>
                    <th style={{ padding: '12px 0', fontWeight: 500, color: 'var(--text-secondary)' }}>จำนวนเหลือ</th>
                    <th style={{ padding: '12px 0', fontWeight: 500, color: 'var(--text-secondary)' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.slice(0, 5).map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 0', fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</td>
                      <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>{item.category}</td>
                      <td style={{ padding: '12px 0', fontWeight: 600, color: 'var(--text-primary)' }}>{item.computedStock}</td>
                      <td style={{ padding: '12px 0' }}>
                        <Badge type={item.computedStock === 0 ? 'danger' : 'warning'}>
                          {item.computedStock === 0 ? 'หมด' : 'ใกล้หมด'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stock Summary Table - like the paper sheet */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Table2 size={18} color="var(--primary)" />
              ตารางสต็อกแยกตามไซส์
            </h3>
            <button
              onClick={handleExportExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#107c41',
                border: 'none',
                color: '#ffffff',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(16, 124, 65, 0.2)'
              }}
              title="ดาวน์โหลดรายงานสต็อกเป็นไฟล์ Excel (.xlsx) สวยงาม คอลัมน์พอดี"
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
          
          {/* Category Filter Dropdown */}
          {groupedStockMatrix.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', minWidth: '200px' }}>
                <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <select
                  value={activeCategoryTab}
                  onChange={(e) => setActiveCategoryTab(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 32px 7px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    backgroundSize: '16px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <option value="ทั้งหมด">ทุกหมวดหมู่ (ทั้งหมด)</option>
                  {groupedStockMatrix.map(group => (
                    <option key={group.category} value={group.category}>
                      {group.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {groupedStockMatrix.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            ยังไม่มีข้อมูลสต็อก
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {groupedStockMatrix
              .filter(group => activeCategoryTab === 'ทั้งหมด' || group.category === activeCategoryTab)
              .map(group => (
                <div key={group.category} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--primary)'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      หมวดหมู่: {group.category}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {group.products.length} รายการ
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'center', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                          <th style={{
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            minWidth: '120px',
                            maxWidth: '160px',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'var(--bg-surface)',
                            borderBottom: '2px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            zIndex: 2
                          }}>
                            ชื่อสินค้า
                          </th>
                          {group.sizes.map(size => (
                            <th 
                              key={size} 
                              style={{ 
                                padding: '10px 4px', 
                                fontWeight: 600, 
                                color: 'var(--text-secondary)', 
                                minWidth: (size.toLowerCase().includes('free') || size.includes('ฟรี')) ? '46px' : '36px',
                                borderBottom: '2px solid var(--border)',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap'
                              }}
                              title={size}
                            >
                              {(size.toLowerCase() === 'free size' || size === 'ฟรีไซส์') ? 'Free' : size}
                            </th>
                          ))}
                          <th style={{
                            padding: '10px 6px',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            minWidth: '48px',
                            position: 'sticky',
                            right: 0,
                            backgroundColor: 'var(--bg-main)',
                            borderBottom: '2px solid var(--border)',
                            borderLeft: '1px solid var(--border)',
                            zIndex: 2
                          }}>
                            รวม
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.products.map(p => {
                          let rowTotal = 0;
                          return (
                            <tr key={p.id} style={{ backgroundColor: 'var(--bg-surface)' }}>
                              <td style={{
                                padding: '8px 12px',
                                textAlign: 'left',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                position: 'sticky',
                                left: 0,
                                backgroundColor: 'inherit',
                                borderBottom: '1px solid var(--border)',
                                borderRight: '1px solid var(--border)',
                                zIndex: 1
                              }}>
                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                {p.product_code && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>#{p.product_code}</span>
                                )}
                              </td>
                              {group.sizes.map(size => {
                                const sizeData = p.sizes?.[size];
                                const stock = sizeData 
                                  ? (typeof sizeData === 'object' ? Number(sizeData.stock || 0) : Number(sizeData))
                                  : null;
                                
                                if (stock !== null) {
                                  rowTotal += stock;
                                }

                                // Style cell based on status
                                let cellBg = '#ffffff';
                                let textColor = 'var(--text-primary)';
                                let fontWt = 700;

                                if (stock === null) {
                                  // Darker gray shade for empty/not applicable cells
                                  cellBg = '#e2e8f0';
                                  textColor = '#94a3b8';
                                  fontWt = 400;
                                } else if (stock === 0) {
                                  // Out of stock
                                  cellBg = '#fee2e2';
                                  textColor = 'var(--danger)';
                                  fontWt = 700;
                                } else if (stock <= 5) {
                                  // Low stock
                                  cellBg = '#fef3c7';
                                  textColor = '#d97706';
                                  fontWt = 700;
                                }

                                let tooltipText = '';
                                if (stock !== null) {
                                  tooltipText = `${p.name} | ไซส์: ${size} | สต็อก: ${stock} ชิ้น${stock === 0 ? ' (หมดสต็อก)' : ''}`;
                                } else {
                                  tooltipText = `${p.name} | ไซส์: ${size} | (ไม่มีไซส์นี้)`;
                                }

                                return (
                                  <td 
                                    key={size} 
                                    title={tooltipText}
                                    style={{ 
                                      padding: '8px 4px', 
                                      backgroundColor: cellBg,
                                      borderBottom: '1px solid var(--border)',
                                      borderRight: '1px solid var(--border)',
                                      transition: 'all 0.15s',
                                      cursor: 'default'
                                    }}
                                  >
                                    {stock !== null ? (
                                      <span style={{ 
                                        fontWeight: fontWt,
                                        color: textColor,
                                        fontSize: '0.875rem'
                                      }}>
                                        {stock}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.8rem' }}>-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td 
                                title={`สต็อกรวมของ ${p.name}: ${rowTotal} ชิ้น`}
                                style={{
                                  padding: '8px 6px',
                                  fontWeight: 700,
                                  color: rowTotal === 0 ? 'var(--danger)' : 'var(--primary)',
                                  position: 'sticky',
                                  right: 0,
                                  backgroundColor: 'var(--bg-main)',
                                  borderBottom: '1px solid var(--border)',
                                  borderLeft: '1px solid var(--border)',
                                  zIndex: 1,
                                  cursor: 'default'
                                }}
                              >
                                {rowTotal}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
