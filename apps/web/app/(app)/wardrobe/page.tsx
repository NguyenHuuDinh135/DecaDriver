import { WardrobeGrid } from "@workspace/ui/components/blocks/wardrobe/wardrobe-grid";

export default function WardrobePage() {
  return (
    <div className="flex h-full flex-col bg-secondary">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/30 bg-card/80 px-5 py-3 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Tủ đồ của tôi</h1>
          <p className="text-xs text-muted-foreground">Quản lý trang phục đã lưu</p>
        </div>
      </header>
      
      <div className="relative flex-1 overflow-hidden">
        <WardrobeGrid />
      </div>
    </div>
  );
}