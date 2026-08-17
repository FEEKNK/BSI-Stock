import React, { useMemo } from 'react';
import { Package, AlertTriangle, AlertOctagon, TrendingUp } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useAppContext } from '../context/AppContext';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { StockChart } from '../components/Dashboard/StockChart';
import { Badge } from '../components/common/Badge';

export function DashboardPage() {
  const { stats, lowStockItems } = useDashboard();
  const { products } = useAppContext();

  // Build the stock matrix (like the paper sheet)
  const stockMatrix = useMemo(() => {
    // Collect all unique sizes across all products
    const sizeOrder = ['free size', 'ฟรีไซส์', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50'];
    const allSizesSet = new Set();
    
    // We want ALL products, not just those with sizes, to match the paper columns perfectly.
    // Let's also order them exactly like the paper: Sabina, Anne, Avie, Wacoal, เกาะอก, ผ้าคลุมหน้าอก
    const paperOrder = ['Sabina', 'Anne', 'Avie', 'Wacoal', 'เกาะอก', 'ผ้าคลุมหน้าอก'];
    
    const sortedProducts = [...products].sort((a, b) => {
      const idxA = paperOrder.indexOf(a.name);
      const idxB = paperOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.product_code || '').localeCompare(b.product_code || '');
    });
    
    sortedProducts.forEach(p => {
      if (p.sizes) {
        Object.keys(p.sizes).forEach(s => allSizesSet.add(s));
      }
    });

    // Sort sizes by predefined order
    const allSizes = [...allSizesSet].sort((a, b) => {
      const ia = sizeOrder.indexOf(a);
      const ib = sizeOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return { productsWithSizes: sortedProducts, allSizes };
  }, [products]);

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
          color="#dc2626" 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <StockChart />
        
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>สินค้าที่ต้องสั่งซื้อด่วน</h3>
          {lowStockItems.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              ไม่มีสินค้าที่ต้องสั่งซื้อ
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 0', color: 'var(--text-secondary)', fontWeight: 500 }}>ชื่อสินค้า</th>
                    <th style={{ padding: '12px 0', color: 'var(--text-secondary)', fontWeight: 500 }}>หมวดหมู่</th>
                    <th style={{ padding: '12px 0', color: 'var(--text-secondary)', fontWeight: 500 }}>จำนวนเหลือ</th>
                    <th style={{ padding: '12px 0', color: 'var(--text-secondary)', fontWeight: 500 }}>สถานะ</th>
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
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          📊 ตารางสต็อกแยกตามไซส์
        </h3>

        {stockMatrix.productsWithSizes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            ยังไม่มีข้อมูลสต็อก
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-main)' }}>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', fontWeight: 700,
                    color: 'var(--text-primary)', borderBottom: '2px solid var(--primary)',
                    position: 'sticky', left: 0, backgroundColor: 'var(--bg-main)', zIndex: 1, minWidth: '80px'
                  }}>
                    ไซส์
                  </th>
                  {stockMatrix.productsWithSizes.map(p => (
                    <th key={p.id} style={{
                      padding: '12px 16px', fontWeight: 600,
                      color: 'var(--primary)', borderBottom: '2px solid var(--primary)', minWidth: '90px',
                      whiteSpace: 'nowrap'
                    }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockMatrix.allSizes.map((size, idx) => (
                  <tr key={size} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-main)' }}>
                    <td style={{
                      padding: '10px 16px', fontWeight: 600, textAlign: 'left',
                      color: 'var(--text-primary)', borderRight: '1px solid var(--border)',
                      position: 'sticky', left: 0,
                      backgroundColor: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-main)', zIndex: 1
                    }}>
                      {size}
                    </td>
                    {stockMatrix.productsWithSizes.map(p => {
                      const sizeData = p.sizes?.[size];
                      const stock = sizeData
                        ? (typeof sizeData === 'object' ? sizeData.stock : Number(sizeData))
                        : null;
                      
                      return (
                        <td key={p.id} style={{
                          padding: '10px 16px',
                          fontWeight: stock !== null ? 600 : 400,
                          color: stock === null ? 'var(--text-tertiary)' 
                            : stock === 0 ? 'var(--danger)' 
                            : stock <= 5 ? 'var(--warning)' 
                            : 'var(--text-primary)',
                          borderRight: '1px solid var(--border-light)'
                        }}>
                          {stock !== null ? stock : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
