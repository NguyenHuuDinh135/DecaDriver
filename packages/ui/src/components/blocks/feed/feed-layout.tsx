"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  X,
  Send,
  LogIn,
  Plus,
} from "lucide-react";
import { FeedItem } from "../../../lib/mock";
import { Avatar, AvatarFallback, AvatarImage } from "../../avatar";
import { FeedCard } from "./feed-card";
import { cn } from "../../../lib/utils";

interface FeedLayoutProps {
  items: FeedItem[];
}

export function FeedLayout({ items }: FeedLayoutProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Intersection Observer: track which card is snapped ──
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number(entry.target.getAttribute("data-index")));
          }
        });
      },
      { root, threshold: 0.6 }
    );
    const nodes = root.querySelectorAll(".feed-snap-item");
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [items]);

  // Sync comment panel khi scroll sang post mới
  useEffect(() => {
    if (isCommentOpen) {
      setSelectedPostId(items[activeIndex]?.id ?? null);
    }
  }, [activeIndex, isCommentOpen, items]);

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const openComments = useCallback(
    (id: string) => {
      if (isCommentOpen && selectedPostId === id) {
        setIsCommentOpen(false);
      } else {
        setSelectedPostId(id);
        setIsCommentOpen(true);
      }
    },
    [isCommentOpen, selectedPostId]
  );

  const closeComments = useCallback(() => setIsCommentOpen(false), []);
  const selectedItem = items.find((item) => item.id === selectedPostId);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">

      {/* ── Login button ── */}
      <div className="absolute right-5 top-4 z-50">
        <button className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background shadow-md ring-1 ring-border/50 transition-all hover:opacity-80 active:scale-95">
          <LogIn size={14} strokeWidth={2} />
          Đăng nhập
        </button>
      </div>

      {/* ── Feed column ── */}
      <motion.div
        className="flex flex-1 flex-col overflow-hidden"
        animate={{ x: isCommentOpen ? -16 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        <div
          ref={scrollRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-none"
          style={{ scrollSnapStop: "always" }}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              data-index={index}
              className="feed-snap-item h-screen w-full snap-start snap-always flex items-center justify-center px-6 py-5"
            >
              <div className="flex h-full w-full max-w-[640px] items-center justify-center gap-5">

                {/* Feed Card */}
                <div
                  className={cn(
                    "relative h-full w-full max-w-[400px] shrink-0 overflow-hidden rounded-[20px] shadow-xl ring-1 ring-border/30 transition-all duration-500",
                    activeIndex !== index && "opacity-50 scale-[0.96] shadow-md"
                  )}
                >
                  <FeedCard data={item} isActive={activeIndex === index} />
                </div>

                {/* Action bar */}
                <div className="flex shrink-0 flex-col items-center gap-5">

                  {/* Avatar + follow */}
                  <div className="relative mb-1">
                    <Avatar className="size-11 ring-2 ring-background shadow-md">
                      <AvatarImage src={`https://i.pravatar.cc/150?u=${item.user}`} />
                      <AvatarFallback className="bg-muted text-[11px] text-foreground">U</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex size-[18px] items-center justify-center rounded-full bg-rose-500 ring-[2px] ring-background">
                      <Plus size={10} strokeWidth={3} className="text-white" />
                    </div>
                  </div>

                  <ActionBtn
                    onClick={() => toggleLike(item.id)}
                    label={item.likes}
                    active={likedIds.has(item.id)}
                    icon={
                      <Heart
                        size={22}
                        strokeWidth={likedIds.has(item.id) ? 0 : 1.75}
                        className={cn(
                          "transition-all duration-200",
                          likedIds.has(item.id)
                            ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                            : "text-foreground"
                        )}
                      />
                    }
                  />

                  <ActionBtn
                    onClick={() => openComments(item.id)}
                    label={item.comments.toLocaleString()}
                    active={isCommentOpen && selectedPostId === item.id}
                    icon={
                      <MessageCircle
                        size={22}
                        strokeWidth={1.75}
                        className={cn(
                          "transition-colors",
                          isCommentOpen && selectedPostId === item.id
                            ? "text-blue-500 fill-blue-500/10"
                            : "text-foreground"
                        )}
                      />
                    }
                  />

                  <ActionBtn
                    onClick={() => toggleSave(item.id)}
                    label=""
                    active={savedIds.has(item.id)}
                    icon={
                      <Bookmark
                        size={22}
                        strokeWidth={savedIds.has(item.id) ? 0 : 1.75}
                        className={cn(
                          "transition-all duration-200",
                          savedIds.has(item.id)
                            ? "fill-amber-400 text-amber-400"
                            : "text-foreground"
                        )}
                      />
                    }
                  />

                  <ActionBtn
                    onClick={() => {}}
                    label={item.shares.toLocaleString()}
                    icon={<Share2 size={22} strokeWidth={1.75} className="text-foreground" />}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Comment panel ── */}
      <AnimatePresence>
        {isCommentOpen && selectedItem && (
          <motion.aside
            key="comment-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-7">
                  <AvatarImage src={`https://i.pravatar.cc/150?u=${selectedItem.user}`} />
                  <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">U</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[12px] font-bold text-foreground leading-none">
                    @{selectedItem.user}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedItem.comments.toLocaleString()} bình luận
                  </p>
                </div>
              </div>
              <button
                onClick={closeComments}
                className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
              >
                <X size={15} />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 scrollbar-hide">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 py-3 border-b border-border/40 last:border-0"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=cmt${selectedItem.id}${i}`} />
                    <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                      U{i}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground">user_{i}</span>
                      <span className="text-[10px] text-muted-foreground">{i}h trước</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/80">
                      {i % 3 === 0
                        ? "Trông đẹp quá! Mua ở đâu vậy bạn 😍"
                        : i % 3 === 1
                        ? "Phong cách này quá đỉnh, mình cũng muốn thử!"
                        : "Outfit hôm nay chuẩn không cần chỉnh 🔥"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <Heart size={11} className="text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground tabular-nums">{i * 13}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="shrink-0 flex items-center gap-2.5 border-t border-border px-4 py-3">
              <input
                type="text"
                placeholder="Thêm bình luận..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setNewComment("")}
                className="flex-1 rounded-full bg-muted px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-border transition-all"
              />
              <button
                onClick={() => setNewComment("")}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  newComment
                    ? "bg-foreground text-background scale-100"
                    : "bg-muted text-muted-foreground scale-95 pointer-events-none"
                )}
              >
                <Send size={15} />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 transition-transform active:scale-90"
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-all duration-200",
          active
            ? "bg-muted scale-110 shadow-sm"
            : "bg-card shadow-sm ring-1 ring-border hover:bg-muted/60 hover:scale-105"
        )}
      >
        {icon}
      </div>
      {label ? (
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          {label}
        </span>
      ) : null}
    </button>
  );
}