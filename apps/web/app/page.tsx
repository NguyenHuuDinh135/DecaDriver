"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Shirt,
  Sparkles,
  Brain,
  ShoppingBag,
  Upload,
  ImageIcon,
  Loader2,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════
   FEATURE DATA
   ═══════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: Shirt,
    title: "Virtual Try-On",
    desc: "Thử bất kỳ bộ đồ nào lên ảnh của bạn chỉ trong vài giây nhờ AI.",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Brain,
    title: "AI Stylist",
    desc: "Phân tích phong cách, vóc dáng và gợi ý outfit hoàn hảo cho bạn.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: ShoppingBag,
    title: "Smart Wardrobe",
    desc: "Quản lý tủ đồ thông minh, mix & match tự động theo xu hướng.",
    gradient: "from-amber-500 to-orange-500",
  },
] as const;

/* ═══════════════════════════════════════════════════════════
   IMAGE DROP ZONE COMPONENT
   ═══════════════════════════════════════════════════════════ */
function DropZone({
  label,
  file,
  onFile,
  id,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  id: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = useCallback(
    (f: File) => {
      if (f.type.startsWith("image/")) onFile(f);
    },
    [onFile]
  );

  return (
    <div
      id={id}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`
        group relative flex flex-col items-center justify-center
        w-full aspect-[3/4] rounded-2xl cursor-pointer
        border-2 border-dashed transition-all duration-300
        ${
          isDragging
            ? "border-violet-400 bg-violet-500/10 scale-[1.02]"
            : preview
            ? "border-transparent"
            : "border-white/20 hover:border-violet-400/60 bg-white/5 hover:bg-white/10"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          />
          <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-sm font-medium">Đổi ảnh</p>
          </div>
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="size-6 text-emerald-400 drop-shadow-lg" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 p-4 text-center">
          <div className="p-3 rounded-full bg-violet-500/20 group-hover:bg-violet-500/30 transition-colors">
            {id === "person-upload" ? (
              <Upload className="size-6 text-violet-300" />
            ) : (
              <ImageIcon className="size-6 text-violet-300" />
            )}
          </div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="text-xs text-white/40">
            Kéo thả hoặc nhấn để chọn
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const demoRef = useRef<HTMLDivElement>(null);

  // AI Demo state
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollToDemo = () =>
    demoRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ── Submit demo try-on ────────────────────────────────── */
  const handleSubmit = async () => {
    if (!personFile || !garmentFile) return;

    setIsLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      const form = new FormData();
      form.append("person_image", personFile);
      form.append("garment_image", garmentFile);

      const res = await fetch(`${API_URL}/api/v1/demo/tryon`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Lỗi ${res.status}`);
      }

      const { job_id } = await res.json();

      // Poll for result
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const poll = await fetch(`${API_URL}/api/v1/demo/tryon/${job_id}`);
        const data = await poll.json();

        if (data.status === "completed" && data.result_url) {
          setResultUrl(data.result_url);
          return;
        }
        if (data.status === "failed") {
          throw new Error("AI xử lý thất bại, vui lòng thử lại.");
        }
      }
      throw new Error("Hết thời gian chờ, vui lòng thử lại.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8 backdrop-blur-sm">
            <Sparkles className="size-4" />
            Powered by AI
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-6">
            Thử Đồ Bằng{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Trí Tuệ Nhân Tạo
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload ảnh của bạn và bất kỳ bộ quần áo nào — AI sẽ tạo ảnh bạn
            mặc bộ đồ đó chỉ trong vài giây. Miễn phí, không cần đăng ký.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={scrollToDemo}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 rounded-full px-8 py-6 text-lg font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="size-5 mr-2" />
              Thử Ngay
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open("/feed", "_self")}
              className="rounded-full px-8 py-6 text-lg border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300"
            >
              Khám Phá Feed
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <ArrowDown className="size-6 text-white/30" />
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES SECTION ═══════════════ */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tính Năng{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Nổi Bật
              </span>
            </h2>
            <p className="text-white/50 max-w-lg mx-auto">
              Trải nghiệm thời trang thông minh với công nghệ AI tiên tiến nhất
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, gradient }) => (
              <div
                key={title}
                className="group relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/10"
              >
                {/* Glow effect */}
                <div
                  className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm`}
                />

                <div className="relative z-10">
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${gradient} mb-4`}
                  >
                    <Icon className="size-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ AI DEMO SECTION ═══════════════ */}
      <section ref={demoRef} className="py-24 px-6 relative" id="demo">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-sm font-medium mb-4">
              <Sparkles className="size-4" />
              Demo Miễn Phí
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Thử Ngay{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Tại Đây
              </span>
            </h2>
            <p className="text-white/50 max-w-lg mx-auto">
              Upload ảnh của bạn và ảnh quần áo muốn thử — xem kết quả AI
              tức thì
            </p>
          </div>

          {/* Upload area */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            <div>
              <p className="text-sm font-medium text-white/60 mb-2 text-center">
                📸 Ảnh của bạn
              </p>
              <DropZone
                id="person-upload"
                label="Upload ảnh toàn thân"
                file={personFile}
                onFile={setPersonFile}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white/60 mb-2 text-center">
                👗 Quần áo muốn thử
              </p>
              <DropZone
                id="garment-upload"
                label="Upload ảnh quần áo"
                file={garmentFile}
                onFile={setGarmentFile}
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-center mb-8">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!personFile || !garmentFile || isLoading}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-gray-600 disabled:to-gray-700 text-white border-0 rounded-full px-10 py-6 text-lg font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 mr-2 animate-spin" />
                  AI đang xử lý...
                </>
              ) : !personFile ? (
                "Vui lòng upload ảnh của bạn"
              ) : !garmentFile ? (
                "Vui lòng upload ảnh quần áo"
              ) : (
                <>
                  <Sparkles className="size-5 mr-2" />✨ Tạo Ảnh AI ✨
                </>
              )}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="max-w-md mx-auto mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Result display */}
          {resultUrl && (
            <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-violet-500/30 shadow-2xl shadow-violet-500/20 animate-fade-in">
              <div className="p-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
                  Kết quả thành công!
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultUrl}
                alt="AI Try-On Result"
                className="w-full"
              />
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-violet-500/20 bg-white/5 animate-pulse">
              <div className="aspect-[3/4] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="size-16 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
                  <Sparkles className="size-6 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">
                    AI đang tạo ảnh cho bạn...
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    Quá trình này mất khoảng 15-30 giây
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            © 2026 DecaDriver. Powered by AI.
          </p>
          <div className="flex gap-6">
            <a href="/feed" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Feed
            </a>
            <a href="/try-on" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Try-On
            </a>
            <a href="/wardrobe" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Wardrobe
            </a>
          </div>
        </div>
      </footer>

      {/* ═══════════════ GLOBAL ANIMATIONS ═══════════════ */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
