"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, TrendingUp } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FeedCard } from "@workspace/ui/components/blocks/feed/feed-card"
import { RecommendedGrid } from "@workspace/ui/components/blocks/feed/recommended-grid"
import { MOCK_GARMENTS, MOCK_LOOKS, MOCK_STYLE_PROFILE } from "@/lib/mock-data"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function FeedPage() {
  const router = useRouter()
  const [likedLooks, setLikedLooks] = useState<Set<string>>(new Set())

  const toggleLike = (id: string) => {
    setLikedLooks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 space-y-10">
        <header>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Your Style Feed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personalized picks based on your style profile
          </p>
        </header>

        {/* Style Profile Summary */}
        <section className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Your Style Profile</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Body Type</p>
              <p className="font-medium">{MOCK_STYLE_PROFILE.body_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Color Tone</p>
              <p className="font-medium">{MOCK_STYLE_PROFILE.color_tone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Height</p>
              <p className="font-medium">{MOCK_STYLE_PROFILE.height_estimate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recommended</p>
              <p className="font-medium">
                {MOCK_STYLE_PROFILE.recommended_styles.slice(0, 2).join(", ")}
              </p>
            </div>
          </div>
        </section>

        {/* Your Looks */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-medium">Your Looks</h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {MOCK_LOOKS.map((look) => {
              const garment = MOCK_GARMENTS.find(
                (g) => g.id === look.garment_id
              )
              return (
                <div key={look.id} className="group relative">
                  <FeedCard
                    imageUrl={look.result_url}
                    title={`Look #${look.id.slice(-3)}`}
                    subtitle={garment?.title ?? "Unknown Garment"}
                    date={formatDate(look.created_at)}
                    onClick={() => router.push(`/feed/${look.id}`)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLike(look.id)
                    }}
                    className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors hover:bg-black/50"
                  >
                    <Heart
                      className={`size-4 transition-all ${
                        likedLooks.has(look.id)
                          ? "fill-red-500 text-red-500 scale-110"
                          : "text-white"
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Discover */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium">Discover</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/feed/products")}
            >
              View All
            </Button>
          </div>

          <RecommendedGrid garments={MOCK_GARMENTS} isLoading={false} />
        </section>
      </div>
    </div>
  )
}
