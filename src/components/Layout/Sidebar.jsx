import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Barcode, Settings, Tags } from 'lucide-react';
import logoSvg from '../../assets/logo.svg';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { path: '/products', icon: Package, label: 'จัดการสินค้า' },
  { path: '/categories', icon: Tags, label: 'หมวดหมู่' },
  { path: '/barcode', icon: Barcode, label: 'สแกนบาร์โค้ด' },
  { path: '/settings', icon: Settings, label: 'การตั้งค่า' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <img src={logoSvg} alt="BSI Logo" className="sidebar-logo" />
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
