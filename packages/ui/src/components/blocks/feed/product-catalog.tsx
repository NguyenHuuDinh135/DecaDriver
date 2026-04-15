"use client";

import { ArrowLeft, Search, Sparkles, Bookmark, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../button";
import { Input } from "../../input";

// Mock data: Danh sách tất cả sản phẩm
const MOCK_CATALOG = [
  { id: "p1", name: "Áo Thun Basic Trắng", price: "150.000đ", category: "Áo", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80" },
  { id: "p2", name: "Quần Jean Ống Rộng Xanh", price: "350.000đ", category: "Quần", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&q=80" },
  { id: "p3", name: "Áo Khoác Denim Bụi", price: "450.000đ", category: "Áo khoác", image: "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=300&q=80" },
  { id: "p4", name: "Chân váy xếp ly đen", price: "220.000đ", category: "Váy", image: "https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=300&q=80" },
  { id: "p5", name: "Áo Polo Đen Cổ Điển", price: "200.000đ", category: "Áo", image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&q=80" },
  { id: "p6", name: "Quần Kaki Túi Hộp", price: "380.000đ", category: "Quần", image: "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=300&q=80" },
];

const CATEGORIES = ["Tất cả", "Áo", "Quần", "Váy", "Áo khoác", "Phụ kiện"];

export function ProductCatalog() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");

  // Logic lọc sản phẩm theo Category và Keyword tìm kiếm
  const filteredProducts = MOCK_CATALOG.filter((product) => {
    const matchCategory = activeCategory === "Tất cả" || product.category === activeCategory;
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header & Thanh tìm kiếm */}
      <div className="pt-4 px-4 pb-2 bg-background z-20 sticky top-0 border-b">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft size={20} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Tìm kiếm sản phẩm..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-transparent rounded-full h-10"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0 h-10 w-10">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Thanh cuộn Danh mục */}
        <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === cat 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-transparent text-foreground border-border hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lưới Sản phẩm */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide pb-24">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="flex flex-col group">
              {/* Ảnh */}
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                
                {/* Nút thả tim / lưu đè lên ảnh */}
                <button className="absolute top-2 right-2 p-2 bg-black/10 backdrop-blur-md rounded-full text-white hover:bg-black/30 transition">
                  <Bookmark className="w-4 h-4" />
                </button>

                {/* Nút Try-on hiện lên khi hover (trên desktop) hoặc luôn có mờ mờ */}
                <div className="absolute inset-x-0 bottom-0 p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                  <Button size="sm" className="w-full rounded-full text-xs font-bold h-8 bg-white/20 hover:bg-primary text-white border-none backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 mr-1" /> Thử bằng AI
                  </Button>
                </div>
              </div>
              
              {/* Thông tin */}
              <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
              <p className="font-bold text-sm text-primary">{product.price}</p>
            </div>
          ))}
        </div>

        {/* Trạng thái Empty */}
        {filteredProducts.length === 0 && (
          <div className="text-center text-muted-foreground mt-10">
            Không tìm thấy sản phẩm nào! 🕵️‍♀️
          </div>
        )}
      </div>
    </div>
  );
}