"use client";

import { ArrowLeft, Sparkles, Bookmark, Tag, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../../button";

const MOCK_PRODUCTS = [
  {
    id: "p1",
    name: "Áo Croptop Trắng Ôm Body",
    brand: "Zara Studio",
    price: "250.000đ",
    originalPrice: "320.000đ",
    tag: "Hot pick",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&q=80",
  },
  {
    id: "p2",
    name: "Quần Jean Ống Rộng Xanh Nhạt",
    brand: "Levi's",
    price: "450.000đ",
    originalPrice: null,
    tag: "Best seller",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80",
  },
];

export function LookDetail({ lookId }: { lookId: string }) {
  const router = useRouter();

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      {/* ─── Hero image — full bleed ─── */}
      <div className="relative h-[45%] w-full shrink-0 bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80"
          alt="Look Cover"
          className="h-full w-full object-cover"
        />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
          <button
            onClick={() => router.back()}
            className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-xl ring-1 ring-white/20 transition-all hover:bg-white/25 active:scale-95"
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </button>

          <button className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-xl ring-1 ring-white/20 transition-all hover:bg-white/25 active:scale-95">
            <Bookmark size={17} strokeWidth={1.75} />
          </button>
        </div>

        {/* Look info */}
        <div className="absolute bottom-5 left-5 right-5">
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-md ring-1 ring-white/20">
            <Tag size={9} />
            {MOCK_PRODUCTS.length} sản phẩm
          </div>
          <h2 className="text-[22px] font-bold leading-tight text-white drop-shadow-sm">
            Summer Vibes ☀️
          </h2>
          <p className="mt-0.5 text-[12px] text-white/70">@{lookId}</p>
        </div>
      </div>

      {/* ─── Products sheet — slides up ─── */}
      <div className="relative z-10 -mt-6 flex-1 overflow-y-auto rounded-t-[28px] bg-white shadow-[0_-2px_20px_rgba(0,0,0,0.07)] px-5 pb-8 pt-6">
        {/* Drag pill */}
        <div className="mx-auto mb-5 h-[3px] w-9 rounded-full bg-zinc-200" />

        {/* Section header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-zinc-900">
            Đồ đang mặc trong Look
          </h3>
          <span className="text-[12px] text-zinc-400">{MOCK_PRODUCTS.length} items</span>
        </div>

        {/* Product list */}
        <div className="space-y-3">
          {MOCK_PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="flex gap-4 rounded-2xl bg-white p-3 ring-1 ring-zinc-100 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Image */}
              <div className="relative size-[80px] shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                {product.tag && (
                  <div className="absolute left-1 top-1 rounded-md bg-zinc-900/80 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                    {product.tag}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between py-0.5 min-w-0">
                <div>
                  <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                    {product.brand}
                  </p>
                  <h4 className="mt-0.5 text-[13px] font-semibold text-zinc-900 leading-snug line-clamp-2">
                    {product.name}
                  </h4>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[14px] font-bold text-zinc-900">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-[11px] text-zinc-400 line-through">
                        {product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 flex-1 rounded-full bg-zinc-900 text-[12px] font-semibold text-white hover:bg-zinc-700 active:scale-95 transition-transform"
                  >
                    <Sparkles className="mr-1.5 size-3" />
                    Thử ngay
                  </Button>
                  <button className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 active:scale-95">
                    <Bookmark size={14} />
                  </button>
                  <button className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 active:scale-95">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upsell nudge */}
        <div className="mt-5 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
          <p className="text-[12px] font-medium text-zinc-500">
            💡 AI gợi ý — kết hợp thêm phụ kiện để hoàn thiện Look này
          </p>
          <button className="mt-2 text-[12px] font-semibold text-zinc-900 underline underline-offset-2">
            Xem gợi ý →
          </button>
        </div>
      </div>
    </div>
  );
}
