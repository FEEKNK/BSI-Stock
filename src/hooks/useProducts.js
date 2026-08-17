import { useAppContext } from '../context/AppContext';

export function useProducts() {
  const { products, isLoadingProducts, addProduct, updateProduct, deleteProduct, updateStock, refreshProducts } = useAppContext();

  const getProductByBarcode = (barcode) => {
    for (const p of products) {
      if (p.barcode === barcode) {
        return { product: p, matchedSize: null };
      }
      if (p.sizes) {
        for (const [sizeKey, sizeData] of Object.entries(p.sizes)) {
          if (sizeData && typeof sizeData === 'object' && sizeData.barcode === barcode) {
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
        const searchLower = filters.search.toLowerCase();
        if (!p.name.toLowerCase().includes(searchLower) && 
            !(p.barcode && p.barcode.includes(searchLower))) {
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
    getProductByBarcode,
    filterProducts,
    refreshProducts
  };
}
