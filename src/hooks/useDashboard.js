import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export function useDashboard() {
  const { products, settings } = useAppContext();

  // Low stock / Out of stock items broken down by each SIZE
  const { stats, lowStockItems } = useMemo(() => {
    const totalProducts = products.length;
    let totalItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockList = [];

    const defaultThreshold = settings.globalThreshold !== undefined ? Number(settings.globalThreshold) : 5;

    products.forEach(p => {
      const threshold = p.threshold !== undefined && p.threshold !== null && p.threshold !== ''
        ? Number(p.threshold) 
        : defaultThreshold;

      const sizeKeys = p.sizes ? Object.keys(p.sizes) : [];

      if (sizeKeys.length === 0) {
        const stock = Number(p.total_stock ?? p.totalStock ?? 0);
        totalItems += stock;

        if (stock === 0) {
          outOfStockCount++;
        } else if (stock <= threshold) {
          lowStockCount++;
        }

        if (stock <= threshold) {
          lowStockList.push({
            id: `${p.id}_all`,
            productId: p.id,
            name: p.name,
            product_code: p.product_code,
            category: p.category || 'ไม่มีหมวดหมู่',
            size: '-',
            barcode: p.barcode || '-',
            computedStock: stock,
            threshold: threshold
          });
        }
      } else {
        sizeKeys.forEach(size => {
          const sizeData = p.sizes[size];
          const stock = sizeData
            ? (typeof sizeData === 'object' ? Number(sizeData.stock ?? 0) : Number(sizeData))
            : 0;
          const barcode = (typeof sizeData === 'object' ? sizeData.barcode : '') || p.barcode || '-';

          totalItems += stock;

          if (stock === 0) {
            outOfStockCount++;
          } else if (stock <= threshold) {
            lowStockCount++;
          }

          if (stock <= threshold) {
            lowStockList.push({
              id: `${p.id}_${size}`,
              productId: p.id,
              name: p.name,
              product_code: p.product_code,
              category: p.category || 'ไม่มีหมวดหมู่',
              size: size,
              barcode: barcode,
              computedStock: stock,
              threshold: threshold
            });
          }
        });
      }
    });

    // Sort: Out of stock (0) first, then lowest stock, then product name
    lowStockList.sort((a, b) => {
      if (a.computedStock !== b.computedStock) {
        return a.computedStock - b.computedStock;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      stats: {
        totalProducts,
        totalItems,
        lowStockCount,
        outOfStockCount
      },
      lowStockItems: lowStockList
    };
  }, [products, settings.globalThreshold]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    products.forEach(p => {
      const cat = p.category || 'ไม่มีหมวดหมู่';
      if (!breakdown[cat]) {
        breakdown[cat] = 0;
      }
      breakdown[cat]++;
    });
    return breakdown;
  }, [products]);

  return {
    stats,
    categoryBreakdown,
    lowStockItems
  };
}
