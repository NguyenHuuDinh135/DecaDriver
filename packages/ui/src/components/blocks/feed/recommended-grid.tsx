"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "../../button"
import { cn } from "../../../lib/utils"

interface GarmentPublic {
  id: string
  title: string
  brand: string | null
  image_url: string
  created_at: string
}

interface RecommendedGridProps {
  garments: GarmentPublic[]
  isLoading?: boolean
  className?: string
}

function GarmentCard({ garment }: { garment: GarmentPublic }) {
  return (
    <div className="group overflow-hidden rounded-lg border border-border/50 bg-card">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={garment.image_url}
          alt={garment.title}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-3 space-y-2">
        <div>
          <h3 className="text-sm font-medium leading-tight line-clamp-1">
            {garment.title}
          </h3>
          {garment.brand && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {garment.brand}
            </p>
          )}
        </div>
        <Button size="sm" className="w-full text-xs" asChild>
          <Link href={`/try-on?garment=${garment.id}`}>
            <Sparkles className="size-3" />
            Try On
          </Link>
        </Button>
      </div>
    </div>
  )
}

function SkeletonItem() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
      <div className="aspect-[3/4] animate-pulse bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-7 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function RecommendedGrid({
  garments,
  isLoading,
  className,
}: RecommendedGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonItem key={i} />
        ))}
      </div>
    )
  }

  if (garments.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border/50 px-6">
        <p className="text-sm text-muted-foreground text-center">
          Complete your style analysis to get recommendations
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {garments.map((garment) => (
        <GarmentCard key={garment.id} garment={garment} />
      ))}
    </div>
  )
}

export type { GarmentPublic, RecommendedGridProps }
