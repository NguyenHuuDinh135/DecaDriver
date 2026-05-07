"use client"

import { cn } from "../../../lib/utils"

interface GarmentItem {
  id: string
  title: string
  brand: string | null
  image_url: string
}

interface GarmentPickerProps {
  garments: GarmentItem[]
  selectedId: string | null
  onSelect: (garmentId: string) => void
  isLoading?: boolean
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-28 lg:w-36">
      <div className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
      <div className="mt-2 h-3 w-3/4 rounded bg-muted animate-pulse" />
      <div className="mt-1 h-2.5 w-1/2 rounded bg-muted animate-pulse" />
    </div>
  )
}

export function GarmentPicker({
  garments,
  selectedId,
  onSelect,
  isLoading = false,
}: GarmentPickerProps) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (garments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No garments available
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {garments.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            "group relative flex flex-col overflow-hidden rounded-lg border-2 transition-all duration-200",
            selectedId === item.id
              ? "border-foreground ring-1 ring-foreground/20"
              : "border-transparent hover:border-muted-foreground/30"
          )}
        >
          <div className="aspect-[3/4] overflow-hidden bg-muted">
            <img
              src={item.image_url}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <div className="p-2 text-left">
            <p className="text-xs font-medium truncate">{item.title}</p>
            {item.brand && (
              <p className="text-[0.65rem] text-muted-foreground truncate">
                {item.brand}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

export type { GarmentPickerProps, GarmentItem }