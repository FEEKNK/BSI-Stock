import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';
import './Header.css';

export function Header() {
  const location = useLocation();
  const { alerts } = useAlerts();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'แดชบอร์ด';
      case '/products': return 'จัดการสินค้า';
      case '/barcode': return 'จัดการบาร์โค้ด';
      case '/settings': return 'การตั้งค่าระบบ';
      default: return 'BSI Stock';
    }
  };

  const unreadAlertsCount = alerts.length;

  return (
    <header className="header">
      <h2 className="page-title">{getPageTitle()}</h2>
      <div className="header-actions">
        <div className="notification-btn">
          <Bell size={20} />
          {unreadAlertsCount > 0 && (
            <span className="badge">{unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}</span>
          )}
        </div>
      </div>
    </header>
  );
}
