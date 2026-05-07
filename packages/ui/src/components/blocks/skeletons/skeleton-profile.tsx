import { cn } from "../../../lib/utils"

interface SkeletonProfileProps {
  className?: string
}

export function SkeletonProfile({ className }: SkeletonProfileProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="size-20 animate-pulse rounded-full bg-muted" />
      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
