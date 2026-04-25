"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BRANDS = [
  { id: "zara", name: "Zara", category: "Fast Fashion" },
  { id: "hm", name: "H&M", category: "Fast Fashion" },
  { id: "uniqlo", name: "Uniqlo", category: "Essentials" },
  { id: "gucci", name: "Gucci", category: "Luxury" },
  { id: "prada", name: "Prada", category: "Luxury" },
  { id: "loewe", name: "Loewe", category: "Luxury" },
  { id: "acne", name: "Acne Studios", category: "Contemporary" },
  { id: "apc", name: "A.P.C.", category: "Contemporary" },
  { id: "celine", name: "Celine", category: "Luxury" },
  { id: "arket", name: "Arket", category: "Essentials" },
  { id: "mango", name: "Mango", category: "Fast Fashion" },
  { id: "toteme", name: "Toteme", category: "Contemporary" },
];

export default function BrandsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div>
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-2">
          Step 3 of 3
        </p>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Your style brands
        </h1>
        <p className="mt-1.5 text-sm text-stone-500">
          Select the brands you love. We&apos;ll personalise your feed.
        </p>
      </div>

      {/* Selected count badge */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-stone-900 text-white px-3 py-1.5 rounded-full">
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {selected.size} selected
          </span>
        </div>
      )}

      {/* Brand grid */}
      <div className="grid grid-cols-2 gap-2">
        {BRANDS.map((brand) => {
          const isSelected = selected.has(brand.id);
          return (
            <button
              key={brand.id}
              onClick={() => toggle(brand.id)}
              className={`flex flex-col items-start gap-0.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.97] ${
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-900 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              <span className="text-sm font-medium">{brand.name}</span>
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  isSelected ? "text-stone-400" : "text-stone-400"
                }`}
              >
                {brand.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Finish */}
      <button
        onClick={() => router.push("/feed")}
        disabled={selected.size === 0}
        className="w-full py-3.5 rounded-xl bg-stone-900 text-white text-sm font-medium tracking-wide transition-all duration-150 hover:bg-stone-800 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-stone-900"
      >
        Finish
      </button>
    </div>
  );
}