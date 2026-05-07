"use client"

import { ArrowLeft, Download, Share2, Trash2 } from "lucide-react"
import { Button } from "../../button"
import { cn } from "../../../lib/utils"

interface LookDetailViewProps {
  resultUrl: string | null
  garmentTitle?: string
  garmentBrand?: string | null
  createdAt: string
  onBack?: () => void
  onDownload?: () => void
  onShare?: () => void
  onDelete?: () => void
  isDeleting?: boolean
  className?: string
}

export function LookDetailView({
  resultUrl,
  garmentTitle,
  garmentBrand,
  createdAt,
  onBack,
  onDownload,
  onShare,
  onDelete,
  isDeleting,
  className,
}: LookDetailViewProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className={cn("flex flex-col lg:flex-row h-full bg-background", className)}>
      <div className="lg:hidden flex items-center gap-3 p-4 border-b">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-serif text-lg font-semibold">Look Detail</h1>
      </div>

      <div className="flex-1 lg:flex-[2] flex items-center justify-center bg-muted/30 p-4 lg:p-8">
        {resultUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resultUrl}
            alt={garmentTitle ?? "Try-on result"}
            className="max-h-[60vh] lg:max-h-[80vh] w-auto rounded-lg object-contain shadow-sm"
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No result image available
          </div>
        )}
      </div>

      <div className="lg:flex-1 p-6 lg:p-8 lg:border-l border-border flex flex-col gap-6 overflow-y-auto">
        <button
          onClick={onBack}
          className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <div className="space-y-2">
          {garmentTitle && (
            <h2 className="font-serif text-xl font-semibold">{garmentTitle}</h2>
          )}
          {garmentBrand && (
            <p className="text-sm text-muted-foreground">{garmentBrand}</p>
          )}
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onDownload}
            disabled={!resultUrl}
          >
            <Download className="size-4" />
            Download Image
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onShare}
            disabled={!resultUrl}
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="size-4" />
            {isDeleting ? "Deleting..." : "Delete Look"}
          </Button>
        </div>
      </div>
    </div>
  )
}
