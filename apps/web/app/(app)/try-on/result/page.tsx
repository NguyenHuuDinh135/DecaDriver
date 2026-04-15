import { TryOnResult } from "@workspace/ui/components/blocks/try-on/try-on-result";

export default function TryOnResultPage() {
  return (
    <div className="h-full bg-background flex flex-col">
      <header className="p-4 border-b flex items-center justify-between">
         <h1 className="font-bold">Kết quả thử đồ</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <TryOnResult />
      </div>
    </div>
  );
}