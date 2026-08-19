import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur || 4500),
    warning: (msg, dur) => showToast(msg, 'warning', dur || 4000),
    info: (msg, dur) => showToast(msg, 'info', dur),
  };

  const getToastConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={20} color="#10b981" />,
          borderColor: '#10b981',
          bgColor: 'var(--bg-surface, #ffffff)',
          accentColor: '#10b981',
          title: 'สำเร็จ'
        };
      case 'error':
        return {
          icon: <AlertCircle size={20} color="#ef4444" />,
          borderColor: '#ef4444',
          bgColor: 'var(--bg-surface, #ffffff)',
          accentColor: '#ef4444',
          title: 'ข้อผิดพลาด'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} color="#f59e0b" />,
          borderColor: '#f59e0b',
          bgColor: 'var(--bg-surface, #ffffff)',
          accentColor: '#f59e0b',
          title: 'แจ้งเตือน'
        };
      default:
        return {
          icon: <Info size={20} color="#0ea5e9" />,
          borderColor: '#0ea5e9',
          bgColor: 'var(--bg-surface, #ffffff)',
          accentColor: '#0ea5e9',
          title: 'ข้อมูล'
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      
      {/* Floating Toast Container */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => {
          const cfg = getToastConfig(t.type);
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                borderLeft: `4px solid ${cfg.borderColor}`,
                borderRadius: 'var(--radius-md, 8px)',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'slideInToast 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderLeftWidth: '4px'
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '1px' }}>
                {cfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: cfg.accentColor, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {cfg.title}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary, #1e293b)', lineHeight: '1.4', fontWeight: 500, wordBreak: 'break-word' }}>
                  {t.message}
                </div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary, #94a3b8)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="ปิด"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
