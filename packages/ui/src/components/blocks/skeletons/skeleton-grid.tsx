import { cn } from "../../../lib/utils"
import { SkeletonCard } from "./skeleton-card"

interface SkeletonGridProps {
  count?: number
  className?: string
}

export function SkeletonGrid({ count = 9, className }: SkeletonGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
