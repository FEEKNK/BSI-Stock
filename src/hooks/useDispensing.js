import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export function useDispensing() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshProducts } = useAppContext();

  const fetchHistory = useCallback(async (filters = {}) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.hn) queryParams.append('hn', filters.hn);
      if (filters.product_name) queryParams.append('product_name', filters.product_name);
      if (filters.seller) queryParams.append('seller', filters.seller);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const res = await fetch(`/api/dispensing-history?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching dispensing history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addRecord = async (recordData) => {
    try {
      const res = await fetch('/api/dispensing-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });
      if (res.ok) {
        const newRecord = await res.json();
        setHistory(prev => [newRecord, ...prev]);
        refreshProducts();
        return { success: true };
      }
      return { success: false, error: 'Failed to add record' };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const updateRecord = async (id, updates) => {
    try {
      const res = await fetch(`/api/dispensing-history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedRecord = await res.json();
        setHistory(prev => prev.map(r => r.id === id ? updatedRecord : r));
        refreshProducts();
        return { success: true };
      }
      return { success: false, error: 'Failed to update record' };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const deleteRecord = async (id) => {
    try {
      const res = await fetch(`/api/dispensing-history/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHistory(prev => prev.filter(r => r.id !== id));
        refreshProducts();
        return { success: true };
      }
      return { success: false, error: 'Failed to delete record' };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  return {
    history,
    isLoading,
    fetchHistory,
    addRecord,
    updateRecord,
    deleteRecord
  };
}
