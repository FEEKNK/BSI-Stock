import { useAppContext } from '../context/AppContext';

export function useProducts() {
  const { products, isLoadingProducts, addProduct, updateProduct, deleteProduct, updateStock, updateProductStock, refreshProducts, settings } = useAppContext();

  const getProductByBarcode = (barcode) => {
    if (!barcode) return null;
    const cleanBarcode = String(barcode).trim().toLowerCase();
    for (const p of products) {
      if (p.barcode && String(p.barcode).trim().toLowerCase() === cleanBarcode) {
        return { product: p, matchedSize: null };
      }
      if (p.product_code && String(p.product_code).trim().toLowerCase() === cleanBarcode) {
        return { product: p, matchedSize: null };
      }
      if (p.sizes) {
        for (const [sizeKey, sizeData] of Object.entries(p.sizes)) {
          if (sizeData && typeof sizeData === 'object' && sizeData.barcode && String(sizeData.barcode).trim().toLowerCase() === cleanBarcode) {
            return { product: p, matchedSize: sizeKey };
          }
        }
      }
    }
    return null;
  };

  const filterProducts = (filters) => {
    const globalTh = Number(settings?.globalThreshold) || 30;

    return products.filter(p => {
      if (filters.search) {
        const searchLower = String(filters.search).trim().toLowerCase();
        
        // Match product name, code, or barcode
        const matchName = p.name && String(p.name).toLowerCase().includes(searchLower);
        const matchCode = p.product_code && String(p.product_code).toLowerCase().includes(searchLower);
        const matchBarcode = p.barcode && String(p.barcode).toLowerCase().includes(searchLower);
        
        let matchSizeBarcode = false;
        if (p.sizes) {
          for (const sData of Object.values(p.sizes)) {
            if (sData && typeof sData === 'object' && sData.barcode && String(sData.barcode).toLowerCase().includes(searchLower)) {
              matchSizeBarcode = true;
              break;
            }
          }
        }

        if (!matchName && !matchCode && !matchBarcode && !matchSizeBarcode) {
          return false;
        }
      }

      if (filters.category && filters.category !== 'all') {
        if (p.category !== filters.category) return false;
      }

      if (filters.stockStatus && filters.stockStatus !== 'all') {
        const threshold = p.threshold !== undefined && p.threshold !== null && p.threshold !== ''
          ? Number(p.threshold) 
          : globalTh;
        
        const sizeKeys = p.sizes ? Object.keys(p.sizes) : [];
        let hasOut = false;
        let hasLow = false;
        let hasNormal = false;

        if (sizeKeys.length === 0) {
          const stock = Number(p.totalStock ?? p.total_stock ?? 0);
          if (stock === 0) hasOut = true;
          else if (stock <= threshold) hasLow = true;
          else hasNormal = true;
        } else {
          sizeKeys.forEach(size => {
            const sData = p.sizes[size];
            const stock = sData ? (typeof sData === 'object' ? Number(sData?.stock ?? 0) : Number(sData)) : 0;
            if (stock === 0) hasOut = true;
            else if (stock <= threshold) hasLow = true;
            else hasNormal = true;
          });
        }

        if (filters.stockStatus === 'out_of_stock' && !hasOut) return false;
        if (filters.stockStatus === 'low_stock' && !hasLow) return false;
        if (filters.stockStatus === 'normal' && (hasOut || hasLow)) return false;
      }

      return true;
    });
  };

  return {
    products,
    isLoadingProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    updateProductStock,
    getProductByBarcode,
    filterProducts,
    refreshProducts
  };
}
