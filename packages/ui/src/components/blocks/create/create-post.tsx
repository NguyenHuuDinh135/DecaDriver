"use client";

import { useState } from "react";
import { ArrowLeft, UploadCloud, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../../button";

export function CreatePost() {
  const router = useRouter();
  const [caption, setCaption] = useState("");

  const handlePost = () => {
    alert("Đang upload Look của bạn...");
    router.push("/feed"); // Đăng xong thì quay về trang chủ
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 border-b flex items-center justify-between">
         <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft size={20} />
         </button>
         <h1 className="font-bold">Đăng Look mới</h1>
         <Button variant="ghost" size="sm" onClick={handlePost} disabled={!caption} className="text-primary font-bold">
           Đăng
         </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Khu vực Upload Video/Ảnh */}
        <div className="aspect-[3/4] w-full max-w-sm mx-auto bg-muted border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/70 transition cursor-pointer">
          <UploadCloud size={48} className="mb-4 opacity-50" />
          <p className="font-medium">Chạm để tải video/ảnh lên</p>
          <p className="text-xs mt-1 opacity-70">MP4, MOV hoặc JPG (Tối đa 50MB)</p>
        </div>

        {/* Nhập Caption */}
        <div>
          <textarea 
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Mô tả phong cách của bạn hôm nay..."
            className="w-full bg-transparent border-b border-border p-2 focus:outline-none focus:border-primary resize-none min-h-[80px]"
          />
        </div>

        {/* Nút Tag Sản Phẩm */}
        <Button variant="outline" className="w-full justify-start h-12 rounded-xl text-muted-foreground border-dashed">
          <Tag size={18} className="mr-2" />
          Gắn thẻ sản phẩm trong video...
        </Button>
      </div>
    </div>
  );
}