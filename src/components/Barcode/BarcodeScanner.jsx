import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export function BarcodeScanner({ onScan, onError }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10,
        qrbox: { width: 250, height: 100 },
        formatsToSupport: [ Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13 ]
      },
      false
    );

    scannerRef.current.render(onScan, onError);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [onScan, onError]);

  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
      <div id="reader" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}></div>
      <style>{`
        #reader__dashboard_section_csr button {
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: var(--radius-md);
          cursor: pointer;
        }
        #reader__dashboard_section_swaplink {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
