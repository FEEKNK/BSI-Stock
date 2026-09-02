import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  Search, 
  Package, 
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';
import { useAppContext } from '../../context/AppContext';
import './StockAlertModal.css';

const SESSION_DISMISS_KEY = 'bsi_stock_alert_dismissed';

export function StockAlertModal() {
  const navigate = useNavigate();
  const { alerts } = useAlerts();
  const { isLoadingProducts } = useAppContext();

  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'DANGER' | 'WARNING'
  const [searchQuery, setSearchQuery] = useState('');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Trigger popup when products are loaded and there are active alerts
  useEffect(() => {
    if (!isLoadingProducts && !hasInitialized) {
      setHasInitialized(true);
      const isDismissed = sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true';
      if (!isDismissed && alerts.length > 0) {
        setIsOpen(true);
      }
    }
  }, [isLoadingProducts, hasInitialized, alerts.length]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dontShowAgain]);

  // Count stats
  const { dangerCount, warningCount } = useMemo(() => {
    let danger = 0;
    let warning = 0;
    alerts.forEach((item) => {
      if (item.type === 'danger') danger++;
      else if (item.type === 'warning') warning++;
    });
    return { dangerCount: danger, warningCount: warning };
  }, [alerts]);

  // Filtered and sorted alerts
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((item) => {
        // Tab filter
        if (filterType === 'DANGER' && item.type !== 'danger') return false;
        if (filterType === 'WARNING' && item.type !== 'warning') return false;

        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchName = (item.productName || '').toLowerCase().includes(query);
          const matchCode = (item.product_code || '').toLowerCase().includes(query);
          const matchCat = (item.category || '').toLowerCase().includes(query);
          const matchSize = (item.size || '').toLowerCase().includes(query);
          return matchName || matchCode || matchCat || matchSize;
        }

        return true;
      })
      .sort((a, b) => {
        // Danger (0 stock) first, then lowest stock
        if (a.stock !== b.stock) return a.stock - b.stock;
        return (a.productName || '').localeCompare(b.productName || '');
      });
  }, [alerts, filterType, searchQuery]);

  const handleClose = () => {
    if (dontShowAgain) {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    }
    setIsOpen(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleGoToProducts = () => {
    handleClose();
    navigate('/products');
  };

  if (!isOpen || alerts.length === 0) {
    return null;
  }

  return (
    <div 
      className="stock-alert-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-alert-title"
    >
      <div className="stock-alert-dialog">
        {/* Header */}
        <div className="stock-alert-header">
          <div className="stock-alert-header-left">
            <div className="stock-alert-icon-wrap">
              <BellRing size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 id="stock-alert-title" className="stock-alert-title">
                แจ้งเตือนสต็อกสินค้าด่วน
              </h2>
              <p className="stock-alert-subtitle">
                มีสินค้าที่หมดสต็อกหรือต่ำกว่าเกณฑ์แจ้งเตือน ({alerts.length} รายการ)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="stock-alert-close-btn" 
            onClick={handleClose} 
            title="ปิดหน้าต่าง (Esc)"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Stat Cards */}
        <div className="stock-alert-stats">
          <div 
            className={`stock-alert-stat-card danger ${filterType === 'DANGER' ? 'active' : ''}`}
            onClick={() => setFilterType(prev => prev === 'DANGER' ? 'ALL' : 'DANGER')}
            title="คลิกเพื่อกรองเฉพาะสินค้าที่หมดสต็อก"
          >
            <div className="stock-alert-stat-info">
              <span className="stock-alert-stat-label">🔴 หมดสต็อก (0 ชิ้น)</span>
              <span className="stock-alert-stat-value">{dangerCount} รายการ</span>
            </div>
            <AlertCircle size={28} color="#dc2626" />
          </div>

          <div 
            className={`stock-alert-stat-card warning ${filterType === 'WARNING' ? 'active' : ''}`}
            onClick={() => setFilterType(prev => prev === 'WARNING' ? 'ALL' : 'WARNING')}
            title="คลิกเพื่อกรองเฉพาะสินค้าที่ใกล้หมด"
          >
            <div className="stock-alert-stat-info">
              <span className="stock-alert-stat-label">🟡 สินค้าใกล้หมด</span>
              <span className="stock-alert-stat-value">{warningCount} รายการ</span>
            </div>
            <AlertTriangle size={28} color="#d97706" />
          </div>
        </div>

        {/* Toolbar: Tabs & Search */}
        <div className="stock-alert-toolbar">
          <div className="stock-alert-tabs">
            <button
              type="button"
              className={`stock-alert-tab ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              ทั้งหมด ({alerts.length})
            </button>
            <button
              type="button"
              className={`stock-alert-tab ${filterType === 'DANGER' ? 'active' : ''}`}
              onClick={() => setFilterType('DANGER')}
            >
              หมดสต็อก ({dangerCount})
            </button>
            <button
              type="button"
              className={`stock-alert-tab ${filterType === 'WARNING' ? 'active' : ''}`}
              onClick={() => setFilterType('WARNING')}
            >
              ใกล้หมด ({warningCount})
            </button>
          </div>

          <div className="stock-alert-search-wrap">
            <Search size={14} className="stock-alert-search-icon" />
            <input
              type="text"
              className="stock-alert-search-input"
              placeholder="ค้นหาชื่อ, รหัส, ไซส์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List of items */}
        <div className="stock-alert-body">
          {filteredAlerts.length === 0 ? (
            <div className="stock-alert-empty">
              <CheckCircle2 size={36} color="#10b981" />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขค้นหา
              </span>
            </div>
          ) : (
            <div className="stock-alert-list">
              {filteredAlerts.map((item) => (
                <div 
                  key={item.id} 
                  className={`stock-alert-row ${item.type === 'danger' ? 'danger' : 'warning'}`}
                >
                  <div className="stock-alert-row-main">
                    <div className="stock-alert-row-meta">
                      <div className="stock-alert-row-name" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="stock-alert-row-tags">
                        {item.product_code && (
                          <span className="stock-alert-tag-code">
                            รหัส: {item.product_code}
                          </span>
                        )}
                        <span>{item.category}</span>
                        {item.size && item.size !== '-' && (
                          <span className="stock-alert-tag-size">
                            ไซส์: {item.size}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="stock-alert-row-right">
                    <span 
                      className={`stock-alert-badge ${item.type === 'danger' ? 'danger' : 'warning'}`}
                    >
                      {item.type === 'danger' ? (
                        <>
                          <AlertCircle size={13} />
                          หมดสต็อก (0)
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={13} />
                          เหลือ {item.stock} ชิ้น (เกณฑ์ ≤ {item.threshold})
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="stock-alert-footer">
          <label className="stock-alert-checkbox-label">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span>ไม่ต้องแจ้งเตือนอีกในรอบนี้ (เซสชันนี้)</span>
          </label>

          <div className="stock-alert-actions">
            <button
              type="button"
              className="stock-alert-btn-close"
              onClick={handleClose}
            >
              ปิด
            </button>
            <button
              type="button"
              className="stock-alert-btn-primary"
              onClick={handleGoToProducts}
            >
              <Package size={16} />
              <span>จัดการสต็อกสินค้า</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
