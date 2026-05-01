import { MOCK_FEED } from "@workspace/ui/lib/mock";
import { FeedCard } from "@workspace/ui/components/blocks/feed/feed-card";
import { FeedLayout } from "@workspace/ui/components/blocks/feed/feed-layout";

export default function FeedPage() {
  return (
    <div className="w-full">
      <FeedLayout items={MOCK_FEED} />
    </div>
  );
}