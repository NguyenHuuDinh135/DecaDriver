"use client"

import Link from "next/link"
import { ArrowLeft, Download, RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useTryOnHistory } from "@/lib/hooks/use-wardrobe"
import { downloadImage } from "@/lib/utils/download"

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
} as const

export default function HistoryPage() {
  const { data: jobs, isLoading } = useTryOnHistory()

  return (
    <div className="mx-auto max-w-lg pb-8">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/wardrobe">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="font-serif text-lg font-semibold">Try-On History</h1>
      </header>

      {isLoading && (
        <div className="space-y-3 px-4 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!jobs || jobs.length === 0) && (
        <div className="flex min-h-60 items-center justify-center px-4 text-center">
          <p className="text-sm text-muted-foreground">No try-on history yet.</p>
        </div>
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="space-y-3 px-4 pt-4">
          {jobs.map((job) => {
            const config = STATUS_CONFIG[job.status]
            return (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                {job.status === "completed" && job.result_url ? (
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={job.result_url}
                      alt="Result"
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <span className="text-xs text-muted-foreground">
                      {job.status === "failed" ? "!" : "..."}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={config.className}>
                      {config.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  {job.status === "completed" && job.result_url && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => downloadImage(job.result_url!)}
                    >
                      <Download className="size-4" />
                    </Button>
                  )}
                  {job.status === "failed" && (
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href="/try-on">
                        <RotateCcw className="size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
