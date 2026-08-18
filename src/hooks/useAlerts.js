import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export function useAlerts() {
  const { products, settings, setSettings } = useAppContext();

  const alerts = useMemo(() => {
    if (!settings.notificationsEnabled) return [];

    const defaultThreshold = settings.globalThreshold !== undefined ? Number(settings.globalThreshold) : 30;
    const generatedAlerts = [];

    products.forEach(p => {
      const threshold = p.threshold !== undefined && p.threshold !== null && p.threshold !== ''
        ? Number(p.threshold) 
        : defaultThreshold;

      const sizeKeys = p.sizes ? Object.keys(p.sizes) : [];

      if (sizeKeys.length === 0) {
        const stock = Number(p.total_stock ?? p.totalStock ?? 0);
        if (stock === 0) {
          generatedAlerts.push({
            id: `out-${p.id}`,
            productId: p.id,
            productName: p.name,
            size: '-',
            type: 'danger',
            message: `สินค้า ${p.name} หมดสต็อกแล้ว`
          });
        } else if (stock <= threshold) {
          generatedAlerts.push({
            id: `low-${p.id}`,
            productId: p.id,
            productName: p.name,
            size: '-',
            type: 'warning',
            message: `สินค้า ${p.name} ใกล้หมด (เหลือ ${stock} ชิ้น)`
          });
        }
      } else {
        sizeKeys.forEach(size => {
          const sizeData = p.sizes[size];
          const stock = sizeData
            ? (typeof sizeData === 'object' ? Number(sizeData.stock ?? 0) : Number(sizeData))
            : 0;

          if (stock === 0) {
            generatedAlerts.push({
              id: `out-${p.id}-${size}`,
              productId: p.id,
              productName: p.name,
              size: size,
              type: 'danger',
              message: `สินค้า ${p.name} (ไซส์ ${size}) หมดสต็อกแล้ว`
            });
          } else if (stock <= threshold) {
            generatedAlerts.push({
              id: `low-${p.id}-${size}`,
              productId: p.id,
              productName: p.name,
              size: size,
              type: 'warning',
              message: `สินค้า ${p.name} (ไซส์ ${size}) ใกล้หมด (เหลือ ${stock} ชิ้น)`
            });
          }
        });
      }
    });

    return generatedAlerts;
  }, [products, settings]);

  const setGlobalThreshold = (threshold) => {
    setSettings(prev => ({ ...prev, globalThreshold: threshold }));
  };

  const toggleNotifications = (enabled) => {
    setSettings(prev => ({ ...prev, notificationsEnabled: enabled }));
  };

  return {
    alerts,
    settings,
    setGlobalThreshold,
    toggleNotifications
  };
}
