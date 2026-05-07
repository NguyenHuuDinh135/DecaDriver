import Link from "next/link"
import { Flame } from "lucide-react"
import { cn } from "../../../lib/utils"

interface EmptyFeedProps {
  className?: string
}

export function EmptyFeed({ className }: EmptyFeedProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 px-6 py-20 text-center",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full border border-border">
        <Flame className="size-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <h2 className="font-serif text-2xl tracking-tight">Discover your style</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create your first look and share it with the community.
        </p>
      </div>
      <Link
        href="/create"
        className="inline-flex h-10 items-center rounded-full border border-foreground bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Create a look
      </Link>
    </div>
  )
}
