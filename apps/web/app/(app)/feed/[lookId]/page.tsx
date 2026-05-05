import { LookDetail } from "@workspace/ui/components/blocks/feed/look-detail";
import { MOCK_FEED } from "@workspace/ui/lib/mock";

export const dynamicParams = false;

export function generateStaticParams() {
  return MOCK_FEED.map((post) => ({
    lookId: post.id,
  }));
}

// Định nghĩa kiểu dữ liệu cho params trong Next.js 15
interface PageProps {
  params: Promise<{ lookId: string }>;
}

export default async function LookIdPage({ params }: PageProps) {
  // Đợi giải nén params để lấy lookId
  const resolvedParams = await params;
  
  return (
    // Ẩn thanh BottomNav bằng cách đè lên toàn màn hình (h-[100dvh] + absolute/fixed nếu cần)
    <div className="absolute inset-0 z-50 bg-background">
      <LookDetail lookId={resolvedParams.lookId} />
    </div>
  );
}