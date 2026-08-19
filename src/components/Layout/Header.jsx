import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Settings, ExternalLink, X, LayoutGrid, List } from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';
import './Header.css';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { alerts } = useAlerts();
  
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'DANGER' | 'WARNING'
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const dropdownRef = useRef(null);
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'แดชบอร์ด';
      case '/products': return 'จัดการสินค้า';
      case '/categories': return 'จัดการหมวดหมู่และรหัส';
      case '/barcode': return 'สแกนเบิก/รับสินค้า';
      case '/history': return 'ประวัติคลังสินค้า';
      case '/settings': return 'การตั้งค่าระบบ';
      default: return 'BSI Stock';
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Process and sort alerts
  const { groupedAlerts, flatAlerts, outOfStockCount, lowStockCount } = useMemo(() => {
    let outCount = 0;
    let lowCount = 0;

    const filtered = alerts.filter(a => {
      if (a.type === 'danger') outCount++;
      if (a.type === 'warning') lowCount++;

      if (filterType === 'DANGER') return a.type === 'danger';
      if (filterType === 'WARNING') return a.type === 'warning';
      return true;
    });

    // 1. Grouped by product
    const groups = {};
    filtered.forEach(alertItem => {
      if (!groups[alertItem.productId]) {
        groups[alertItem.productId] = {
          productId: alertItem.productId,
          productName: alertItem.productName,
          category: alertItem.category || 'อื่นๆ',
          minStock: alertItem.stock,
          hasDanger: false,
          items: []
        };
      }
      if (alertItem.type === 'danger') {
        groups[alertItem.productId].hasDanger = true;
      }
      if (alertItem.stock < groups[alertItem.productId].minStock) {
        groups[alertItem.productId].minStock = alertItem.stock;
      }
      groups[alertItem.productId].items.push(alertItem);
    });

    // Sort items within each group: 0 stock first, then lowest stock
    Object.values(groups).forEach(g => {
      g.items.sort((a, b) => {
        if (a.stock !== b.stock) return a.stock - b.stock;
        return (a.size || '').localeCompare(b.size || '');
      });
    });

    // Sort product groups: lowest minimum stock first (so products with 0 stock appear first), then name
    const sortedGroups = Object.values(groups).sort((a, b) => {
      if (a.minStock !== b.minStock) return a.minStock - b.minStock;
      return (a.productName || '').localeCompare(b.productName || '');
    });

    // 2. Flat sorted list (identical order to the Urgent Dashboard table)
    const flatSorted = [...filtered].sort((a, b) => {
      if (a.stock !== b.stock) return a.stock - b.stock;
      return (a.productName || '').localeCompare(b.productName || '');
    });

    return {
      groupedAlerts: sortedGroups,
      flatAlerts: flatSorted,
      outOfStockCount: outCount,
      lowStockCount: lowCount
    };
  }, [alerts, filterType]);

  const unreadAlertsCount = alerts.length;

  const handleProductClick = () => {
    setIsOpen(false);
    navigate('/products');
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    navigate('/settings');
  };

  return (
    <header className="header">
      <h2 className="page-title">{getPageTitle()}</h2>
      
      <div className="header-actions" ref={dropdownRef}>
        {/* Notification Bell Button */}
        <button 
          type="button"
          className={`notification-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(prev => !prev)}
          title="แจ้งเตือนสินค้าใกล้หมด / หมดสต็อก"
          aria-expanded={isOpen}
        >
          <Bell size={20} />
          {unreadAlertsCount > 0 && (
            <span className="badge">
              {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown Menu */}
        {isOpen && (
          <div className="notification-dropdown">
            {/* Header */}
            <div className="notif-header">
              <div className="notif-header-title">
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  การแจ้งเตือนสต็อก
                </span>
                {unreadAlertsCount > 0 && (
                  <span className="notif-count-badge">
                    {unreadAlertsCount} รายการ
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* View Mode Toggle */}
                {alerts.length > 0 && (
                  <div className="notif-view-toggle">
                    <button 
                      type="button" 
                      className={`notif-toggle-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                      onClick={() => setViewMode('grouped')}
                      title="จัดกลุ่มตามสินค้า"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button 
                      type="button" 
                      className={`notif-toggle-btn ${viewMode === 'flat' ? 'active' : ''}`}
                      onClick={() => setViewMode('flat')}
                      title="เรียงตามลำดับด่วนที่สุด"
                    >
                      <List size={14} />
                    </button>
                  </div>
                )}

                <button 
                  type="button" 
                  className="notif-close-btn"
                  onClick={() => setIsOpen(false)}
                  title="ปิด"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Summary */}
            {alerts.length > 0 && (
              <div className="notif-filter-bar">
                <button 
                  type="button"
                  className={`notif-filter-tab ${filterType === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilterType('ALL')}
                >
                  ทั้งหมด ({alerts.length})
                </button>
                <button 
                  type="button"
                  className={`notif-filter-tab danger ${filterType === 'DANGER' ? 'active' : ''}`}
                  onClick={() => setFilterType('DANGER')}
                >
                  หมดสต็อก ({outOfStockCount})
                </button>
                <button 
                  type="button"
                  className={`notif-filter-tab warning ${filterType === 'WARNING' ? 'active' : ''}`}
                  onClick={() => setFilterType('WARNING')}
                >
                  ใกล้หมด ({lowStockCount})
                </button>
              </div>
            )}

            {/* Notification Body / List */}
            <div className="notif-body">
              {flatAlerts.length === 0 ? (
                <div className="notif-empty">
                  <CheckCircle2 size={36} color="#10b981" />
                  <p style={{ margin: '8px 0 0 0', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {alerts.length === 0 ? 'สต็อกสินค้าทุกรายการอยู่ในระดับปกติ' : 'ไม่มีรายการในตัวกรองนี้'}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {alerts.length === 0 ? 'ไม่มีสินค้าที่หมดหรือต่ำกว่าเกณฑ์แจ้งเตือน' : 'ลองเลือกแท็บตัวกรองอื่น'}
                  </span>
                </div>
              ) : viewMode === 'grouped' ? (
                /* Grouped by Product View */
                <div className="notif-list">
                  {groupedAlerts.map(group => (
                    <div key={group.productId} className="notif-group-card">
                      {/* Product Header */}
                      <div className="notif-group-header" onClick={handleProductClick}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span className="notif-product-name" title={group.productName}>
                            {group.productName}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            ({group.category})
                          </span>
                        </div>
                        <span className="notif-view-link">
                          จัดการ <ChevronRight size={14} />
                        </span>
                      </div>

                      {/* Size-level Alert Items */}
                      <div className="notif-group-items">
                        {group.items.map(item => (
                          <div 
                            key={item.id} 
                            className={`notif-item-row ${item.type === 'danger' ? 'danger' : 'warning'}`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {item.type === 'danger' ? (
                                <AlertCircle size={15} className="notif-icon danger" />
                              ) : (
                                <AlertTriangle size={15} className="notif-icon warning" />
                              )}
                              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                                ไซส์ {item.size}
                              </span>
                            </div>

                            <span className={`notif-badge ${item.type === 'danger' ? 'badge-danger' : 'badge-warning'}`}>
                              {item.type === 'danger' ? 'หมดสต็อก (0 ชิ้น)' : `เหลือ ${item.stock} ชิ้น`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Flat Urgent List (1:1 with Urgent Table) */
                <div className="notif-list">
                  {flatAlerts.map(item => (
                    <div 
                      key={item.id} 
                      className={`notif-flat-row ${item.type === 'danger' ? 'danger' : 'warning'}`}
                      onClick={handleProductClick}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        {item.type === 'danger' ? (
                          <AlertCircle size={16} className="notif-icon danger" />
                        ) : (
                          <AlertTriangle size={16} className="notif-icon warning" />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.productName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            {item.category} • ไซส์ <strong style={{ color: 'var(--text-secondary)' }}>{item.size}</strong>
                          </div>
                        </div>
                      </div>

                      <span className={`notif-badge ${item.type === 'danger' ? 'badge-danger' : 'badge-warning'}`}>
                        {item.type === 'danger' ? 'หมดสต็อก (0 ชิ้น)' : `เหลือ ${item.stock} ชิ้น`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="notif-footer">
              <button 
                type="button" 
                className="notif-footer-btn"
                onClick={handleProductClick}
              >
                <ExternalLink size={14} />
                ดูรายการสินค้าทั้งหมด
              </button>
              <button 
                type="button" 
                className="notif-footer-btn secondary"
                onClick={handleSettingsClick}
                title="ตั้งค่าเกณฑ์การแจ้งเตือน"
              >
                <Settings size={14} />
                ตั้งค่า
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}


