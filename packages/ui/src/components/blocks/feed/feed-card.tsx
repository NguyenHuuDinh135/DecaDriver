"use client";

import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import Link from "next/link";
// Đảm bảo bạn đã có Avatar component từ shadcn, nếu chưa hãy chạy: npx shadcn add avatar
import { Avatar, AvatarFallback, AvatarImage } from "../../avatar";

interface FeedCardProps {
  data: {
    id: string;
    videoUrl: string;
    user: string;
    likes: string;
    description: string;
  };
}

export function FeedCard({ data }: FeedCardProps) {
  return (
    <div className="relative h-full w-full bg-zinc-900">
      {/* 1. Khu vực Video (Tạm thời dùng thẻ div màu hoặc video HTML5 cơ bản) */}
      <video
        src={data.videoUrl}
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Lớp overlay làm tối phần dưới để chữ dễ đọc hơn */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

      {/* 2. Thông tin User & Caption (Góc trái dưới) */}
      <div className="absolute bottom-4 left-4 right-16 text-white z-10">
        <h3 className="font-bold text-lg mb-1">{data.user}</h3>
        <p className="text-sm line-clamp-2">{data.description}</p>
        
        {/* Nút xem chi tiết bộ đồ (Link tới /feed/[lookId]) */}
        <Link 
          href={`/feed/${data.id}`}
          className="mt-3 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full inline-flex items-center space-x-2 text-xs font-medium cursor-pointer hover:bg-white/30 transition"
        >
          <span>🛍️ Nhấn để xem đồ đang mặc</span>
        </Link>
      </div>

      {/* 3. Thanh tương tác dọc (Góc phải dưới) */}
      <div className="absolute bottom-4 right-2 flex flex-col items-center space-y-4 z-10 text-white">
        
        {/* Avatar */}
        <div className="relative mb-2">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${data.user}`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">
            +
          </div>
        </div>

        {/* Nút Like */}
        <div className="flex flex-col items-center">
          <button className="p-2 bg-black/20 rounded-full backdrop-blur-sm hover:bg-black/40 transition">
            <Heart size={26} className="fill-transparent" />
          </button>
          <span className="text-xs font-medium mt-1">{data.likes}</span>
        </div>

        {/* Nút Comment */}
        <div className="flex flex-col items-center">
          <button className="p-2 bg-black/20 rounded-full backdrop-blur-sm hover:bg-black/40 transition">
            <MessageCircle size={26} />
          </button>
          <span className="text-xs font-medium mt-1">120</span>
        </div>

        {/* Nút Lưu tủ đồ */}
        <div className="flex flex-col items-center">
          <button className="p-2 bg-black/20 rounded-full backdrop-blur-sm hover:bg-black/40 transition">
            <Bookmark size={26} />
          </button>
        </div>

        {/* Nút Share */}
        <div className="flex flex-col items-center">
          <button className="p-2 bg-black/20 rounded-full backdrop-blur-sm hover:bg-black/40 transition">
            <Share2 size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}