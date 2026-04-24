import { ProductCatalog } from "@workspace/ui/components/blocks/feed/product-catalog";

export default function FeedProductsPage() {
  return (
    // Dùng absolute inset-0 để nó đè lên và che đi thanh BottomNav (vì trang này có thanh search và danh mục cần nhiều không gian)
    // Nếu bạn VẪN MUỐN hiện BottomNav, chỉ cần đổi thành: <div className="h-full bg-background">
    <div className="absolute inset-0 z-50 bg-background">
      <ProductCatalog />
    </div>
  );
}   