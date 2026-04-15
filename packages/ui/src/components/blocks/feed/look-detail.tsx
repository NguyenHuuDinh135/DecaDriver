"use client";

import { ArrowLeft, Sparkles, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../../button";

// Dữ liệu giả lập cho các món đồ trong 1 Look
const MOCK_PRODUCTS = [
  { 
    id: "p1", 
    name: "Áo Croptop Trắng Ôm Body", 
    price: "250.000đ", 
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&q=80" 
  },
  { 
    id: "p2", 
    name: "Quần Jean Ống Rộng Xanh Nhạt", 
    price: "450.000đ", 
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80" 
  },
];

export function LookDetail({ lookId }: { lookId: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header trong suốt đè lên ảnh */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-white font-medium text-sm drop-shadow-md">Chi tiết Look</span>
        <div className="w-10" /> {/* Spacer để căn giữa */}
      </div>

      {/* Ảnh/Video Cover của Look */}
      <div className="h-2/5 w-full bg-zinc-900 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" 
          alt="Look Cover" 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-4 text-white">
          <h2 className="font-bold text-xl drop-shadow-md">Summer Vibes ☀️</h2>
          <p className="text-sm opacity-90 drop-shadow-md">@{lookId}</p>
        </div>
      </div>

      {/* Danh sách sản phẩm (Garments) */}
      <div className="flex-1 overflow-y-auto bg-background rounded-t-3xl -mt-6 z-10 relative px-4 pt-6 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="w-12 h-1 bg-muted mx-auto rounded-full mb-6" />
        
        <h3 className="font-bold text-lg mb-4">Sản phẩm trong Look này ({MOCK_PRODUCTS.length})</h3>
        
        <div className="flex flex-col gap-4">
          {MOCK_PRODUCTS.map((product) => (
            <div key={product.id} className="flex gap-4 p-3 bg-muted/30 rounded-2xl border border-border/50">
              {/* Ảnh sản phẩm */}
              <div className="w-20 h-24 rounded-xl overflow-hidden bg-muted shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              
              {/* Thông tin & Hành động */}
              <div className="flex flex-col justify-between flex-1 py-1">
                <div>
                  <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                  <p className="text-primary font-bold text-sm mt-1">{product.price}</p>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="flex-1 rounded-full text-xs font-bold h-8">
                    <Sparkles className="w-3 h-3 mr-1" /> Thử ngay
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full h-8 w-8 shrink-0">
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}