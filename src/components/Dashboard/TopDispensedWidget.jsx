import React, { useState, useEffect } from 'react';
import { Award, Flame, RefreshCw } from 'lucide-react';

export function TopDispensedWidget() {
  const [days, setDays] = useState(30);
  const [topProducts, setTopProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTopProducts = async (selectedDays) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/movement?days=${selectedDays}`);
      if (res.ok) {
        const data = await res.json();
        setTopProducts(data.topProducts || []);
      }
    } catch (err) {
      console.error('Failed to fetch top products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopProducts(days);
  }, [days]);

  const maxQty = topProducts.length > 0 ? Math.max(...topProducts.map(p => Number(p.total_quantity) || 1)) : 1;

  const rankBadges = [
    { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', text: '1' },
    { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#fff', text: '2' },
    { bg: 'linear-gradient(135deg, #b45309, #78350f)', color: '#fff', text: '3' },
    { bg: 'var(--bg-main)', color: 'var(--text-secondary)', text: '4' },
    { bg: 'var(--bg-main)', color: 'var(--text-secondary)', text: '5' }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={18} color="#ef4444" />
            สินค้าที่มีการเบิกใช้สูงสุด (Top 5)
          </h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            เรียงตามยอดการเบิกออกจริงในระบบ
          </span>
        </div>

        {/* Time Selector */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-main)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {[
            { label: '7 วัน', value: 7 },
            { label: '30 วัน', value: 30 },
            { label: '90 วัน', value: 90 }
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              style={{
                padding: '3px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: days === opt.value ? 'var(--primary)' : 'transparent',
                color: days === opt.value ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', height: '180px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" />
          </div>
        ) : topProducts.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            ยังไม่มีข้อมูลการเบิกจ่ายในช่วง {days} วันที่ผ่านมา
          </div>
        ) : (
          topProducts.map((item, index) => {
            const qty = Number(item.total_quantity) || 0;
            const percent = Math.round((qty / maxQty) * 100);
            const badge = rankBadges[index] || rankBadges[3];

            return (
              <div
                key={item.product_name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {/* Rank Badge */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: badge.bg,
                      color: badge.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: index < 3 ? '0 2px 4px rgba(0,0,0,0.15)' : 'none'
                    }}>
                      {badge.text}
                    </div>

                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--danger)' }}>
                      {qty}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ชิ้น ({item.times_dispensed} ครั้ง)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                  height: '6px',
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percent}%`,
                    backgroundColor: index === 0 ? 'var(--primary)' : (index === 1 ? '#0284c7' : '#10b981'),
                    borderRadius: '3px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
