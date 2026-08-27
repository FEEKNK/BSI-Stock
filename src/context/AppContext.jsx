import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/constants';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  

  const [settings, setSettings] = useState({
    globalThreshold: 30,
    notificationsEnabled: true
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          globalThreshold: data.global_threshold,
          notificationsEnabled: data.notifications_enabled
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          global_threshold: newSettings.globalThreshold,
          notifications_enabled: newSettings.notificationsEnabled
        })
      });
      if (res.ok) {
        setSettings(newSettings);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, [fetchProducts, fetchSettings]);


  // Products Actions
  const addProduct = async (product) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        const newProduct = await res.json();
        await fetchProducts();
        return newProduct;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to add product');
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    }
  };
  
  const updateProduct = async (id, updates) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        await fetchProducts();
        return updated;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update product');
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  };
  
  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };
  
  const updateStock = async (productId, sizeKey, quantity) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    const oldSizeData = p.sizes[sizeKey];
    const isOldFormat = typeof oldSizeData === 'number' || typeof oldSizeData === 'string';
    const newSizeData = isOldFormat 
      ? { stock: Number(quantity), barcode: '' }
      : { ...(oldSizeData || { barcode: '' }), stock: Number(quantity) };

    const newSizes = { ...p.sizes, [sizeKey]: newSizeData };
    
    const totalStock = Object.values(newSizes).reduce((sum, sizeData) => {
      const stock = typeof sizeData === 'number' || typeof sizeData === 'string' ? sizeData : sizeData?.stock;
      return sum + (Number(stock) || 0);
    }, 0);

    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sizes: newSizes, totalStock })
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(prev => prev.map(prod => prod.id === productId ? updated : prod));
      }
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  };

  const updateProductStock = async (productId, newSizes, totalStock) => {
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sizes: newSizes, totalStock })
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(prev => prev.map(prod => prod.id === productId ? updated : prod));
      }
    } catch (err) {
      console.error('Error updating product stock bulk:', err);
    }
  };

  const value = useMemo(() => ({
    products,
    isLoadingProducts,
    setProducts,
    settings,
    updateSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    updateProductStock,
    refreshProducts: fetchProducts
  }), [
    products, 
    isLoadingProducts, 
    settings, 
    fetchProducts
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
