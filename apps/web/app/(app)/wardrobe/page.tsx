import { WardrobeGrid } from "@workspace/ui/components/blocks/wardrobe/wardrobe-grid";

export default function WardrobePage() {
  return (
    <div className="h-full bg-background flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between">
         <h1 className="text-2xl font-bold">Tủ đồ của tôi</h1>
      </header>
      
      <div className="flex-1 overflow-hidden relative">
        <WardrobeGrid />
      </div>
    </div>
  );
}