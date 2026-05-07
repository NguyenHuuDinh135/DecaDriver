"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Download, Share2, RefreshCw, ArrowLeft, BookmarkPlus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { useTryOnResult } from "@/lib/hooks/use-tryon"
import { downloadImage } from "@/lib/utils/download"

function PendingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-8 size-32">
        <div className="absolute inset-0 rounded-full border-4 border-foreground/10 animate-ping" />
        <div className="absolute inset-0 rounded-full border-4 border-t-foreground animate-spin" />
      </div>
      <h2 className="text-xl font-serif tracking-tight animate-pulse">
        Generating your look...
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Our AI is compositing the garment onto your avatar. This usually takes
        10-30 seconds.
      </p>
    </div>
  )
}

function FailedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
        <span className="text-2xl">!</span>
      </div>
      <h2 className="text-xl font-serif tracking-tight">Generation failed</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Something went wrong while generating your try-on image. Please try
        again with a different garment or the same one.
      </p>
      <Button onClick={onRetry} className="mt-6">
        <RefreshCw className="mr-2 size-4" />
        Try Again
      </Button>
    </div>
  )
}

function TryOnResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const jobId = searchParams.get("job")

  const { data: job } = useTryOnResult(jobId)

  const handleDownload = () => {
    if (job?.result_url) {
      downloadImage(job.result_url, `decadriver-tryon-${job.id}.jpg`)
    }
  }

  const handleShare = async () => {
    if (!job?.result_url) return
    if (navigator.share) {
      await navigator.share({
        title: "My DecaDriver Look",
        url: job.result_url,
      })
    }
  }

  const handleTryAnother = () => {
    router.push("/try-on")
  }

  if (!jobId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground">No job specified.</p>
        <Button variant="outline" className="mt-4" onClick={handleTryAnother}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Try-On
        </Button>
      </div>
    )
  }

  const status = job?.status ?? "pending"

  if (status === "pending" || status === "processing") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PendingState />
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <FailedState onRetry={handleTryAnother} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-muted shadow-lg">
          <div className="aspect-[3/4]">
            <img
              src={job!.result_url!}
              alt="Try-on result"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            AI Generated
          </div>
        </div>

        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 size-4" />
            Download
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 size-4" />
            Share
          </Button>
          <Button className="col-span-2">
            <BookmarkPlus className="mr-2 size-4" />
            Save to Wardrobe
          </Button>
        </div>

        <Button variant="ghost" onClick={handleTryAnother}>
          <RefreshCw className="mr-2 size-4" />
          Try Another
        </Button>
      </div>
    </div>
  )
}

export default function TryOnResultPage() {
  return (
    <Suspense fallback={<PendingState />}>
      <TryOnResultContent />
    </Suspense>
  )
}