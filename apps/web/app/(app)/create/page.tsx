import { CreateMenu } from "@workspace/ui/components/blocks/create/create-menu";

export default function CreatePage() {
  return (
    // Che khuất BottomNav bằng absolute inset-0 để màn hình Create bao phủ toàn bộ
    <div className="absolute inset-0 z-50">
      <CreateMenu />
    </div>
  );
}