import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, X, ScanBarcode, RefreshCw } from 'lucide-react';
import { Button } from './Button';

/**
 * Escáner de códigos de barras / QR usando la cámara del dispositivo.
 * Soporta: EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, QR, etc.
 *
 * Props:
 *   onScan(code: string)  – llamado cuando se detecta un código
 *   onClose()             – cerrar el escáner
 *   isOpen: boolean       – controla visibilidad
 */
export default function BarcodeScanner({ onScan, onClose, isOpen }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const lastCodeRef = useRef('');
  const lastTimeRef = useRef(0);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async (cameraId) => {
    if (!containerRef.current) return;
    setError('');

    // 1) Pedir permiso de cámara explícitamente antes de iniciar html5-qrcode
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Cerrar el stream inmediatamente, solo lo usamos para pedir permiso
      stream.getTracks().forEach(track => track.stop());
    } catch (permErr) {
      const msg = permErr?.name || String(permErr);
      if (msg === 'NotAllowedError' || msg === 'PermissionDeniedError') {
        setError('Permiso de cámara denegado. Ve a la configuración de tu navegador y permite el acceso a la cámara para este sitio.');
      } else if (msg === 'NotFoundError' || msg === 'DevicesNotFoundError') {
        setError('No se encontró ninguna cámara conectada a este equipo.');
      } else {
        setError('No se pudo acceder a la cámara: ' + (permErr?.message || msg));
      }
      return;
    }

    // 2) Obtener lista de cámaras disponibles
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError('No se encontró ninguna cámara disponible.');
        return;
      }
      setCameras(devices);

      // Usar la cámara indicada, o preferir la trasera, o la primera disponible
      let camId = cameraId;
      if (!camId) {
        const backCam = devices.find(d => 
          /back|trasera|rear|environment/i.test(d.label)
        );
        camId = backCam ? backCam.id : devices[0].id;
      }
      setSelectedCamera(camId);

      // 3) Iniciar el escáner con el ID de la cámara
      const html5Qr = new Html5Qrcode('barcode-scanner-view');
      scannerRef.current = html5Qr;

      await html5Qr.start(
        camId,
        {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Evitar escaneos duplicados en corto tiempo
          const now = Date.now();
          if (decodedText === lastCodeRef.current && now - lastTimeRef.current < 3000) {
            return;
          }
          lastCodeRef.current = decodedText;
          lastTimeRef.current = now;
          onScan?.(decodedText);
        },
        () => {
          // scan failure (frame sin código) - ignorar
        }
      );

      setScanning(true);
    } catch (err) {
      const msg = err?.message || String(err);
      console.error('Error iniciando escáner:', err);
      setError('Error al iniciar la cámara: ' + msg);
    }
  }, [onScan]);

  const switchCamera = useCallback(async (camId) => {
    await stopScanner();
    startScanner(camId);
  }, [stopScanner, startScanner]);

  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para que el DOM se monte antes de iniciar
      const t = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(t);
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [isOpen, startScanner, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9998] p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScanBarcode size={20} className="text-primary" />
            <h3 className="font-semibold">Escanear Código de Barras</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black" ref={containerRef}>
          <div id="barcode-scanner-view" className="w-full" style={{ minHeight: 280 }} />

          {!scanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-3">
              <Camera size={40} className="animate-pulse" />
              <p className="text-sm">Iniciando cámara...</p>
            </div>
          )}
        </div>

        {/* Camera selector */}
        {cameras.length > 1 && scanning && (
          <div className="p-2 border-t border-border flex items-center gap-2">
            <RefreshCw size={14} className="text-muted-foreground shrink-0" />
            <select
              className="flex-1 text-sm bg-background border border-border rounded px-2 py-1"
              value={selectedCamera}
              onChange={(e) => switchCamera(e.target.value)}
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Cámara ${cam.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="flex items-start gap-2">
              <CameraOff size={18} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <Button
              onClick={() => { setError(''); startScanner(); }}
              className="mt-3 w-full"
              variant="outline"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Apunta la cámara al código de barras del producto.
            <br />
            Soporta EAN-13, UPC-A, Code-128, QR y más.
          </p>
        </div>
      </div>
    </div>
  );
}
