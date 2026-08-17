import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/constants';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  
  const [savedSizes, setSavedSizes] = useLocalStorage(STORAGE_KEYS.SAVED_SIZES, []);
  const [savedCategories, setSavedCategories] = useLocalStorage(STORAGE_KEYS.SAVED_CATEGORIES, []);

  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.SETTINGS, {
    globalThreshold: 30,
    notificationsEnabled: true
  });

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
  }, [fetchProducts]);

  useEffect(() => {
    // Migrate existing local storage to the new default of 30
    if (!localStorage.getItem('threshold_migrated_to_30')) {
      setSettings(prev => ({ ...prev, globalThreshold: 30 }));
      localStorage.setItem('threshold_migrated_to_30', 'true');
    }
  }, [setSettings]);

  // Size management
  const addSavedSize = useCallback((size) => {
    const trimmed = (size || '').trim();
    if (trimmed) {
      setSavedSizes(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    }
  }, [setSavedSizes]);

  const removeSavedSize = useCallback((size) => {
    setSavedSizes(prev => prev.filter(s => s !== size));
  }, [setSavedSizes]);

  // Category management
  const addSavedCategory = useCallback((category) => {
    const trimmed = (category || '').trim();
    if (trimmed) {
      setSavedCategories(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    }
  }, [setSavedCategories]);

  const removeSavedCategory = useCallback((category) => {
    setSavedCategories(prev => prev.filter(c => c !== category));
  }, [setSavedCategories]);
  
  // Products Actions
  const addProduct = async (product) => {
    // Auto-save category and sizes
    if (product.category) addSavedCategory(product.category);
    if (product.sizes) {
      Object.keys(product.sizes).forEach(size => addSavedSize(size));
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        const newProduct = await res.json();
        setProducts(prev => [newProduct, ...prev]);
      }
    } catch (err) {
      console.error('Error adding product:', err);
    }
  };
  
  const updateProduct = async (id, updates) => {
    // Auto-save category and sizes
    if (updates.category) addSavedCategory(updates.category);
    if (updates.sizes) {
      Object.keys(updates.sizes).forEach(size => addSavedSize(size));
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch (err) {
      console.error('Error updating product:', err);
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

  const value = useMemo(() => ({
    products,
    isLoadingProducts,
    setProducts,
    settings,
    setSettings,
    savedSizes,
    addSavedSize,
    removeSavedSize,
    savedCategories,
    addSavedCategory,
    removeSavedCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    refreshProducts: fetchProducts
  }), [
    products, 
    isLoadingProducts, 
    settings, 
    savedSizes, 
    addSavedSize, 
    removeSavedSize, 
    savedCategories, 
    addSavedCategory, 
    removeSavedCategory, 
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
