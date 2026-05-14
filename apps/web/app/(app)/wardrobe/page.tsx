"use client"

import Link from "next/link"
import { useState } from "react"
import { Clock, Download, Share2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ShareModal } from "@workspace/ui/components/blocks/share-modal"
import { useCompletedTryOns } from "@/lib/hooks/use-wardrobe"
import { downloadImage } from "@/lib/utils/download"

export default function WardrobePage() {
  const { data: completed, isLoading } = useCompletedTryOns()
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-lg pb-4">
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-serif text-lg font-semibold">Wardrobe</h1>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/wardrobe/history">
            <Clock className="mr-1 size-4" />
            History
          </Link>
        </Button>
      </header>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] w-full rounded-xl" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && completed.length === 0 && (
        <div className="flex min-h-60 flex-col items-center justify-center px-4 text-center">
          <p className="text-sm text-muted-foreground">
            No completed looks yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try on garments to build your wardrobe.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/try-on">Start Try-On</Link>
          </Button>
        </div>
      )}

      {!isLoading && completed.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {completed.map((job) => (
            <div key={job.id} className="group relative">
              <Link
                href={`/feed/${job.id}`}
                className="block aspect-[3/4] overflow-hidden rounded-xl bg-muted"
              >
                {job.result_url && (
                  <img
                    src={job.result_url}
                    alt="Try-on result"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
              </Link>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[0.65rem] text-muted-foreground">
                  {new Date(job.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6"
                    onClick={() => job.result_url && downloadImage(job.result_url)}
                  >
                    <Download className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6"
                    onClick={() =>
                      setShareUrl(`${window.location.origin}/feed/${job.id}`)
                    }
                  >
                    <Share2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ShareModal
        open={!!shareUrl}
        onOpenChange={(open) => !open && setShareUrl(null)}
        url={shareUrl ?? ""}
        title="Share Look"
      />
    </div>
  )
}
