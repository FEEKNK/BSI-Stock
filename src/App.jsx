import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { StockAlertModal } from './components/common/StockAlertModal';
import { RefreshCw } from 'lucide-react';

import './App.css';

// Lazy Loaded Pages for Code Splitting & Performance
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const BarcodePage = lazy(() => import('./pages/BarcodePage').then(m => ({ default: m.BarcodePage })));
const DispensingPage = lazy(() => import('./pages/DispensingPage').then(m => ({ default: m.DispensingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Loading Fallback Component
function PageLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
      gap: '12px',
      color: 'var(--text-secondary)'
    }}>
      <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>กำลังโหลดหน้า...</span>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <div className="main-wrapper">
              <Header />
              <main className="main-content">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/barcode" element={<BarcodePage />} />
                    <Route path="/history" element={<DispensingPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </div>
          <StockAlertModal />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
