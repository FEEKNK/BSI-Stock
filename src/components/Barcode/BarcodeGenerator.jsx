import React, { useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Download } from 'lucide-react';

export function BarcodeGenerator({ value }) {
  const barcodeRef = useRef(null);
  
  React.useEffect(() => {
    if (value && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          lineColor: "#0f172a",
          background: "transparent",
          width: 2,
          height: 80,
          displayValue: true
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [value]);

  const downloadBarcode = () => {
    if (!barcodeRef.current) return;
    const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 20, 20);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `barcode-${value}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!value) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ padding: '24px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <svg ref={barcodeRef}></svg>
      </div>
      <button
        className="no-print"
        onClick={downloadBarcode}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          borderRadius: 'var(--radius-md)',
          fontWeight: 500
        }}
      >
        <Download size={18} /> ดาวน์โหลด (PNG)
      </button>
    </div>
  );
}
