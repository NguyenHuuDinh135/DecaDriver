"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs";
import Link from "next/link";
import { Button } from "../../button"; // Đừng quên import Button nhé!

// Mock data tạm thời (sau này lấy từ lib/mock.ts)
const MOCK_HISTORY = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1434389673869-e3814c8c10ac?w=400&auto=format&fit=crop",
];

const MOCK_SAVED = [
  "https://images.unsplash.com/photo-1550639525-c97d455acf70?w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&auto=format&fit=crop",
];

export function WardrobeGrid() {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Shadcn Tabs Component */}
      <Tabs defaultValue="history" className="w-full h-full flex flex-col">
        
        <div className="px-4 pt-4 pb-2 bg-background z-10 sticky top-0">
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted p-1">
            <TabsTrigger value="history" className="rounded-full">Try-On History</TabsTrigger>
            <TabsTrigger value="saved" className="rounded-full">Saved Items</TabsTrigger>
          </TabsList>
        </div>

        {/* History Tab Content */}
        <TabsContent value="history" className="flex-1 overflow-y-auto px-4 pb-24 outline-none">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {MOCK_HISTORY.map((img, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="History" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 right-2 bg-black/40 backdrop-blur-md rounded px-2 py-1 text-[10px] text-white font-medium">
                  Apr 24, 2026
                </div>
              </div>
            ))}
          </div>

          {/* DETAILED VIEW BUTTON ADDED HERE */}
          <div className="mt-6 mb-4 text-center">
            <Link href="/wardrobe/history">
              <Button variant="outline" className="rounded-full w-full font-bold border-2">
                View Full History Details
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* Nội dung Tab Đã lưu */}
        <TabsContent value="saved" className="flex-1 overflow-y-auto px-4 pb-24 outline-none">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {MOCK_SAVED.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="Saved item" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-sm">
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}