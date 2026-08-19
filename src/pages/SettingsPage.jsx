import React, { useState, useRef } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { Download, Upload, Database, AlertTriangle, CheckCircle2, RefreshCw, HardDrive, ShieldCheck } from 'lucide-react';

export function SettingsPage() {
  const { settings, setGlobalThreshold, toggleNotifications } = useAlerts();
  const { refreshProducts } = useAppContext();
  const { toast } = useToast();

  const fileInputRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [parsedBackupData, setParsedBackupData] = useState(null);

  // Handle Backup Download
  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Failed to create backup');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `bsi_stock_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('ดาวน์โหลดไฟล์สำรองฐานข้อมูล (.json) สำเร็จแล้ว');
    } catch (err) {
      console.error('Backup error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์สำรอง: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle File Select for Restore
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('กรุณาเลือกไฟล์สำรองข้อมูลที่เป็นนามสกุล .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json || !Array.isArray(json.products) || !Array.isArray(json.dispensing_history)) {
          toast.error('ไฟล์สำรองไม่ถูกต้อง หรือโครงสร้างข้อมูลไม่สมบูรณ์');
          return;
        }
        setParsedBackupData(json);
        setRestoreModalOpen(true);
      } catch (err) {
        toast.error('ไม่สามารถอ่านไฟล์ JSON ได้: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!parsedBackupData) return;

    setIsRestoring(true);
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedBackupData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore database');

      toast.success(`กู้คืนฐานข้อมูลสำเร็จ! (สินค้า ${data.restored.products} รายการ, ประวัติ ${data.restored.dispensing_history} รายการ)`);
      setRestoreModalOpen(false);
      setParsedBackupData(null);
      await refreshProducts();
    } catch (err) {
      console.error('Restore error:', err);
      toast.error('เกิดข้อผิดพลาดในการกู้คืนฐานข้อมูล: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px' }}>
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
        
        {/* Section 1: Stock Notifications */}
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

        {/* Section 2: Database Backup & Restore */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="var(--primary)" />
            สำรองและกู้คืนฐานข้อมูล (Backup & Restore)
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            ดาวน์โหลดไฟล์สำรองข้อมูลทั้งหมดในระบบ (สินค้า, สต็อก, ประวัติการเบิกจ่าย, รหัสอ้างอิง) เพื่อเก็บไว้ป้องกันข้อมูลสูญหาย หรือใช้กู้คืนระบบ
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* Download Backup Button */}
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isDownloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: isDownloading ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
                opacity: isDownloading ? 0.7 : 1
              }}
            >
              {isDownloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
              ดาวน์โหลดไฟล์สำรอง (.json)
            </button>

            {/* Restore Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Upload size={18} />
              กู้คืนฐานข้อมูลจากไฟล์ (.json)
            </button>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

        {/* Section 3: System Info */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>ข้อมูลระบบ</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>เวอร์ชัน: 1.0.0 (Round 4 Optimized)</p>
            <p style={{ margin: 0 }}>ฐานข้อมูล: PostgreSQL (Neon Cloud)</p>
          </div>
        </div>

      </div>

      {/* Confirmation Modal for Restore */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => { if (!isRestoring) setRestoreModalOpen(false); }}
        title="ยืนยันการกู้คืนฐานข้อมูล"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '14px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: '0.85rem'
          }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>คำเตือนสำคัญ:</strong>
              การกู้คืนข้อมูลจะทำการ **เขียนทับฐานข้อมูลปัจจุบันทั้งหมด** ด้วยข้อมูลจากไฟล์สำรองนี้ โปรดตรวจสอบความถูกต้องก่อนดำเนินการ
            </div>
          </div>

          {parsedBackupData && (
            <div style={{
              backgroundColor: 'var(--bg-main)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div><strong>📅 วันที่สร้างไฟล์สำรอง:</strong> {parsedBackupData.metadata?.exported_at ? new Date(parsedBackupData.metadata.exported_at).toLocaleString('th-TH') : '-'}</div>
              <div><strong>📦 จำนวนสินค้าในไฟล์:</strong> {parsedBackupData.products?.length || 0} รายการ</div>
              <div><strong>📋 ประวัติการเบิกจ่าย:</strong> {parsedBackupData.dispensing_history?.length || 0} รายการ</div>
              <div><strong>🏷️ รหัสหมวดหมู่ / ไซส์:</strong> {(parsedBackupData.category_codes?.length || 0) + (parsedBackupData.size_codes?.length || 0)} รายการ</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setRestoreModalOpen(false)}
              disabled={isRestoring}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={isRestoring}
              style={{
                padding: '9px 22px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--danger)',
                color: '#ffffff',
                cursor: isRestoring ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
                opacity: isRestoring ? 0.7 : 1
              }}
            >
              {isRestoring ? <RefreshCw size={16} className="animate-spin" /> : <HardDrive size={16} />}
              ยืนยันกู้คืนข้อมูล
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
