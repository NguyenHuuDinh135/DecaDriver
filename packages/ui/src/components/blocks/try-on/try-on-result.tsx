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
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="relative size-40">
          {/* Subtle Doji spinner */}
          <div className="absolute inset-0 rounded-full border-[3px] border-foreground/10 animate-ping" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-foreground animate-spin" />
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
    <div className="flex h-full flex-col bg-secondary animate-in fade-in zoom-in duration-500">
      {/* Result image */}
      <div className="relative mx-auto w-full max-w-md flex-1 overflow-hidden rounded-3xl bg-card p-2">
        <div className="size-full overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop" 
            alt="AI Result" 
            className="size-full object-cover"
          />
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-foreground/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-background backdrop-blur-md">
          AI Generated
        </div>
      </div>

      {/* Actions */}
      <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 p-6">
        <Button variant="outline" className="rounded-full">
          <Share2 className="mr-2 size-4" /> Chia sẻ
        </Button>
        <Button className="rounded-full">
          <Check className="mr-2 size-4" /> Lưu tủ đồ
        </Button>
        <Button variant="ghost" className="col-span-2 text-muted-foreground" onClick={() => window.history.back()}>
          <RefreshCw className="mr-2 size-4" /> Thử lại với ảnh khác
        </Button>
      </div>
    </div>
  );
}