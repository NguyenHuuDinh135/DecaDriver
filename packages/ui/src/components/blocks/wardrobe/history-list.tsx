"use client";

import { ArrowLeft, MoreHorizontal, Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../../button";

// Mock data chi tiết cho lịch sử
const MOCK_HISTORY_DETAILS = [
  {
    id: "h1",
    date: "16 Tháng 4, 2026 - 10:30 SA",
    resultImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
    inputs: {
      userImage: "https://i.pravatar.cc/150?u=user",
      garmentImage: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=150&q=80"
    }
  },
  {
    id: "h2",
    date: "15 Tháng 4, 2026 - 15:45 CH",
    resultImage: "https://images.unsplash.com/photo-1434389673869-e3814c8c10ac?w=600&q=80",
    inputs: {
      userImage: "https://i.pravatar.cc/150?u=user",
      garmentImage: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=150&q=80"
    }
  }
];

export function HistoryList() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20">
         <div className="flex items-center gap-3">
           <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
              <ArrowLeft size={20} />
           </button>
           <h1 className="font-bold text-lg">Lịch sử Try-On</h1>
         </div>
         <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
           Xóa tất cả
         </Button>
      </header>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 scrollbar-hide">
        {MOCK_HISTORY_DETAILS.map((item) => (
          <div key={item.id} className="flex flex-col bg-muted/30 rounded-3xl p-4 border border-border/50">
            {/* Tiêu đề Ngày tháng & Nút mở rộng */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-medium text-muted-foreground">{item.date}</span>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* Khối Ảnh kết quả */}
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden mb-4 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.resultImage} alt="Kết quả AI" className="w-full h-full object-cover" />
              
              {/* Nút thao tác đè lên ảnh */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full shadow-lg backdrop-blur-sm bg-white/70 hover:bg-white">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Công thức đầu vào (Inputs) */}
            <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border">
              <div className="text-xs font-medium text-muted-foreground">Công thức:</div>
              <div className="flex items-center gap-2">
                {/* Ảnh người dùng */}
                <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.inputs.userImage} alt="User" className="w-full h-full object-cover" />
                </div>
                <span className="text-muted-foreground text-xs">+</span>
                {/* Ảnh quần áo */}
                <div className="w-8 h-8 rounded-md overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.inputs.garmentImage} alt="Garment" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}