"use client"

import Link from "next/link"
import { useState } from "react"
import { Clock, Download, Share2, Grid3X3, LayoutList, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { ShareModal } from "@workspace/ui/components/blocks/share-modal"
import { MOCK_LOOKS, MOCK_GARMENTS } from "@/lib/mock-data"

type ViewMode = "grid" | "list"

export default function WardrobePage() {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [looks, setLooks] = useState(MOCK_LOOKS)

  const handleDelete = (id: string) => {
    setLooks((prev) => prev.filter((l) => l.id !== id))
  }

  const garmentForLook = (garmentId: string) =>
    MOCK_GARMENTS.find((g) => g.id === garmentId)

  return (
    <div className="mx-auto max-w-lg pb-4">
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-serif text-lg font-semibold">Wardrobe</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className={`size-8 ${viewMode === "grid" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={`size-8 ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/wardrobe/history">
              <Clock className="mr-1 size-4" />
              History
            </Link>
          </Button>
        </div>
      </header>

      {looks.length === 0 ? (
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
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {looks.map((job) => {
            const garment = garmentForLook(job.garment_id)
            return (
              <div key={job.id} className="group relative">
                <Link
                  href={`/feed/${job.id}`}
                  className="block aspect-[3/4] overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={job.result_url}
                    alt="Try-on result"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                </Link>
                <div className="mt-1.5 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {garment?.title ?? "Look"}
                    </p>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-6"
                      onClick={() =>
                        setShareUrl(
                          `${window.location.origin}/feed/${job.id}`
                        )
                      }
                    >
                      <Share2 className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 pt-4">
          {looks.map((job) => {
            const garment = garmentForLook(job.garment_id)
            return (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-muted/50"
              >
                <Link
                  href={`/feed/${job.id}`}
                  className="block size-16 shrink-0 overflow-hidden rounded-lg bg-muted"
                >
                  <img
                    src={job.result_url}
                    alt="Try-on result"
                    className="size-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {garment?.title ?? "Look"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {garment?.brand ?? "Unknown Brand"} •{" "}
                    {new Date(job.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    onClick={() =>
                      setShareUrl(
                        `${window.location.origin}/feed/${job.id}`
                      )
                    }
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(job.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
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
