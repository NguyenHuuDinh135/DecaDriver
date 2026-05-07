"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FeedCard } from "@workspace/ui/components/blocks/feed/feed-card"
import { RecommendedGrid } from "@workspace/ui/components/blocks/feed/recommended-grid"
import { AnalyzeTrigger } from "@workspace/ui/components/blocks/stylist/analyze-trigger"
import { SkeletonGrid } from "@workspace/ui/components/blocks/skeletons/skeleton-grid"
import { useRecommendations, useAnalyzeStyle } from "@/lib/hooks/use-stylist"
import { useStyleProfile } from "@/lib/hooks/use-profile"
import { useAvatarStatus } from "@/lib/hooks/use-avatar"
import { useGarments } from "@/lib/hooks/use-tryon"
import { useCompletedTryOns } from "@/lib/hooks/use-wardrobe"

export default function FeedPage() {
  const router = useRouter()
  const { data: styleProfile, isLoading: profileLoading } = useStyleProfile()
  const { data: recommendations, isLoading: recsLoading } = useRecommendations()
  const { data: avatarJob } = useAvatarStatus()
  const { data: fallbackGarments, isLoading: garmentsLoading } = useGarments(0, 20)
  const { data: completedLooks, isLoading: looksLoading } = useCompletedTryOns()
  const analyzeStyle = useAnalyzeStyle()
  const [page, setPage] = useState(0)

  const hasProfile = !!styleProfile
  const referenceImageUrl = avatarJob?.reference_image_url

  const handleAnalyze = () => {
    if (referenceImageUrl) {
      analyzeStyle.mutate({ image_url: referenceImageUrl })
    }
  }

  const displayGarments = recommendations ?? fallbackGarments?.data ?? []
  const isGridLoading = hasProfile ? recsLoading : garmentsLoading

  const totalGarments = fallbackGarments?.count ?? 0
  const limit = 20
  const hasMore = (page + 1) * limit < totalGarments

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
            {hasProfile
              ? "Personalized picks based on your style profile"
              : "Browse your looks and discover new styles"}
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="font-serif text-xl font-medium">Your Looks</h2>

          {looksLoading ? (
            <SkeletonGrid count={4} className="lg:grid-cols-4" />
          ) : completedLooks && completedLooks.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {completedLooks.map((look) => (
                <FeedCard
                  key={look.id}
                  imageUrl={look.result_url ?? ""}
                  title={`Look #${look.id.slice(-4)}`}
                  subtitle={`Garment ${look.garment_id.slice(-4)}`}
                  date={formatDate(look.created_at)}
                  onClick={() => router.push(`/feed/${look.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">
                No looks yet. Try on a garment to create your first look.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/try-on")}
              >
                Start a Try-On
              </Button>
            </div>
          )}
        </section>

        {!hasProfile && !profileLoading && (
          <section>
            {referenceImageUrl ? (
              <AnalyzeTrigger
                onAnalyze={handleAnalyze}
                isAnalyzing={analyzeStyle.isPending}
                result={analyzeStyle.data}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/50 p-6 text-center">
                <Sparkles className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Analyze your style to get personalized picks
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/profile">Set up your avatar first</Link>
                </Button>
              </div>
            )}
          </section>
        )}

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

          <RecommendedGrid garments={displayGarments} isLoading={isGridLoading} />

          {hasMore && !isGridLoading && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
              >
                Load More
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
