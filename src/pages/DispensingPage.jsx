import React, { useState } from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { useDispensing } from '../hooks/useDispensing';
import { DispensingList } from '../components/Dispensing/DispensingList';
import { DispensingForm } from '../components/Dispensing/DispensingForm';
import { Modal } from '../components/common/Modal';

export function DispensingPage() {
  const { history, isLoading, fetchHistory, addRecord, updateRecord, deleteRecord } = useDispensing();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  
  const [filters, setFilters] = useState({
    hn: '',
    product_name: '',
    seller: '',
    start_date: '',
    end_date: ''
  });

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
  };

  const applyFilters = () => {
    fetchHistory(filters);
  };

  const clearFilters = () => {
    const emptyFilters = { hn: '', product_name: '', seller: '', start_date: '', end_date: '' };
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

  const exportToCSV = () => {
    let csvContent = "วัน/เวลาทำรายการ,ประเภท,HN,สินค้า,ไซส์,จำนวน,ผู้เบิก/ผู้รับ,หมายเหตุ\n";
    
    history.forEach(record => {
      const rawDate = record.dispensed_date || record.created_at;
      let dateStr = '-';
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleString('th-TH');
        }
      }
      const type = record.type === 'IN' ? 'รับเข้า' : 'เบิกออก';
      const hn = record.hn || '-';
      const product = record.product_name || '-';
      const size = record.size || '-';
      const quantity = record.quantity || 0;
      const seller = record.seller || '-';
      const note = record.note || '-';
      
      const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;
      csvContent += `${escapeCsv(dateStr)},${escapeCsv(type)},${escapeCsv(hn)},${escapeCsv(product)},${escapeCsv(size)},${escapeCsv(quantity)},${escapeCsv(seller)},${escapeCsv(note)}\n`;
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `history_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>ประวัติคลังสินค้า</h1>
        <button
          onClick={exportToCSV}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
          title="ดาวน์โหลดเป็นไฟล์ CSV"
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div style={{ 
        backgroundColor: 'var(--bg-surface)', 
        padding: '16px', 
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
          <Filter size={18} />
          <span style={{ fontWeight: 600 }}>ค้นหาและกรอง</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
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
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
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
          <div style={{ display: 'flex', gap: '8px', flex: '1 1 300px' }}>
            <input
              type="date"
              name="start_date"
              value={filters.start_date || ''}
              onChange={handleFilterChange}
              style={{ ...inputStyle, paddingLeft: '12px' }}
              title="ตั้งแต่วันที่"
            />
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>ถึง</span>
            <input
              type="date"
              name="end_date"
              value={filters.end_date || ''}
              onChange={handleFilterChange}
              style={{ ...inputStyle, paddingLeft: '12px' }}
              title="ถึงวันที่"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
            <button 
              onClick={applyFilters}
              style={{ padding: '8px 24px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
            >
              ค้นหา
            </button>
            <button 
              onClick={clearFilters}
              style={{ padding: '8px 24px', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 500, cursor: 'pointer' }}
            >
              ล้าง
            </button>
          </div>
        </div>
      </div>

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
        title="ยืนยันการลบรายการเบิก"
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
            คุณแน่ใจหรือไม่ที่จะลบรายการเบิกสินค้า <strong>{recordToDelete?.product_name}</strong>?
          </p>
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            การลบรายการนี้ ระบบจะคืนสต็อกสินค้าจำนวน <strong>{recordToDelete?.quantity} ชิ้น</strong> กลับเข้าคลังอัตโนมัติ
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
