import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export function useAlerts() {
  const { products, settings, setSettings } = useAppContext();

  const alerts = useMemo(() => {
    if (!settings.notificationsEnabled) return [];

    const generatedAlerts = [];
    products.forEach(p => {
      const threshold = p.threshold || settings.globalThreshold;
      if (p.totalStock === 0) {
        generatedAlerts.push({
          id: `out-${p.id}`,
          productId: p.id,
          productName: p.name,
          type: 'danger',
          message: `สินค้า ${p.name} หมดสต็อกแล้ว`
        });
      } else if (p.totalStock <= threshold) {
        generatedAlerts.push({
          id: `low-${p.id}`,
          productId: p.id,
          productName: p.name,
          type: 'warning',
          message: `สินค้า ${p.name} ใกล้หมด (เหลือ ${p.totalStock} ชิ้น)`
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
