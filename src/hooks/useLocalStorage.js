import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    return storage.load(key, initialValue);
  });

  useEffect(() => {
    storage.save(key, storedValue);
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
