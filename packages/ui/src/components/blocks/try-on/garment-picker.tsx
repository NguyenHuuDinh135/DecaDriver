"use client";

import { useState } from "react";
import { cn } from "../../../lib/utils";

// Tạm thời dùng mock data, sau này bạn chuyển sang lib/mock.ts
const MOCK_GARMENTS = [
  { id: "g1", name: "Áo Polo Đen", image: "https://via.placeholder.com/150/000000/FFFFFF?text=Polo+Den" },
  { id: "g2", name: "Sơ mi Trắng", image: "https://via.placeholder.com/150/FFFFFF/000000?text=So+mi" },
  { id: "g3", name: "Hoodie Xám", image: "https://via.placeholder.com/150/808080/FFFFFF?text=Hoodie" },
  { id: "g4", name: "Jacket Da", image: "https://via.placeholder.com/150/333333/FFFFFF?text=Jacket" },
];

interface GarmentPickerProps {
  onSelect: (garmentId: string) => void;
}

export function GarmentPicker({ onSelect }: GarmentPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  return (
    <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
      {MOCK_GARMENTS.map((item) => (
        <button
          key={item.id}
          onClick={() => handleSelect(item.id)}
          className={cn(
            "relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all",
            selectedId === item.id ? "border-primary scale-105" : "border-transparent opacity-70"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}