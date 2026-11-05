"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, RefreshCw, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface CameraQRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  scannerId?: string;
  isActive?: boolean;
}

export function CameraQRScanner({
  onScanSuccess,
  scannerId = "html5qr-code-scanner-element",
  isActive = true,
}: CameraQRScannerProps) {
  const { language } = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      stopCamera();
      return;
    }

    // List available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError(
            language === "ar"
              ? "لم يتم العثور على أي كاميرا متصلة بالجهاز."
              : "No camera found on this device."
          );
        }
      })
      .catch((err) => {
        setCameraError(
          language === "ar"
            ? "يرجى منح إذن استخدام الكاميرا في المتصفح لتشغيل الماسح الضوئي."
            : "Camera permission denied or camera unavailable."
        );
      });

    return () => {
      stopCamera();
    };
  }, [isActive, language]);

  useEffect(() => {
    if (selectedCameraId && isActive) {
      startCamera(selectedCameraId);
    }
    return () => {
      stopCamera();
    };
  }, [selectedCameraId, isActive]);

  const startCamera = async (cameraId: string) => {
    try {
      setCameraError(null);
      if (qrScannerRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Debounce same token scan within 3 seconds
          if (decodedText === lastScannedRef.current) return;
          lastScannedRef.current = decodedText;

          if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
          cooldownTimerRef.current = setTimeout(() => {
            lastScannedRef.current = "";
          }, 3000);

          onScanSuccess(decodedText);
        },
        () => {
          // Frame read callback without QR detected, ignore safely
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      setIsScanning(false);
      setCameraError(
        err?.message ||
          (language === "ar"
            ? "تعذر تشغيل الكاميرا. يرجى التأكد من عدم استخدامها في تطبيق آخر."
            : "Failed to initialize camera.")
      );
    }
  };

  const stopCamera = async () => {
    try {
      if (qrScannerRef.current && isScanning) {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      }
    } catch {
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Camera Selection & Switcher */}
      {cameras.length > 1 && (
        <div className="flex items-center justify-between text-xs pb-1">
          <span className="font-semibold text-[#77786F]">
            {language === "ar" ? "اختر الكاميرا:" : "Select Camera:"}
          </span>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="text-xs bg-white border border-[#E4E0D5] rounded-lg px-2.5 py-1 text-[#252922] cursor-pointer"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || `${language === "ar" ? "كاميرا" : "Camera"} ${c.id.slice(0, 4)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Camera Viewfinder View */}
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-square max-w-[340px] mx-auto border-2 border-[#233D30] shadow-md flex items-center justify-center">
        <div id={scannerId} className="w-full h-full" />

        {/* Viewfinder Target Overlays */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-[#B58A3A]/80 rounded-2xl relative shadow-lg">
              <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#B58A3A] rounded-tl-md" />
              <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#B58A3A] rounded-tr-md" />
              <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#B58A3A] rounded-bl-md" />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#B58A3A] rounded-br-md" />

              {/* Animated subtle scanning laser line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#B58A3A] to-transparent animate-pulse top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 bg-[#F7F6F1] p-5 flex flex-col items-center justify-center text-center gap-2.5 text-xs z-20">
            <AlertCircle className="w-8 h-8 text-[#8C2929]" />
            <p className="font-bold text-[#8C2929] max-w-[260px] leading-relaxed">
              {cameraError}
            </p>
            {selectedCameraId && (
              <button
                type="button"
                onClick={() => startCamera(selectedCameraId)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#233D30] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "إعادة المحاولة" : "Retry Camera"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-center text-[#77786F]">
        {language === "ar"
          ? "وجّه الكاميرا نحو رمز QR على بطاقة المخدوم لتسجيل الحضور تلقائياً."
          : "Point your camera at the member's QR pass to record attendance automatically."}
      </p>
    </div>
  );
}

