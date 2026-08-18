import React from 'react';
import { useAlerts } from '../hooks/useAlerts';

export function SettingsPage() {
  const { settings, setGlobalThreshold, toggleNotifications } = useAlerts();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>การตั้งค่าระบบ</h1>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>การแจ้งเตือนสต็อก</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.notificationsEnabled}
                onChange={(e) => toggleNotifications(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>เปิดใช้งานการแจ้งเตือนสินค้าใกล้หมด</span>
            </label>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                ค่าเริ่มต้น: แจ้งเตือนเมื่อสต็อกแต่ละไซส์เหลือต่ำกว่า (ชิ้น)
              </label>
              <input 
                type="number" 
                min="0"
                value={settings.globalThreshold}
                onChange={(e) => setGlobalThreshold(Number(e.target.value))}
                disabled={!settings.notificationsEnabled}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  width: '120px',
                  opacity: settings.notificationsEnabled ? 1 : 0.5
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
              * ระบบจะตรวจสอบสต็อกและแจ้งเตือนแยกตามแต่ละไซส์ของสินค้า (สามารถตั้งค่าเฉพาะเจาะจงรายสินค้าได้ในหน้าแก้ไขสินค้า)
            </p>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>ข้อมูลระบบ</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>เวอร์ชัน: 1.0.0</p>
            <p style={{ margin: 0 }}>ฐานข้อมูล: PostgreSQL (Neon Cloud)</p>
          </div>
        </div>

      </div>
    </div>
  );
}
