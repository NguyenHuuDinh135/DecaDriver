"use client";

import {
  ArrowLeft,
  Search,
  Sparkles,
  Bookmark,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../button";

const MOCK_CATALOG = [
  { id: "p1", name: "Áo Thun Basic Trắng", price: "150.000đ", category: "Áo", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80" },
  { id: "p2", name: "Quần Jean Ống Rộng Xanh", price: "350.000đ", category: "Quần", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&q=80" },
  { id: "p3", name: "Áo Khoác Denim Bụi", price: "450.000đ", category: "Áo khoác", image: "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=300&q=80" },
  { id: "p4", name: "Chân váy xếp ly đen", price: "220.000đ", category: "Váy", image: "https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=300&q=80" },
  { id: "p5", name: "Áo Polo Đen Cổ Điển", price: "200.000đ", category: "Áo", image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&q=80" },
  { id: "p6", name: "Quần Kaki Túi Hộp", price: "380.000đ", category: "Quần", image: "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=300&q=80" },
];

const CATEGORIES = ["Tất cả", "Áo", "Quần", "Váy", "Áo khoác", "Phụ kiện"];

export function ProductCatalog() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const filteredProducts = MOCK_CATALOG.filter((product) => {
    const matchCategory = activeCategory === "Tất cả" || product.category === activeCategory;
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-zinc-50">
      {/* ─── Sticky header ─── */}
      <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur-xl">
        {/* Top row — back + search + filter */}
        <div className="mb-3 flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200 active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>

          {/* Search field */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full bg-zinc-100 pl-9 pr-9 text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-zinc-200/70 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200 active:scale-95">
            <SlidersHorizontal size={17} />
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Result count ─── */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
          {filteredProducts.length} sản phẩm
          {activeCategory !== "Tất cả" && ` · ${activeCategory}`}
        </p>
      </div>

      {/* ─── Product grid ─── */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2 scrollbar-hide">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group flex flex-col">
                {/* Image card */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-200 ring-1 ring-zinc-100 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Bookmark */}
                  <button
                    onClick={() => toggleSave(product.id)}
                    className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/85 text-zinc-700 shadow-sm backdrop-blur-md transition-all hover:bg-white active:scale-90"
                  >
                    <Bookmark
                      size={14}
                      className={savedIds.has(product.id) ? "fill-zinc-900 text-zinc-900" : ""}
                    />
                  </button>

                  {/* Try-on overlay */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/60 to-transparent p-2.5 transition-transform duration-300 group-hover:translate-y-0">
                    <Button
                      size="sm"
                      className="h-8 w-full rounded-full bg-white text-[11px] font-bold text-zinc-900 shadow-sm hover:bg-zinc-100 active:scale-95 transition-transform"
                    >
                      <Sparkles className="mr-1 size-3 text-amber-500" />
                      Thử bằng AI
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-2 px-0.5">
                  <h3 className="text-[12px] font-semibold text-zinc-900 leading-snug line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-zinc-100">
              <Search size={24} className="text-zinc-400" />
            </div>
            <p className="text-[14px] font-semibold text-zinc-700">Không có kết quả</p>
            <p className="mt-1 text-[12px] text-zinc-400">Thử tìm với từ khoá khác nhé</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveCategory("Tất cả"); }}
              className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-[12px] font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              Xem tất cả
            </button>
          </div>
        )}
      </div>
    </div>
  );
}