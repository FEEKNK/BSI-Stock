import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BarcodePage } from './pages/BarcodePage';
import { SettingsPage } from './pages/SettingsPage';
import { DispensingPage } from './pages/DispensingPage';

import './App.css';

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
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/barcode" element={<BarcodePage />} />
                  <Route path="/history" element={<DispensingPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </main>

            </div>
          </div>
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
