"use client"

import { Sparkles } from "lucide-react"
import { Button } from "../../button"
import { cn } from "../../../lib/utils"

interface ProductItem {
  id: string
  title: string
  brand: string | null
  image_url: string
}

interface ProductCatalogProps {
  garments: ProductItem[]
  onTryOn?: (id: string) => void
  isLoading?: boolean
  className?: string
}

export function ProductCatalog({
  garments,
  onTryOn,
  isLoading,
  className,
}: ProductCatalogProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="aspect-[3/4] animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (garments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No garments found</p>
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
        <div
          key={garment.id}
          className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-md"
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={garment.image_url}
              alt={garment.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 p-2">
              <Button
                size="sm"
                className="w-full rounded-full text-xs font-semibold"
                onClick={() => onTryOn?.(garment.id)}
              >
                <Sparkles className="mr-1 size-3" />
                Try On
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1 p-3">
            <h3 className="text-sm font-medium leading-tight line-clamp-1">
              {garment.title}
            </h3>
            {garment.brand && (
              <p className="text-xs text-muted-foreground">{garment.brand}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
