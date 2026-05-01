"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { Button } from "../../button";

interface CameraCaptureProps {
  onCapture: (imageFile: File | null) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);

  // Mở camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } // Mặc định mở camera trước
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Lỗi mở camera:", err);
      alert("Không thể truy cập camera. Vui lòng kiểm tra quyền!");
    }
  };

  // Chụp ảnh
  const takePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imgUrl = canvas.toDataURL("image/jpeg");
      setCapturedImg(imgUrl);
      
      // Chuyển DataURL thành File object để sau này gửi API
      fetch(imgUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "user-capture.jpg", { type: "image/jpeg" });
          onCapture(file);
        });
    }
  }, [onCapture]);

  // Chụp lại
  const retake = () => {
    setCapturedImg(null);
    onCapture(null);
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-zinc-950">
      {!capturedImg ? (
        <>
          {/* Video viewfinder */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="h-full w-full object-cover"
          />
          
          {/* Camera controls — Doji-polished */}
          <div className="absolute bottom-8 left-0 right-0 z-10 flex items-center justify-center gap-6">
            {!stream ? (
              <Button onClick={startCamera} size="lg" className="rounded-full px-8 shadow-lg">
                Bật Camera
              </Button>
            ) : (
              <button 
                onClick={takePhoto}
                className="size-16 rounded-full border-[3px] border-white/80 bg-white transition-all hover:scale-105 active:scale-95 active:bg-white/80"
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Preview */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedImg} alt="Captured" className="h-full w-full object-cover" />
          <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
            <Button variant="secondary" onClick={retake} className="rounded-full shadow-lg">
              <RefreshCw className="mr-2 size-4" /> Chụp lại
            </Button>
          </div>
        </>
      )}
    </div>
  );
}