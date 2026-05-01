"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CameraCapture } from "@workspace/ui/components/blocks/try-on/camera-capture";
import { GarmentPicker } from "@workspace/ui/components/blocks/try-on/garment-picker";
import { Button } from "@workspace/ui/components/button";

export default function TryOnPage() {
  const router = useRouter();
  const [userImage, setUserImage] = useState<File | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!userImage || !selectedGarment) return;
    
    // Ở bước sau, chúng ta sẽ lưu file và ID này vào Zustand hoặc đẩy lên server
    // Tạm thời chỉ redirect sang trang kết quả
    console.log("Đang xử lý ảnh...", { userImage, selectedGarment });
    router.push("/try-on/result");
  };

  return (
    <div className="flex h-full flex-col bg-secondary lg:flex-row">
      
      {/* Camera area — full height on mobile, left panel on desktop */}
      <div className="relative z-10 flex-1 overflow-hidden rounded-b-3xl bg-zinc-950 shadow-lg lg:rounded-none lg:rounded-r-3xl">
        <CameraCapture onCapture={setUserImage} />
      </div>

      {/* Garment picker + CTA — bottom panel on mobile, right panel on desktop */}
      <div className="flex h-64 flex-col justify-between bg-secondary p-5 lg:h-auto lg:w-[360px] lg:justify-center lg:gap-8 lg:p-8">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Chọn trang phục để thử
          </h3>
          <GarmentPicker onSelect={setSelectedGarment} />
        </div>

        <Button 
          onClick={handleGenerate}
          disabled={!userImage || !selectedGarment}
          size="lg" 
          className="w-full rounded-full font-semibold shadow-sm"
        >
          {!userImage 
            ? "Vui lòng chụp ảnh" 
            : !selectedGarment 
            ? "Vui lòng chọn đồ" 
            : "✨ Tạo Ảnh AI ✨"}
        </Button>
      </div>

    </div>
  );
}