"use client";

import { Heart, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs";
import Link from "next/link";
import { Button } from "../../button";
import { MOCK_WARDROBE } from "../../../lib/mock";

export function WardrobeGrid() {
  const historyItems = MOCK_WARDROBE.filter((w) => w.type === "tryon");
  const savedItems = MOCK_WARDROBE.filter((w) => w.type === "saved");

  return (
    <div className="flex h-full w-full flex-col bg-secondary">
      <Tabs defaultValue="history" className="flex h-full w-full flex-col">
        
        <div className="sticky top-0 z-10 bg-card/90 px-5 pb-2 pt-4 backdrop-blur-xl">
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/50 p-1 ring-1 ring-foreground/[0.04]">
            <TabsTrigger value="history" className="rounded-full text-xs font-medium">
              Lịch sử Try-On
            </TabsTrigger>
            <TabsTrigger value="saved" className="rounded-full text-xs font-medium">
              Sản phẩm đã lưu
            </TabsTrigger>
          </TabsList>
        </div>

        {/* History tab */}
        <TabsContent value="history" className="flex-1 overflow-y-auto px-5 pb-24 outline-none">
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.04] transition-all hover:shadow-md hover:ring-foreground/10"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.garment}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                {/* Info bar */}
                <div className="p-3">
                  <p className="text-xs font-semibold leading-snug line-clamp-1">{item.garment}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.date}</p>
                </div>
                {/* Hover action */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" className="h-7 w-full rounded-full text-[10px] font-semibold">
                    <Sparkles className="mr-1 size-3" /> Thử lại
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4 mt-6 text-center">
            <Link href="/wardrobe/history">
              <Button variant="outline" className="w-full rounded-full font-medium">
                Xem chi tiết toàn bộ lịch sử
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* Saved tab */}
        <TabsContent value="saved" className="flex-1 overflow-y-auto px-5 pb-24 outline-none">
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {savedItems.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.04] transition-all hover:shadow-md hover:ring-foreground/10"
              >
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.garment}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-semibold leading-snug line-clamp-1">{item.garment}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.date}</p>
                </div>
                {/* Heart overlay */}
                <button className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/80 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:text-rose-500">
                  <Heart size={14} />
                </button>
              </div>
            ))}
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}