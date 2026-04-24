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
    <div className="flex flex-col h-full relative bg-background">
      
      {/* Nửa trên: Khu vực Camera (chiếm phần lớn màn hình) */}
      <div className="flex-1 bg-zinc-900 rounded-b-3xl overflow-hidden shadow-lg z-10">
        <CameraCapture onCapture={setUserImage} />
      </div>

      {/* Nửa dưới: Khu vực chọn đồ & Nút Submit (chiếm khoảng 1/3) */}
      <div className="h-64 p-4 flex flex-col justify-between bg-background z-0 -mt-4 pt-8">
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">
            Chọn trang phục để thử
          </h3>
          <GarmentPicker onSelect={setSelectedGarment} />
        </div>

        <Button 
          onClick={handleGenerate}
          disabled={!userImage || !selectedGarment}
          size="lg" 
          className="w-full rounded-full mt-2 font-bold text-md shadow-md"
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