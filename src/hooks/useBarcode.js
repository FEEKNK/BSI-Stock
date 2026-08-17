import { useState, useCallback } from 'react';
import { generateBarcodeValue } from '../utils/barcode';

export function useBarcode() {
  const [isScanning, setIsScanning] = useState(false);
  
  const startScanning = useCallback(() => {
    setIsScanning(true);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  const generateNewBarcode = useCallback(() => {
    return generateBarcodeValue();
  }, []);

  return {
    isScanning,
    startScanning,
    stopScanning,
    generateNewBarcode
  };
}
