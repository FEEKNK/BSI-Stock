import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({ icon: Icon = PackageOpen, title, description, action }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border)'
    }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}>
        <Icon size={48} />
      </div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: action ? '24px' : '0', maxWidth: '400px' }}>
        {description}
      </p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
