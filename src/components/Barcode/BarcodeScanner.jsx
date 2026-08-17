import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, SwitchCamera, AlertCircle } from 'lucide-react';

export function BarcodeScanner({ onScan, onError, elementId = "reader" }) {
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);
  const lastScanTime = useRef(0);
  
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Keep references to latest callbacks
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  // Fetch available cameras on mount
  useEffect(() => {
    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (isMounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available, otherwise first camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else if (isMounted) {
          setErrorMessage('ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้');
          setIsInitializing(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error getting cameras:", err);
          setErrorMessage('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์การใช้งานกล้อง');
          setIsInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Start / restart scanner when camera is selected
  useEffect(() => {
    if (!selectedCameraId) return;

    const qrCode = new Html5Qrcode(elementId);
    scannerRef.current = qrCode;

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const width = Math.floor(minEdge * 0.8);
        const height = Math.floor(minEdge * 0.5);
        return { width: Math.max(220, width), height: Math.max(120, height) };
      },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ]
    };

    setIsInitializing(true);
    setErrorMessage('');

    qrCode
      .start(
        selectedCameraId,
        config,
        (decodedText, decodedResult) => {
          const now = Date.now();
          // Debounce rapid multiple reads
          if (now - lastScanTime.current > 2000) {
            lastScanTime.current = now;
            if (onScanRef.current) {
              onScanRef.current(decodedText, decodedResult);
            }
          }
        },
        (errorMsg) => {
          if (onErrorRef.current) {
            onErrorRef.current(errorMsg);
          }
        }
      )
      .then(() => {
        isRunningRef.current = true;
        setIsInitializing(false);
      })
      .catch((err) => {
        console.error("Failed to start scanner:", err);
        setErrorMessage('ไม่สามารถเริ่มกล้องได้ กรุณาลองใหม่อีกครั้ง');
        setIsInitializing(false);
      });

    return () => {
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            isRunningRef.current = false;
            try {
              scannerRef.current.clear();
            } catch (e) {}
          })
          .catch((err) => {
            console.error("Failed to stop scanner:", err);
          });
      } else if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
      }
    };
  }, [elementId, selectedCameraId]);

  return (
    <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Clean camera selector if multiple cameras exist */}
      {cameras.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <SwitchCamera size={18} style={{ color: 'var(--text-secondary)' }} />
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem'
            }}
          >
            {cameras.map((camera, index) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `กล้อง ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {errorMessage ? (
        <div style={{
          padding: '24px 16px',
          textAlign: 'center',
          backgroundColor: 'var(--danger-bg, #fef2f2)',
          color: 'var(--danger, #ef4444)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={32} />
          <div style={{ fontWeight: 600 }}>{errorMessage}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            โปรดตรวจสอบว่าได้เปิดสิทธิ์กล้องในเบราว์เซอร์แล้ว หรือไม่มีแอปอื่นกำลังใช้งานกล้องอยู่
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: '#000', border: '1px solid var(--border)' }}>
          <div id={elementId} style={{ width: '100%' }}></div>
          {isInitializing && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              gap: '8px',
              zIndex: 10
            }}>
              <Camera size={28} className="animate-pulse" />
              <span style={{ fontSize: '0.875rem' }}>กำลังเปิดกล้อง...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
