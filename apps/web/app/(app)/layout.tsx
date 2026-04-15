import { BottomNav } from "@workspace/ui/components/blocks/nav/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // 100dvh rất quan trọng trên mobile để không bị thanh URL của trình duyệt che mất
    <div className="relative h-[100dvh] w-full max-w-md mx-auto bg-background overflow-hidden border-x shadow-sm flex flex-col">
      {/* Vùng nội dung: flex-1 để chiếm phần không gian còn lại trên BottomNav */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-16">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
}