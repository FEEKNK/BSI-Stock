import React from 'react';

export function StatsCard({ title, value, icon: Icon, color = 'var(--primary)', trend = null }) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: '0 0 8px 0' }}>{title}</p>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>{value}</h3>
        </div>
        <div style={{
          width: '48px', height: '48px',
          borderRadius: '12px',
          backgroundColor: `${color}15`,
          color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <div style={{ fontSize: '0.75rem', color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}>
          {trend > 0 ? '+' : ''}{trend}% จากสัปดาห์ที่แล้ว
        </div>
      )}
    </div>
  );
}
