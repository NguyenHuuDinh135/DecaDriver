"use client"

import { useCallback, useRef, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { ImagePlus, X } from "lucide-react"

interface ImageUploadGridProps {
  images: File[]
  onImagesChange: (images: File[]) => void
  maxImages?: number
  columns?: number
  className?: string
}

/**
 * Desktop drag-and-drop image upload grid.
 * - 3×2 grid of slots
 * - Drag files onto the grid or click to browse
 * - Each filled slot shows a preview with hover overlay + remove button
 * - Empty slots show numbering with a dashed border
 */
export function ImageUploadGrid({
  images,
  onImagesChange,
  maxImages = 6,
  columns = 3,
  className,
}: ImageUploadGridProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const slots = Array.from({ length: maxImages }, (_, i) => images[i] || null)

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      )
      const remaining = maxImages - images.length
      const toAdd = newFiles.slice(0, remaining)
      if (toAdd.length > 0) {
        onImagesChange([...images, ...toAdd])
      }
    },
    [images, maxImages, onImagesChange]
  )

  const removeImage = useCallback(
    (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index))
    },
    [images, onImagesChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files)
        e.target.value = ""
      }
    },
    [addFiles]
  )

  const openFilePicker = () => fileInputRef.current?.click()

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Grid */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "grid gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors sm:gap-4 sm:p-5",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 bg-muted/30",
        )}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {slots.map((file, index) => (
          <ImageSlot
            key={index}
            file={file}
            index={index}
            onRemove={() => removeImage(index)}
            onClick={!file ? openFilePicker : undefined}
          />
        ))}
      </div>

      {/* Helper text */}
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Drag & drop images or click an empty slot to browse ·{" "}
        <span className="font-semibold">
          {images.length}/{maxImages}
        </span>
      </p>
    </div>
  )
}

/* ─── Individual slot ─── */

function ImageSlot({
  file,
  index,
  onRemove,
  onClick,
}: {
  file: File | null
  index: number
  onRemove: () => void
  onClick?: () => void
}) {
  const [previewUrl] = useState(() =>
    file ? URL.createObjectURL(file) : null
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl transition-all",
        file
          ? "cursor-default ring-1 ring-foreground/[0.06]"
          : "cursor-pointer border-2 border-dashed border-muted-foreground/30 bg-muted/50 hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      {file && previewUrl ? (
        <>
          {/* Image preview — fills the slot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`Selfie ${index + 1}`}
            className="size-full object-cover"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="flex size-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md transition-transform hover:scale-110 cursor-pointer"
              aria-label={`Remove selfie ${index + 1}`}
            >
              <X className="size-5" />
            </button>
          </div>
        </>
      ) : (
        /* Empty slot */
        <div className="flex flex-col items-center gap-2">
          <ImagePlus className="size-7 text-muted-foreground/40" />
          <span className="text-sm font-medium text-muted-foreground/60">
            {index + 1}
          </span>
        </div>
      )}
    </button>
  )
}
