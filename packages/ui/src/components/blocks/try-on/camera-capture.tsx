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

  // Open camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } // Default to front camera
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error opening camera:", err);
      alert("Cannot access camera. Please check camera permissions!");
    }
  };

  // Capture photo
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
      
      // Convert DataURL to File object for future API submission
      fetch(imgUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "user-capture.jpg", { type: "image/jpeg" });
          onCapture(file);
        });
    }
  }, [onCapture]);

  // Retake
  const retake = () => {
    setCapturedImg(null);
    onCapture(null);
  };

  return (
    <div className="relative h-full w-full bg-zinc-900 flex flex-col items-center justify-center overflow-hidden">
      {!capturedImg ? (
        <>
          {/* Video Feed */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="h-full w-full object-cover"
          />
          
          {/* Camera Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-6 z-10">
            {!stream ? (
              <Button onClick={startCamera} size="lg" className="rounded-full px-8">
                Turn on Camera
              </Button>
            ) : (
              <button 
                onClick={takePhoto}
                className="w-16 h-16 bg-white rounded-full border-4 border-zinc-300 active:scale-95 transition-transform"
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Captured Image Preview */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedImg} alt="Captured" className="h-full w-full object-cover" />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
            <Button variant="secondary" onClick={retake} className="rounded-full shadow-lg">
              <RefreshCw className="mr-2 h-4 w-4" /> Retake
            </Button>
          </div>
        </>
      )}
    </div>
  );
}