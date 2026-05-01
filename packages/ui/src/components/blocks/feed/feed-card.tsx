"use client";

import { useState, useRef, useEffect } from "react";
import { Music2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "../../../lib/utils";
import type { FeedItem } from "../../../lib/mock";

interface FeedCardProps {
  data: FeedItem;
  isActive?: boolean;
}

export function FeedCard({ data, isActive = true }: FeedCardProps) {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play/pause based on active state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black/5">
      {/* ─── Media ─── */}
      {!videoError ? (
        <video
          ref={videoRef}
          src={data.videoUrl}
          poster={data.posterUrl}
          className="h-full w-full object-cover"
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.posterUrl}
          alt={data.user}
          className="h-full w-full object-cover"
        />
      )}

      {/* ─── Cinematic gradient ─── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent via-50% to-black/80" />

      {/* ─── Caption block ─── */}
      <div className="absolute bottom-6 left-6 right-6 z-10 space-y-3">
        {/* User row */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-white tracking-wide drop-shadow-sm">
              @{data.user}
            </span>
            {/* Sound ticker */}
            <div className="flex items-center gap-1.5 opacity-80 mt-0.5">
              <Music2 size={10} className="text-white" />
              <span className="text-[11px] text-white truncate max-w-[150px]">{data.sound}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[14px] leading-relaxed text-white/95 line-clamp-2 drop-shadow-sm">
          {data.description}
        </p>

        {/* CTA — look pill */}
        <Link
          href={`/feed/${data.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-md ring-1 ring-white/20 transition-all hover:bg-white/20"
        >
          🛍️ Xem đồ đang mặc
          <ChevronRight size={14} className="opacity-70" />
        </Link>
      </div>
    </div>
  );
}
