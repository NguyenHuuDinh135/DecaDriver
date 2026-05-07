"use client"

import { useState, useCallback } from "react"
import imageCompression from "browser-image-compression"
import { PhotoUpload } from "@workspace/ui/components/blocks/avatar/photo-upload"
import { PhotoReview } from "@workspace/ui/components/blocks/avatar/photo-review"
import { TrainingProgress } from "@workspace/ui/components/blocks/avatar/training-progress"
import { useUploadAvatar, useAvatarStatus } from "@/lib/hooks/use-avatar"

interface StepAvatarProps {
  onNext: (avatarStarted: boolean) => void
  onBack: () => void
}

type AvatarStep = "upload" | "review" | "training"

const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
}

export function StepAvatar({ onNext, onBack }: StepAvatarProps) {
  const [photos, setPhotos] = useState<File[]>([])
  const [avatarStep, setAvatarStep] = useState<AvatarStep>("upload")
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
          setAvatarStep("review")
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

  const handleStartTraining = useCallback(() => {
    setAvatarStep("training")
    uploadMutation.mutate(photos, {
      onSuccess: () => {
        onNext(true)
      },
      onError: () => {
        setAvatarStep("review")
      },
    })
  }, [photos, uploadMutation, onNext])

  const handleSkip = () => {
    onNext(false)
  }

  if (
    avatarStep === "training" ||
    currentStatus === "pending" ||
    currentStatus === "processing"
  ) {
    return (
      <div className="flex flex-col items-center gap-6">
        <TrainingProgress status={currentStatus ?? "pending"} />
        <button
          type="button"
          onClick={() => onNext(true)}
          className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-medium text-white tracking-wide transition-all hover:bg-stone-800 active:scale-[0.98]"
        >
          Continue while training
        </button>
      </div>
    )
  }

  if (currentStatus === "completed") {
    return (
      <div className="flex flex-col items-center gap-6">
        <TrainingProgress status="completed" />
        <button
          type="button"
          onClick={() => onNext(true)}
          className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-medium text-white tracking-wide transition-all hover:bg-stone-800 active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    )
  }

  if (avatarStep === "review" && photos.length > 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <h1 className="font-serif text-2xl tracking-tight text-stone-900">
            Create your likeness
          </h1>
          <p className="text-sm text-stone-500">Review your photos</p>
        </div>

        <PhotoReview
          photos={photos}
          onRemove={handleRemovePhoto}
          onContinue={handleStartTraining}
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

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={uploadMutation.isPending}
            className="w-full rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 tracking-wide transition-all hover:bg-stone-50 active:scale-[0.98]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-stone-900">
          Create your likeness
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

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 tracking-wide transition-all hover:bg-stone-50 active:scale-[0.98]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
