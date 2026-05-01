"use client"

import { ShieldCheck, Camera } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { ImageUploadGrid } from "./ImageUploadGrid"

interface UploadStepProps {
  images: File[]
  onImagesChange: (images: File[]) => void
  onSubmit: () => void
}

const REQUIRED_IMAGES = 6

/**
 * Step 1: Upload selfies.
 *
 * Desktop adaptation of mobile screens 1-5:
 * - Title + subtitle (from intro screen)
 * - Privacy notice (from privacy screen)
 * - 3×2 drag-and-drop grid (replaces camera capture)
 * - "Start Training" CTA (enabled when 6 images selected)
 */
export function UploadStep({ images, onImagesChange, onSubmit }: UploadStepProps) {
  const isReady = images.length >= REQUIRED_IMAGES

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Take 6 selfies
        </h2>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed">
          To capture your facial likeness we need photos from different angles.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-base font-medium">We care about privacy</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your images are only used to create your likeness, never sold,
            shared, or used otherwise.
          </p>
        </div>
      </div>

      {/* Upload grid */}
      <ImageUploadGrid
        images={images}
        onImagesChange={onImagesChange}
        maxImages={REQUIRED_IMAGES}
        columns={3}
      />

      {/* Angle guide */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {["Left", "Front left", "Front right", "Right", "Look down", "Straight"].map(
          (label) => (
            <div key={label} className="flex items-center gap-2">
              <Camera className="size-4 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          )
        )}
      </div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={onSubmit}
        disabled={!isReady}
        className="w-full text-base cursor-pointer"
      >
        {isReady
          ? "Start Training"
          : `Upload ${REQUIRED_IMAGES - images.length} more photo${REQUIRED_IMAGES - images.length === 1 ? "" : "s"}`}
      </Button>
    </div>
  )
}
