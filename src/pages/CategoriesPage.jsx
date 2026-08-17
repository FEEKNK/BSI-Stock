import React from 'react';
import { ReferenceTable } from '../components/common/ReferenceTable';

export function CategoriesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>จัดการหมวดหมู่สินค้าและรหัสบาร์โค้ด</h1>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <ReferenceTable />
      </div>
    </div>
  );
}
