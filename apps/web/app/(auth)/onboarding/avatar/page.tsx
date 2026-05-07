"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import imageCompression from "browser-image-compression"
import { PhotoUpload } from "@workspace/ui/components/blocks/avatar/photo-upload"
import { PhotoReview } from "@workspace/ui/components/blocks/avatar/photo-review"
import { TrainingProgress } from "@workspace/ui/components/blocks/avatar/training-progress"
import { useUploadAvatar, useAvatarStatus } from "@/lib/hooks/use-avatar"

type Step = "upload" | "review" | "training" | "complete"

const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
}

export default function AvatarPage() {
  const router = useRouter()
  const [photos, setPhotos] = useState<File[]>([])
  const [step, setStep] = useState<Step>("upload")
  const [compressionInProgress, setCompressionInProgress] = useState(false)

  const uploadMutation = useUploadAvatar()
  const { data: statusData } = useAvatarStatus()

  const currentStatus = statusData?.status

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setCompressionInProgress(true)
      try {
        const compressed = await Promise.all(
          files.map((file) => imageCompression(file, COMPRESSION_OPTIONS))
        )
        setPhotos((prev) => [...prev, ...compressed])
        if (photos.length + compressed.length > 0) {
          setStep("review")
        }
      } finally {
        setCompressionInProgress(false)
      }
    },
    [photos.length]
  )

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleContinue = useCallback(async () => {
    setStep("training")
    uploadMutation.mutate(photos, {
      onError: () => {
        setStep("review")
      },
    })
  }, [photos, uploadMutation])

  const handleRetry = useCallback(() => {
    setStep("review")
  }, [])

  const handleComplete = useCallback(() => {
    router.push("/onboarding/brands")
  }, [router])

  if (step === "training" || currentStatus === "pending" || currentStatus === "processing") {
    const displayStatus = currentStatus ?? "pending"
    return (
      <div className="flex flex-col items-center gap-8 py-8">
        <TrainingProgress status={displayStatus} />
      </div>
    )
  }

  if (currentStatus === "completed" || step === "complete") {
    return (
      <div className="flex flex-col items-center gap-8 py-8">
        <TrainingProgress status="completed" />
        <button
          type="button"
          onClick={handleComplete}
          className="w-full max-w-xs rounded-lg bg-stone-900 py-3 text-sm font-medium text-white hover:bg-stone-800 active:scale-[0.98] transition-all"
        >
          Continue to next step
        </button>
      </div>
    )
  }

  if (currentStatus === "failed") {
    return (
      <div className="flex flex-col items-center gap-8 py-8">
        <TrainingProgress status="failed" />
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <p className="text-center text-sm text-stone-500">
            Training failed. Please try again with different photos.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full rounded-lg bg-stone-900 py-3 text-sm font-medium text-white hover:bg-stone-800 active:scale-[0.98] transition-all"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (step === "review" && photos.length > 0) {
    return (
      <div className="flex flex-col gap-6 py-8">
        <div className="text-center flex flex-col gap-2">
          <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">
            Step 2 of 3
          </p>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            Review your photos
          </h1>
        </div>

        <PhotoReview
          photos={photos}
          onRemove={handleRemovePhoto}
          onContinue={handleContinue}
          disabled={uploadMutation.isPending}
        />

        <PhotoUpload
          onFilesSelected={handleFilesSelected}
          currentCount={photos.length}
          disabled={compressionInProgress || uploadMutation.isPending}
        />

        {uploadMutation.isError && (
          <p className="text-center text-xs text-red-600">
            Upload failed. Please try again.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="text-center flex flex-col gap-2">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">
          Step 2 of 3
        </p>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Create your avatar
        </h1>
        <p className="text-sm text-stone-500">
          Upload photos to train your personal AI model
        </p>
      </div>

      <PhotoUpload
        onFilesSelected={handleFilesSelected}
        currentCount={photos.length}
        disabled={compressionInProgress}
      />
    </div>
  )
}
