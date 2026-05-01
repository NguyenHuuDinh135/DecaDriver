"use client";

import { Link2, ImagePlus, X, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CreateMenu() {
  const router = useRouter();

  return (
    <div className="flex h-[100dvh] flex-col bg-background px-6 py-8">
      {/* Nút Đóng — Doji-light */}
      <div className="flex justify-end">
        <button 
          onClick={() => router.back()} 
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-foreground">Bạn muốn thêm gì?</h2>

        {/* Option 1: Post Look */}
        <Link 
          href="/create/post"
          className="group flex items-center gap-4 rounded-2xl bg-background p-4 ring-1 ring-foreground/[0.06] transition-all hover:ring-foreground/15 hover:shadow-sm"
        >
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground transition-transform group-hover:scale-105">
            <Video size={26} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Đăng Look mới</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Chia sẻ video phối đồ của bạn</p>
          </div>
        </Link>

        {/* Option 2: Add from link */}
        <Link 
          href="/create/link"
          className="group flex items-center gap-4 rounded-2xl bg-background p-4 ring-1 ring-foreground/[0.06] transition-all hover:ring-foreground/15 hover:shadow-sm"
        >
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground transition-transform group-hover:scale-105">
            <Link2 size={26} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Thêm từ Web</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Dán link từ Shopee, Zara...</p>
          </div>
        </Link>

        {/* Option 3: Scan wardrobe (disabled) */}
        <button className="flex cursor-not-allowed items-center gap-4 rounded-2xl bg-background p-4 opacity-50 ring-1 ring-foreground/[0.06]">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground">
            <ImagePlus size={26} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-base font-semibold text-foreground">Quét tủ đồ</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Sắp ra mắt</p>
          </div>
        </button>
      </div>
    </div>
  );
}