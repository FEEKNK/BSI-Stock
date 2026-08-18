import { useAppContext } from '../context/AppContext';

export function useProducts() {
  const { products, isLoadingProducts, addProduct, updateProduct, deleteProduct, updateStock, updateProductStock, refreshProducts } = useAppContext();

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
    return products.filter(p => {
      if (filters.search) {
        const searchLower = String(filters.search).trim().toLowerCase();
        
        // Match product name only
        const matchName = p.name && String(p.name).toLowerCase().includes(searchLower);

        if (!matchName) {
          return false;
        }
      }

      if (filters.category && filters.category !== 'all') {
        if (p.category !== filters.category) return false;
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
