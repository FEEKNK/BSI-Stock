import React from 'react';
import { Package, AlertTriangle, AlertOctagon, TrendingUp } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { StockChart } from '../components/Dashboard/StockChart';
import { Badge } from '../components/common/Badge';

export function DashboardPage() {
  const { stats, lowStockItems } = useDashboard();

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
                      <td style={{ padding: '12px 0', fontWeight: 600, color: 'var(--text-primary)' }}>{item.totalStock}</td>
                      <td style={{ padding: '12px 0' }}>
                        <Badge type={item.totalStock === 0 ? 'danger' : 'warning'}>
                          {item.totalStock === 0 ? 'หมด' : 'ใกล้หมด'}
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
    </div>
  );
}
