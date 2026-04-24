"use client";

import { Check, Download, RefreshCw, Share2 } from "lucide-react";
import { Button } from "../../button";
import { useState, useEffect } from "react";

export function TryOnResult() {
  const [status, setStatus] = useState<"processing" | "success">("processing");

  // Giả lập thời gian AI xử lý (trong thực tế sẽ chờ API trả về)
  useEffect(() => {
    const timer = setTimeout(() => setStatus("success"), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8 text-center">
        <div className="relative w-48 h-48">
          {/* Hiệu ứng radar/scan AI */}
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">✨</span>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold animate-pulse">Đang phối đồ bằng AI...</h2>
          <p className="text-sm text-muted-foreground">
            Hệ thống đang phân tích vóc dáng và chất liệu vải để tạo ra hình ảnh tự nhiên nhất.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in duration-500">
      {/* Ảnh kết quả */}
      <div className="relative flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop" 
          alt="AI Result" 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-widest font-bold">
          AI Generated
        </div>
      </div>

      {/* Hành động */}
      <div className="p-6 grid grid-cols-2 gap-3">
        <Button variant="outline" className="rounded-full w-full">
          <Share2 className="mr-2 h-4 w-4" /> Chia sẻ
        </Button>
        <Button className="rounded-full w-full">
          <Check className="mr-2 h-4 w-4" /> Lưu tủ đồ
        </Button>
        <Button variant="ghost" className="col-span-2 text-muted-foreground" onClick={() => window.history.back()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Thử lại với ảnh khác
        </Button>
      </div>
    </div>
  );
}