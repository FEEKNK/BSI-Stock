import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X, RefreshCw, Layers, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { downloadProductImportTemplate, parseProductsFromExcel } from '../../utils/excel';
import { useToast } from '../../context/ToastContext';

export function ImportProductsModal({ isOpen, onClose, onImportSuccess }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [importMode, setImportMode] = useState('upsert'); // 'upsert' | 'insert_only'
  const [isDragOver, setIsDragOver] = useState(false);

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDownloadTemplate = () => {
    downloadProductImportTemplate();
    toast.success('ดาวน์โหลดแบบฟอร์มตัวอย่าง (product_import_template.xlsx) เรียบร้อยแล้ว');
  };

  const processFile = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('กรุณาเลือกไฟล์ที่เป็นนามสกุล Excel (.xlsx หรือ .xls)');
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    try {
      const result = await parseProductsFromExcel(file);
      if (result.success) {
        setParseResult(result);
        if (result.validCount > 0) {
          toast.success(`ตรวจสอบพบ ${result.validCount} สินค้า (${result.rawRowCount} แถวใน Excel)`);
        } else {
          toast.warning('ไม่พบข้อมูลสินค้าที่สามารถนำเข้าได้');
        }
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
        setParseResult(null);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleExecuteImport = async () => {
    if (!parseResult || !parseResult.products || parseResult.products.length === 0) {
      toast.warning('ไม่มีข้อมูลสินค้าสำหรับนำเข้า');
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parseResult.products,
          mode: importMode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import products');
      }

      toast.success(data.message || `นำเข้าสินค้าสำเร็จ ${data.totalProcessed} รายการ`);
      if (onImportSuccess) {
        await onImportSuccess();
      }
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="นำเข้าข้อมูลสินค้าจาก Excel (.xlsx)" maxWidth="850px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Instructions & Template Download Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 45, 116, 0.05)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(0, 45, 116, 0.15)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
              ดาวน์โหลดแบบฟอร์มมาตรฐาน
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              กรอกข้อมูลชื่อสินค้า, หมวดหมู่, ไซส์, สต็อก และบาร์โค้ดตามไฟล์ Template
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#107c41',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 124, 65, 0.2)'
            }}
          >
            <Download size={16} /> ดาวน์โหลด Template (.xlsx)
          </button>
        </div>

        {/* Upload Dropzone */}
        {!parseResult && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isDragOver ? 'rgba(0, 45, 116, 0.04)' : 'var(--bg-main)',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              {isParsing ? <RefreshCw size={28} className="animate-spin" /> : <Upload size={28} />}
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {isParsing ? 'กำลังอ่านและตรวจสอบไฟล์ Excel...' : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                รองรับไฟล์นามสกุล Microsoft Excel (.xlsx, .xls)
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {parseResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* File Info Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={20} color="#107c41" />
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {selectedFile?.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  ({Math.round((selectedFile?.size || 0) / 1024)} KB)
                </span>
              </div>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={16} /> เปลี่ยนไฟล์
              </button>
            </div>

            {/* Error / Warning Notice */}
            {parseResult.errors && parseResult.errors.length > 0 && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.8125rem'
              }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertCircle size={16} /> พบข้อผิดพลาด {parseResult.errors.length} รายการ (ระบบจะข้ามแถวเหล่านี้):
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', maxHeight: '80px', overflowY: 'auto' }}>
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  ตัวอย่างรายการสินค้าที่จะนำเข้า ({parseResult.validCount} รายการ):
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  รวมไซส์ทั้งหมด {parseResult.rawRowCount - (parseResult.errors?.length || 0)} ไซส์
                </span>
              </div>

              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>รหัส</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ชื่อสินค้า</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>หมวดหมู่</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ไซส์และสต็อก</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>สต็อกรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.products.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                          {p.product_code || '-'}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                          {p.category}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {Object.entries(p.sizes || {}).map(([sKey, sVal]) => (
                              <span
                                key={sKey}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-main)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-primary)'
                                }}
                              >
                                {sKey}: <strong>{typeof sVal === 'object' ? sVal.stock : sVal}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {p.totalStock} ชิ้น
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Mode Selection */}
            <div style={{
              backgroundColor: 'var(--bg-main)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                รูปแบบการนำเข้า:
              </span>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="upsert"
                    checked={importMode === 'upsert'}
                    onChange={() => setImportMode('upsert')}
                  />
                  <span><strong>อัปเดตและเพิ่มใหม่ (Upsert)</strong> - หากพบชื่อหรือรหัสสินค้าซ้ำ จะรวมไซส์และอัปเดตข้อมูล</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isImporting}
            style={{
              padding: '9px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            ยกเลิก
          </button>

          {parseResult && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting || parseResult.validCount === 0}
              style={{
                padding: '9px 24px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                cursor: (isImporting || parseResult.validCount === 0) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
                opacity: (isImporting || parseResult.validCount === 0) ? 0.6 : 1
              }}
            >
              {isImporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  กำลังบันทึกข้อมูล...
                </>
              ) : (
                <>
                  <Check size={16} />
                  ยืนยันนำเข้า {parseResult.validCount} รายการ
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
}
