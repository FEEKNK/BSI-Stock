import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export function useDashboard() {
  const { products, settings } = useAppContext();

  const stats = useMemo(() => {
    const totalProducts = products.length;
    let totalItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      const threshold = p.threshold || settings.globalThreshold;
      const stock = p.total_stock !== undefined ? p.total_stock : (p.totalStock !== undefined ? p.totalStock : (p.sizes ? Object.values(p.sizes).reduce((sum, d) => sum + (Number(typeof d === 'object' ? d?.stock : d) || 0), 0) : 0));
      totalItems += stock;
      
      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= threshold) {
        lowStockCount++;
      }
    });

    return {
      totalProducts,
      totalItems,
      lowStockCount,
      outOfStockCount
    };
  }, [products, settings.globalThreshold]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    products.forEach(p => {
      if (!breakdown[p.category]) {
        breakdown[p.category] = 0;
      }
      breakdown[p.category]++;
    });
    return breakdown;
  }, [products]);

  const lowStockItems = useMemo(() => {
    return products
      .map(p => {
        const stock = p.total_stock !== undefined ? p.total_stock : (p.totalStock !== undefined ? p.totalStock : (p.sizes ? Object.values(p.sizes).reduce((sum, d) => sum + (Number(typeof d === 'object' ? d?.stock : d) || 0), 0) : 0));
        return { ...p, computedStock: stock };
      })
      .filter(p => {
        const threshold = p.threshold || settings.globalThreshold;
        return p.computedStock <= threshold;
      })
      .sort((a, b) => a.computedStock - b.computedStock);
  }, [products, settings.globalThreshold]);

  return {
    stats,
    categoryBreakdown,
    lowStockItems
  };
}
