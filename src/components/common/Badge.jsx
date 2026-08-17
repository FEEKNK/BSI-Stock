import React from 'react';

export function Badge({ children, type = 'primary', className = '' }) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  };

  const typeStyles = {
    primary: { backgroundColor: 'var(--primary-light)', color: 'var(--primary)' },
    success: { backgroundColor: 'var(--success-bg)', color: 'var(--success)' },
    warning: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
    danger: { backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' },
    secondary: { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
  };

  return (
    <span style={{ ...baseStyle, ...typeStyles[type] }} className={className}>
      {children}
    </span>
  );
}
