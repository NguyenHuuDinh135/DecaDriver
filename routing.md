# App Routing — Virtual Try-On (Next.js App Router)

## Cấu trúc thư mục

```
app/
├── layout.tsx                          # Root layout — global providers, font, theme
├── globals.css
├── page.tsx                            # redirect → /feed
│
├── (auth)/                             # Route group — no nav, fullscreen
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx                    # /login
│   └── onboarding/
│       ├── page.tsx                    # /onboarding — upload 5–10 ảnh, trigger DreamBooth
│       ├── avatar/
│       │   └── page.tsx                # /onboarding/avatar — chờ avatar render
│       └── brands/
│           └── page.tsx                # /onboarding/brands — chọn brand yêu thích
│
├── (app)/                              # Route group — có bottom nav 5 tabs
│   ├── layout.tsx                      # Bottom nav: Feed · Try-On · Create · Wardrobe · Profile
│   │
│   ├── feed/
│   │   ├── page.tsx                    # /feed — TikTok-style vertical reel (snap scroll)
│   │   ├── [lookId]/
│   │   │   └── page.tsx                # /feed/abc123 — look detail, share link, OG
│   │   └── products/
│   │       └── page.tsx                # /feed/products — all products catalog
│   │
│   ├── try-on/
│   │   ├── page.tsx                    # /try-on — camera capture + garment picker
│   │   └── result/
│   │       └── page.tsx                # /try-on/result — preview (Mobile VTON) + confirm
│   │
│   ├── create/                         # Tab Create (nút + giữa nav)
│   │   ├── page.tsx                    # /create — chọn: thêm link hoặc post look
│   │   ├── link/
│   │   │   └── page.tsx                # /create/link — paste URL garment từ web
│   │   └── post/
│   │       └── page.tsx                # /create/post — caption, hashtag, publish look
│   │
│   ├── wardrobe/
│   │   ├── page.tsx                    # /wardrobe — saved looks, wishlist
│   │   └── history/
│   │       └── page.tsx                # /wardrobe/history — lịch sử try-on cá nhân
│   │
│   └── profile/
│       ├── page.tsx                    # /profile — avatar, stats, looks của mình
│       ├── [userId]/
│       │   └── page.tsx                # /profile/abc123 — xem profile người khác, follow
│       ├── settings/
│       │   └── page.tsx                # /profile/settings — cài đặt, xoá tài khoản
│       └── affiliate/
│           └── page.tsx                # /profile/affiliate — dashboard click, hoa hồng
│
├── @modal/                             # Parallel route — overlay giữ feed visible
│   ├── default.tsx                     # null (bắt buộc cho parallel route)
│   ├── (.)garment/
│   │   └── [id]/
│   │       └── page.tsx                # bottom sheet garment detail khi click từ feed
│   ├── (.)invite/
│   │   └── page.tsx                    # modal mời bạn bè
│   └── (.)video/
│       └── [id]/
│           └── page.tsx                # full-screen video overlay
│
└── api/
    ├── tryon/
    │   └── route.ts                    # POST — gọi FASHN v1.5 server render
    ├── video/
    │   └── route.ts                    # POST — gọi Kling AI video API
    ├── affiliate/
    │   └── route.ts                    # POST — log click, track conversion
    ├── invite/
    │   └── route.ts                    # POST — generate invite link, track referral
    ├── avatar/
    │   └── webhook/
    │       └── route.ts                # POST — DreamBooth done callback từ GPU server
    └── og/
        └── [lookId]/
            └── route.tsx               # GET — generate OG image cho share link
```

---

## Route Groups — học từ shadcn v4 pattern

| Group | URL | Layout | Dùng cho |
|---|---|---|---|
| `(auth)` | `/login`, `/onboarding/*` | Fullscreen, không có nav | Login, tạo avatar |
| `(app)` | `/feed`, `/try-on`, `/create`, `/wardrobe`, `/profile` | Bottom nav 5 tabs | Toàn bộ app chính |

