import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export function StaffSelector({ value, onChange, error }) {
  const { settings, updateSettings } = useAppContext();
  const staffList = settings?.staffList || [];
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  // Initialize from local storage on mount if no value is provided
  useEffect(() => {
    if (!value) {
      const lastUsed = localStorage.getItem('lastUsedStaffName');
      if (lastUsed && staffList.includes(lastUsed)) {
        onChange({ target: { name: 'seller', value: lastUsed } });
      } else if (staffList.length > 0) {
        onChange({ target: { name: 'seller', value: staffList[0] } });
      }
    }
  }, []);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    localStorage.setItem('lastUsedStaffName', val);
    onChange(e);
  };

  const handleAddSubmit = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setIsAdding(false);
      return;
    }
    
    if (!staffList.includes(trimmed)) {
      const newList = [...staffList, trimmed];
      await updateSettings({ ...settings, staffList: newList });
    }
    
    localStorage.setItem('lastUsedStaffName', trimmed);
    onChange({ target: { name: 'seller', value: trimmed } });
    setIsAdding(false);
    setNewName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubmit();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewName('');
    }
  };

  const handleDelete = async () => {
    if (!value || !staffList.includes(value)) return;
    
    if (window.confirm(`คุณต้องการลบชื่อ "${value}" ออกจากรายการใช่หรือไม่?`)) {
      const newList = staffList.filter(name => name !== value);
      await updateSettings({ ...settings, staffList: newList });
      
      const nextValue = newList.length > 0 ? newList[0] : '';
      if (nextValue) {
        localStorage.setItem('lastUsedStaffName', nextValue);
      } else {
        localStorage.removeItem('lastUsedStaffName');
      }
      onChange({ target: { name: 'seller', value: nextValue } });
    }
  };

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    width: '100%',
    flex: 1
  };

  if (isAdding) {
    return (
      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ชื่อพนักงานใหม่..."
          style={inputStyle}
          autoFocus
        />
        <button
          type="button"
          onClick={handleAddSubmit}
          title="บันทึกชื่อ"
          style={{ 
            padding: '0 16px', 
            backgroundColor: 'var(--primary)', 
            color: '#ffffff', 
            border: 'none', 
            borderRadius: 'var(--radius-md)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '4px',
            fontWeight: 500
          }}
        >
          <Check size={18} /> บันทึก
        </button>
        <button
          type="button"
          onClick={() => { setIsAdding(false); setNewName(''); }}
          title="ยกเลิก"
          style={{ 
            padding: '0 14px', 
            backgroundColor: 'var(--bg-main)', 
            color: 'var(--text-secondary)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
      <select
        name="seller"
        value={value || ''}
        onChange={handleSelectChange}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="" disabled>-- เลือกชื่อพนักงาน --</option>
        {staffList.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => { setIsAdding(true); setNewName(''); }}
        title="เพิ่มชื่อพนักงานใหม่"
        style={{ 
          padding: '0 14px', 
          backgroundColor: 'var(--primary-light)', 
          color: 'var(--primary)', 
          border: '1px solid var(--primary)', 
          borderRadius: 'var(--radius-md)', 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Plus size={18} />
      </button>
      
      {value && staffList.includes(value) && (
        <button
          type="button"
          onClick={handleDelete}
          title="ลบรายชื่อนี้"
          style={{ 
            padding: '0 14px', 
            backgroundColor: 'var(--danger-bg)', 
            color: 'var(--danger)', 
            border: '1px solid var(--danger)', 
            borderRadius: 'var(--radius-md)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}
