"use client"

import { useCallback, useRef, useState, type DragEvent } from "react"
import { cn } from "../../../lib/utils"
import { Upload, ImagePlus, AlertCircle } from "lucide-react"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIN_PHOTOS = 5
const MAX_PHOTOS = 10

interface PhotoUploadProps {
  onFilesSelected: (files: File[]) => void
  currentCount: number
  disabled?: boolean
}

interface ValidationError {
  file: string
  reason: string
}

const GUIDELINES = [
  { label: "Face front", description: "Clear, well-lit front-facing photo" },
  { label: "Side angles", description: "Left and right profile shots" },
  { label: "Full body", description: "Head-to-toe in fitted clothing" },
  { label: "Varied poses", description: "Natural, relaxed positions" },
]

export function PhotoUpload({
  onFilesSelected,
  currentCount,
  disabled = false,
}: PhotoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_PHOTOS - currentCount

  const validateFiles = useCallback(
    (files: FileList | File[]): { valid: File[]; errors: ValidationError[] } => {
      const valid: File[] = []
      const validationErrors: ValidationError[] = []

      const fileArray = Array.from(files)
      const allowedCount = Math.min(fileArray.length, remaining)

      if (fileArray.length > remaining) {
        validationErrors.push({
          file: "",
          reason: `Can only add ${remaining} more photo${remaining === 1 ? "" : "s"}`,
        })
      }

      for (const file of fileArray.slice(0, allowedCount)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          validationErrors.push({
            file: file.name,
            reason: "Must be JPEG, PNG, or WebP",
          })
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          validationErrors.push({
            file: file.name,
            reason: "Must be under 10MB",
          })
          continue
        }

        valid.push(file)
      }

      return { valid, errors: validationErrors }
    },
    [remaining]
  )

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const { valid, errors: newErrors } = validateFiles(files)
      setErrors(newErrors)

      if (valid.length > 0) {
        onFilesSelected(valid)
      }
    },
    [validateFiles, onFilesSelected]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      if (disabled || remaining <= 0) return
      handleFiles(e.dataTransfer.files)
    },
    [disabled, remaining, handleFiles]
  )

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (!disabled && remaining > 0) {
        setIsDragOver(true)
      }
    },
    [disabled, remaining]
  )

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleClick = () => {
    if (!disabled && remaining > 0) {
      inputRef.current?.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
      e.target.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photos"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick()
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer",
          isDragOver
            ? "border-stone-900 bg-stone-50 scale-[1.01]"
            : "border-stone-200 hover:border-stone-400",
          (disabled || remaining <= 0) && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
          {isDragOver ? (
            <ImagePlus className="h-6 w-6 text-stone-900" />
          ) : (
            <Upload className="h-6 w-6 text-stone-500" />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-stone-900">
            {isDragOver ? "Drop photos here" : "Drag & drop photos"}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            or click to select files
          </p>
          <p className="mt-2 text-xs text-stone-400">
            JPEG, PNG, or WebP &middot; Max 10MB each
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleInputChange}
          className="hidden"
          data-testid="file-input"
        />
      </div>

      {errors.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {errors.map((error, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-red-600"
            >
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>
                {error.file ? `${error.file}: ` : ""}
                {error.reason}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
          Photo guidelines
        </p>
        <div className="grid grid-cols-2 gap-3">
          {GUIDELINES.map((guide) => (
            <div
              key={guide.label}
              className="rounded-lg border border-stone-100 p-3"
            >
              <p className="text-xs font-medium text-stone-700">
                {guide.label}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-400">
                {guide.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-stone-400">
        Upload {MIN_PHOTOS}&ndash;{MAX_PHOTOS} photos for best results
      </p>
    </div>
  )
}

export { ACCEPTED_TYPES, MAX_FILE_SIZE, MIN_PHOTOS, MAX_PHOTOS }
export type { PhotoUploadProps, ValidationError }
