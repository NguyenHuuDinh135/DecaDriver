import { MOCK_FEED } from "@workspace/ui/lib/mock";
import { FeedCard } from "@workspace/ui/components/blocks/feed/feed-card";

export default function FeedPage() {
  return (
    // 'snap-y snap-mandatory' kích hoạt hiệu ứng dừng đúng frame
    // 'scrollbar-hide' giúp ẩn thanh cuộn xấu xí đi
    <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide bg-black">
      
      {MOCK_FEED.map((item) => (
        // 'snap-start' đảm bảo mỗi khi cuộn sẽ dừng đúng ở đầu mép video
        <section key={item.id} className="h-[100dvh] w-full snap-start relative">
          <FeedCard data={item} />
        </section>
      ))}

    </div>
  );
}