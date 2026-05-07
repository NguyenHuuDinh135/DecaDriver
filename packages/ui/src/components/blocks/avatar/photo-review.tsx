"use client"

import { useMemo } from "react"
import { cn } from "../../../lib/utils"
import { X, AlertTriangle } from "lucide-react"

const MIN_PHOTOS = 5
const MAX_PHOTOS = 10

interface PhotoReviewProps {
  photos: File[]
  onRemove: (index: number) => void
  onContinue: () => void
  disabled?: boolean
}

export function PhotoReview({
  photos,
  onRemove,
  onContinue,
  disabled = false,
}: PhotoReviewProps) {
  const isValid = photos.length >= MIN_PHOTOS
  const progress = Math.min(photos.length / MAX_PHOTOS, 1)

  const previews = useMemo(() => {
    return photos.map((file) => URL.createObjectURL(file))
  }, [photos])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isValid ? "text-stone-900" : "text-red-600"
            )}
          >
            {photos.length}/{MAX_PHOTOS} photos
          </span>
          {!isValid && (
            <span className="text-xs text-red-500">
              (min {MIN_PHOTOS} required)
            </span>
          )}
        </div>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isValid ? "bg-stone-900" : "bg-red-500"
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {!isValid && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-xs text-red-600">
            Add at least {MIN_PHOTOS - photos.length} more photo
            {MIN_PHOTOS - photos.length === 1 ? "" : "s"} to continue
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {previews.map((src, index) => (
          <div
            key={`${photos[index]?.name ?? index}-${index}`}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
              !isValid ? "border-red-200" : "border-stone-100"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Photo ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={disabled}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
              aria-label={`Remove photo ${index + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!isValid || disabled}
        className={cn(
          "w-full rounded-lg py-3 text-sm font-medium transition-all",
          isValid && !disabled
            ? "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98]"
            : "bg-stone-100 text-stone-400 cursor-not-allowed"
        )}
      >
        Continue
      </button>
    </div>
  )
}

export { MIN_PHOTOS, MAX_PHOTOS }
export type { PhotoReviewProps }
