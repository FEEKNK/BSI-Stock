import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardList, 
  User, 
  Calendar,
  RotateCcw
} from 'lucide-react';
import { useDispensing } from '../hooks/useDispensing';
import { DispensingList } from '../components/Dispensing/DispensingList';
import { DispensingForm } from '../components/Dispensing/DispensingForm';
import { Modal } from '../components/common/Modal';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { exportDispensingHistory } from '../utils/exportUtils';

export function DispensingPage() {
  const { history, isLoading, fetchHistory, updateRecord, deleteRecord } = useDispensing();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [activeDateShortcut, setActiveDateShortcut] = useState('all');
  
  const [filters, setFilters] = useState({
    type: 'ALL',
    hn: '',
    product_name: '',
    seller: '',
    start_date: '',
    end_date: ''
  });

  // Calculate Summary Statistics based on current filtered history
  const stats = useMemo(() => {
    let totalOut = 0;
    let totalIn = 0;
    history.forEach(item => {
      const qty = Number(item.quantity) || 0;
      if (item.type === 'IN') {
        totalIn += qty;
      } else {
        totalOut += qty;
      }
    });
    return {
      totalRecords: history.length,
      totalOut,
      totalIn
    };
  }, [history]);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setEditingRecord(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (data) => {
    if (editingRecord && editingRecord.id) {
      const result = await updateRecord(editingRecord.id, data);
      if (result.success) {
        handleCloseModal();
      } else {
        alert(result.error);
      }
    }
  };

  const handleDelete = (id) => {
    const record = history.find(r => r.id === id);
    if (record) {
      setRecordToDelete(record);
    }
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
      const result = await deleteRecord(recordToDelete.id);
      if (!result.success) {
        alert(result.error);
      }
      setRecordToDelete(null);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    if (name === 'start_date' || name === 'end_date') {
      setActiveDateShortcut('custom');
    }
  };

  const handleTypeChange = (newType) => {
    const updated = { ...filters, type: newType };
    setFilters(updated);
    fetchHistory(updated);
  };

  const setDateShortcut = (shortcut) => {
    setActiveDateShortcut(shortcut);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let newStart = '';
    let newEnd = '';

    if (shortcut === 'today') {
      newStart = todayStr;
      newEnd = todayStr;
    } else if (shortcut === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      newStart = past.toISOString().split('T')[0];
      newEnd = todayStr;
    } else if (shortcut === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      newStart = firstDay.toISOString().split('T')[0];
      newEnd = todayStr;
    } else if (shortcut === 'all') {
      newStart = '';
      newEnd = '';
    }

    const updated = { ...filters, start_date: newStart, end_date: newEnd };
    setFilters(updated);
    fetchHistory(updated);
  };

  const applyFilters = () => {
    fetchHistory(filters);
  };

  const clearFilters = () => {
    const emptyFilters = { type: 'ALL', hn: '', product_name: '', seller: '', start_date: '', end_date: '' };
    setActiveDateShortcut('all');
    setFilters(emptyFilters);
    fetchHistory(emptyFilters);
  };

  const inputStyle = {
    padding: '8px 12px 8px 36px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    width: '100%',
    fontSize: '0.875rem'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>ประวัติคลังสินค้า</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ดูรายการรับเข้า-เบิกออก ค้นหา และส่งออกรายงาน</p>
        </div>
        <button
          onClick={() => exportDispensingHistory(history, 'xlsx')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#107c41',
            border: 'none',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(16, 124, 65, 0.2)',
            transition: 'all 0.2s'
          }}
          title="ดาวน์โหลดเป็นไฟล์ Excel (.xlsx) สวยงาม คอลัมน์พอดี ไม่มี 0:00"
        >
          <FileSpreadsheet size={18} /> Export Excel
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatsCard 
          title="ประวัติทั้งหมด (รายการ)" 
          value={`${stats.totalRecords} รายการ`} 
          icon={ClipboardList} 
          color="#002d74" 
        />
        <StatsCard 
          title="ยอดเบิกออกรวม" 
          value={`${stats.totalOut} ชิ้น`} 
          icon={ArrowUpFromLine} 
          color="#ef4444" 
        />
        <StatsCard 
          title="ยอดรับเข้ารวม" 
          value={`${stats.totalIn} ชิ้น`} 
          icon={ArrowDownToLine} 
          color="#10b981" 
        />
      </div>

      {/* Filter Box */}
      <div style={{ 
        backgroundColor: 'var(--bg-surface)', 
        padding: '20px', 
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Row 1: Type Tabs & Date Shortcuts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          {/* Type Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>ประเภท:</span>
            <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-main)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => handleTypeChange('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: filters.type === 'ALL' ? 'var(--primary)' : 'transparent',
                  color: filters.type === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => handleTypeChange('OUT')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: filters.type === 'OUT' ? 'var(--danger)' : 'transparent',
                  color: filters.type === 'OUT' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <ArrowUpFromLine size={13} /> เบิกออก
              </button>
              <button
                onClick={() => handleTypeChange('IN')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: filters.type === 'IN' ? 'var(--success)' : 'transparent',
                  color: filters.type === 'IN' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <ArrowDownToLine size={13} /> รับเข้า
              </button>
            </div>
          </div>

          {/* Quick Date Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>ช่วงเวลา:</span>
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'today', label: 'วันนี้' },
              { id: '7days', label: '7 วันล่าสุด' },
              { id: 'thisMonth', label: 'เดือนนี้' }
            ].map(shortcut => (
              <button
                key={shortcut.id}
                onClick={() => setDateShortcut(shortcut.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  backgroundColor: activeDateShortcut === shortcut.id ? 'var(--primary-light)' : 'transparent',
                  color: activeDateShortcut === shortcut.id ? 'var(--primary)' : 'var(--text-secondary)',
                  borderColor: activeDateShortcut === shortcut.id ? 'var(--primary)' : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Search Inputs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* HN Filter */}
          <div style={{ position: 'relative', flex: '1 1 150px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              name="hn"
              placeholder="ค้นหา HN..."
              value={filters.hn}
              onChange={handleFilterChange}
              style={inputStyle}
            />
          </div>

          {/* Product Name Filter */}
          <div style={{ position: 'relative', flex: '1 1 180px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              name="product_name"
              placeholder="ค้นหาชื่อสินค้า..."
              value={filters.product_name}
              onChange={handleFilterChange}
              style={inputStyle}
            />
          </div>

          {/* Seller / Picker Filter */}
          <div style={{ position: 'relative', flex: '1 1 160px' }}>
            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              name="seller"
              placeholder="ค้นหาผู้เบิก/รับ..."
              value={filters.seller}
              onChange={handleFilterChange}
              style={inputStyle}
            />
          </div>

          {/* Custom Date Range */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: '1 1 260px' }}>
            <input
              type="date"
              name="start_date"
              value={filters.start_date || ''}
              onChange={handleFilterChange}
              style={{ ...inputStyle, paddingLeft: '12px' }}
              title="ตั้งแต่วันที่"
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ถึง</span>
            <input
              type="date"
              name="end_date"
              value={filters.end_date || ''}
              onChange={handleFilterChange}
              style={{ ...inputStyle, paddingLeft: '12px' }}
              title="ถึงวันที่"
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
            <button 
              onClick={applyFilters}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 20px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Search size={15} /> ค้นหา
            </button>
            <button 
              onClick={clearFilters}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
              title="ล้างตัวกรองทั้งหมด"
            >
              <RotateCcw size={14} /> ล้าง
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <DispensingList
          history={history}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Edit Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="แก้ไขประวัติรายการ"
      >
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)', fontSize: '0.875rem' }}>
          <strong>หมายเหตุ:</strong> การแก้ไขรายการ จะทำการหัก/คืนสต็อกสินค้าที่เกี่ยวข้องโดยอัตโนมัติ
        </div>
        <DispensingForm
          initialData={editingRecord}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        title="ยืนยันการลบรายการ"
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
            คุณแน่ใจหรือไม่ที่จะลบรายการ <strong>{recordToDelete?.product_name}</strong>?
          </p>
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            การลบรายการนี้ ระบบจะทำการปรับคืนสต็อกสินค้าจำนวน <strong>{recordToDelete?.quantity} ชิ้น</strong> อัตโนมัติ
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setRecordToDelete(null)}
              style={{
                padding: '10px 24px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              ยกเลิก
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: '10px 24px',
                backgroundColor: 'var(--danger)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              ลบรายการนี้
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
