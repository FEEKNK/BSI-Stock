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
      const stock = p.totalStock || p.total_stock || (p.sizes ? Object.values(p.sizes).reduce((sum, d) => sum + (Number(typeof d === 'object' ? d?.stock : d) || 0), 0) : 0);
      totalItems += stock;
      
      if (p.totalStock === 0) {
        outOfStockCount++;
      } else if (p.totalStock <= threshold) {
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
      .filter(p => {
        const threshold = p.threshold || settings.globalThreshold;
        return p.totalStock <= threshold;
      })
      .sort((a, b) => (a.totalStock || 0) - (b.totalStock || 0));
  }, [products, settings.globalThreshold]);

  return {
    stats,
    categoryBreakdown,
    lowStockItems
  };
}