> Tên folder trong ngoặc `()` không xuất hiện trong URL.

---

## Bottom Nav — 5 tabs

```
[ Feed ]  [ Try-On ]  [ + Create ]  [ Wardrobe ]  [ Profile ]
  /feed    /try-on      /create      /wardrobe      /profile
```

---

## URL map đầy đủ

| URL | File | Mô tả |
|---|---|---|
| `/` | `app/page.tsx` | Redirect → `/feed` |
| `/login` | `(auth)/login/page.tsx` | Đăng nhập |
| `/onboarding` | `(auth)/onboarding/page.tsx` | Upload ảnh, tạo avatar |
| `/onboarding/avatar` | `(auth)/onboarding/avatar/page.tsx` | Chờ DreamBooth render |
| `/onboarding/brands` | `(auth)/onboarding/brands/page.tsx` | Chọn brand yêu thích |
| `/feed` | `(app)/feed/page.tsx` | Reel feed — TikTok-style snap scroll |
| `/feed/[lookId]` | `(app)/feed/[lookId]/page.tsx` | Look detail, buy, share |
| `/feed/products` | `(app)/feed/products/page.tsx` | All products catalog |
| `/try-on` | `(app)/try-on/page.tsx` | Camera + chọn garment |
| `/try-on/result` | `(app)/try-on/result/page.tsx` | Preview + confirm render |
| `/create` | `(app)/create/page.tsx` | Chọn: thêm link hoặc post |
| `/create/link` | `(app)/create/link/page.tsx` | Paste URL garment |
| `/create/post` | `(app)/create/post/page.tsx` | Caption, hashtag, publish |
| `/wardrobe` | `(app)/wardrobe/page.tsx` | Saved looks, wishlist |
| `/wardrobe/history` | `(app)/wardrobe/history/page.tsx` | Lịch sử try-on |
| `/profile` | `(app)/profile/page.tsx` | Profile cá nhân |
| `/profile/[userId]` | `(app)/profile/[userId]/page.tsx` | Profile người khác |
| `/profile/settings` | `(app)/profile/settings/page.tsx` | Cài đặt, xoá tài khoản |
| `/profile/affiliate` | `(app)/profile/affiliate/page.tsx` | Affiliate dashboard |

---

## Parallel + Intercepting Routes — modal/sheet

```
@modal/(.)garment/[id]  →  click garment từ feed → bottom sheet
                            navigate trực tiếp   → full garment page

@modal/(.)invite         →  modal mời bạn bè
@modal/(.)video/[id]     →  full-screen video overlay
```

---

## API Routes

| Route | Method | Gọi tới |
|---|---|---|
| `/api/tryon` | POST | FASHN v1.5 self-host GPU server |
| `/api/video` | POST | Kling AI PiAPI |
| `/api/affiliate` | POST | Log click, tính conversion |
| `/api/invite` | POST | Generate invite link, track referral |
| `/api/avatar/webhook` | POST | Callback khi DreamBooth xong |
| `/api/og/[lookId]` | GET | Generate OG image (next/og) |

---

## Gap so với routing ban đầu

| Route | Trạng thái |
|---|---|
| `/onboarding/brands` | Thiếu — cần thêm |
| `/create/post` | Thiếu — cần thêm |
| `/create/link` | Thiếu — cần thêm |
| `/feed/products` | Thiếu — cần thêm |
| `/wardrobe/history` | Thiếu — cần thêm |
| `/profile/[userId]` | Thiếu — cần thêm |
| `/profile/affiliate` | Thiếu — cần thêm |
| `@modal/(.)invite` | Thiếu — cần thêm |
| `/api/affiliate` | Thiếu — cần thêm |
| `/api/invite` | Thiếu — cần thêm |
| `/api/avatar/webhook` | Thiếu — cần thêm |
| `/api/og/[lookId]` | Thiếu — cần thêm |
