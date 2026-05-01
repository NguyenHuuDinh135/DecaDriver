import { TryOnResult } from "@workspace/ui/components/blocks/try-on/try-on-result";

export default function TryOnResultPage() {
  return (
    <div className="flex h-full flex-col bg-secondary">
      <header className="flex items-center justify-between border-b border-border/30 bg-card/80 px-5 py-3 backdrop-blur-xl">
         <h1 className="text-base font-semibold">Kết quả thử đồ</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <TryOnResult />
      </div>
    </div>
  );
}