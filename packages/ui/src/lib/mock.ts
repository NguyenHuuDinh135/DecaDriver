// packages/ui/src/lib/mock.ts

export interface FeedItem {
  id: string;
  videoUrl: string;
  posterUrl: string;
  user: string;
  likes: string;
  comments: number;
  shares: number;
  description: string;
  tags: string[];
  sound: string;
}

export const MOCK_FEED: FeedItem[] = [
  {
    id: "1",
    videoUrl: "/videos/sample1.mp4",
    posterUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
    user: "@fashion_icon",
    likes: "1.2M",
    comments: 3420,
    shares: 892,
    description: "OOTD mùa hè rực rỡ 🌞 Áo linen + quần palazzo = combo hoàn hảo #summer #vibe #ootd",
    tags: ["summer", "vibe", "ootd"],
    sound: "Cruel Summer — Taylor Swift",
  },
  {
    id: "2",
    videoUrl: "/videos/sample2.mp4",
    posterUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80",
    user: "@streetwear_vn",
    likes: "850K",
    comments: 1204,
    shares: 456,
    description: "Phối đồ đi cafe cực chất ☕ All black never goes wrong #streetwear #allblack",
    tags: ["streetwear", "allblack"],
    sound: "Money Trees — Kendrick Lamar",
  },
  {
    id: "3",
    videoUrl: "/videos/sample3.mp4",
    posterUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cda3e57?w=600&q=80",
    user: "@minimalist.style",
    likes: "420K",
    comments: 867,
    shares: 234,
    description: "Less is more ✨ Capsule wardrobe cho 1 tuần đi làm #minimalist #capsulewardrobe #workwear",
    tags: ["minimalist", "capsulewardrobe", "workwear"],
    sound: "original sound",
  },
  {
    id: "4",
    videoUrl: "/videos/sample4.mp4",
    posterUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80",
    user: "@denim.queen",
    likes: "2.1M",
    comments: 5800,
    shares: 1340,
    description: "5 cách phối jeans cho ngày hẹn hò 💕 Bạn thích set nào nhất? #denim #datenight #fashiontips",
    tags: ["denim", "datenight", "fashiontips"],
    sound: "Espresso — Sabrina Carpenter",
  },
  {
    id: "5",
    videoUrl: "/videos/sample5.mp4",
    posterUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80",
    user: "@boho_chic",
    likes: "670K",
    comments: 1560,
    shares: 678,
    description: "Boho vibes cho ngày cuối tuần 🌿 Đầm maxi + accessories thổ cẩm = chef's kiss #boho #weekend",
    tags: ["boho", "weekend"],
    sound: "Flowers — Miley Cyrus",
  },
];

export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  likes: number;
  time: string;
}

export const MOCK_COMMENTS: Comment[] = [
  { id: "c1", user: "@trang.nguyen", avatar: "https://i.pravatar.cc/150?u=trang", text: "Đẹp quá! Set này mua ở đâu vậy bạn? 😍", likes: 234, time: "2h" },
  { id: "c2", user: "@minh_style", avatar: "https://i.pravatar.cc/150?u=minh", text: "Phối đồ cực chất luôn 🔥🔥🔥", likes: 156, time: "3h" },
  { id: "c3", user: "@hana.fashion", avatar: "https://i.pravatar.cc/150?u=hana", text: "Save lại để phối theo 📌", likes: 89, time: "5h" },
  { id: "c4", user: "@streetfashion.vn", avatar: "https://i.pravatar.cc/150?u=street", text: "Vibe này chill quá! Ai bảo đơn giản là nhàm chán? 💯", likes: 67, time: "6h" },
  { id: "c5", user: "@duong_le", avatar: "https://i.pravatar.cc/150?u=duong", text: "Áo này có size M không bạn ơi?", likes: 12, time: "8h" },
  { id: "c6", user: "@fashionista.sg", avatar: "https://i.pravatar.cc/150?u=fashionista", text: "Inspiration cho tuần mới ✨ Thanks bạn!", likes: 45, time: "1d" },
];

export interface WardrobeItem {
  id: string;
  image: string;
  garment: string;
  date: string;
  type: "tryon" | "saved";
}

export const MOCK_WARDROBE: WardrobeItem[] = [
  { id: "w1", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80", garment: "ZARA Linen Blazer", date: "24 Thg 4, 2026", type: "tryon" },
  { id: "w2", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80", garment: "H&M Wide Pants", date: "22 Thg 4, 2026", type: "tryon" },
  { id: "w3", image: "https://images.unsplash.com/photo-1434389673869-e3814c8c10ac?w=400&q=80", garment: "Uniqlo AIRism Tee", date: "20 Thg 4, 2026", type: "tryon" },
  { id: "w4", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80", garment: "Mango Maxi Dress", date: "18 Thg 4, 2026", type: "tryon" },
  { id: "w5", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80", garment: "COS Wool Coat", date: "15 Thg 4, 2026", type: "tryon" },
  { id: "w6", image: "https://images.unsplash.com/photo-1434389677669-e08b4cda3e57?w=400&q=80", garment: "Everlane Cashmere", date: "12 Thg 4, 2026", type: "tryon" },
  { id: "w7", image: "https://images.unsplash.com/photo-1550639525-c97d455acf70?w=400&q=80", garment: "Theory Silk Top", date: "10 Thg 4, 2026", type: "saved" },
  { id: "w8", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80", garment: "Aritzia Hoodie", date: "8 Thg 4, 2026", type: "saved" },
  { id: "w9", image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80", garment: "Nike Polo Classic", date: "5 Thg 4, 2026", type: "saved" },
  { id: "w10", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80", garment: "Muji Basic Tee", date: "3 Thg 4, 2026", type: "saved" },
];

export const MOCK_NAV_ITEMS = [
  { label: "Feed", href: "/feed", icon: "Home" },
  { label: "Try-On", href: "/try-on", icon: "Camera" },
  { label: "+", href: "/create", icon: "Plus", isCenter: true },
  { label: "Wardrobe", href: "/wardrobe", icon: "Shirt" },
  { label: "Profile", href: "/profile", icon: "User" },
];