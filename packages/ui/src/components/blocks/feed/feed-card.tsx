"use client"

import { cn } from "../../../lib/utils"

interface FeedCardProps {
  imageUrl: string
  title: string
  subtitle?: string
  date?: string
  onClick?: () => void
  className?: string
}

export function FeedCard({
  imageUrl,
  title,
  subtitle,
  date,
  onClick,
  className,
}: FeedCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:shadow-md hover:scale-[1.02]",
        className
      )}
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {subtitle}
          </p>
        )}
        {date && (
          <time className="text-xs text-muted-foreground">{date}</time>
        )}
      </div>
    </button>
  )
}
