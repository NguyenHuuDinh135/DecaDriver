"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Progress } from "@workspace/ui/components/progress"
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface TrainingStepProps {
  images: File[]
  onComplete: (loraKey: string) => void
  onError: (message: string) => void
  onRetry: () => void
}

type Phase = "uploading" | "training" | "failed"

/**
 * Step 2: Upload & Training progress.
 *
 * Handles:
 * 1. POST /api/v1/avatar/train (multipart upload with progress)
 * 2. GET /api/v1/avatar/status/:id (polling every 4s)
 * 3. Error state with retry
 */
export function TrainingStep({
  images,
  onComplete,
  onError,
  onRetry,
}: TrainingStepProps) {
  const [phase, setPhase] = useState<Phase>("uploading")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [jobId, setJobId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStarted = useRef(false)

  // ─── Upload images ───
  const startUpload = useCallback(async () => {
    try {
      setPhase("uploading")
      setUploadProgress(0)

      const formData = new FormData()
      images.forEach((file, i) => formData.append("images", file, `selfie_${i}.jpg`))

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const res = await fetch(`${baseUrl}/api/v1/avatar/train`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)

      const data = await res.json()
      setJobId(data.job_id)
      setUploadProgress(100)
      setPhase("training")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setErrorMessage(msg)
      setPhase("failed")
      onError(msg)
    }
  }, [images, onError])

  // ─── Poll status ───
  const pollStatus = useCallback(async () => {
    if (!jobId) return
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const res = await fetch(`${baseUrl}/api/v1/avatar/status/${jobId}`)
      if (!res.ok) return // silent retry

      const data = await res.json()
      switch (data.status) {
        case "uploading":
        case "training":
          setTrainingProgress(data.progress ?? 0)
          break
        case "completed":
          setTrainingProgress(100)
          onComplete(data.lora_s3_key || "")
          break
        case "failed":
          setErrorMessage(data.error || "Training failed")
          setPhase("failed")
          onError(data.error || "Training failed")
          break
      }
    } catch {
      // silent retry
    }
  }, [jobId, onComplete, onError])

  // Auto-start upload
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true
      startUpload()
    }
  }, [startUpload])

  // Start polling when training
  useEffect(() => {
    if (phase === "training" && jobId) {
      pollStatus()
      pollRef.current = setInterval(pollStatus, 4000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [phase, jobId, pollStatus])

  // Simulated progress for upload (since fetch doesn't support onUploadProgress natively)
  useEffect(() => {
    if (phase !== "uploading") return
    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 2, 90))
    }, 200)
    return () => clearInterval(interval)
  }, [phase])

  if (phase === "failed") {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold">Something went wrong</h3>
          <p className="mt-2 text-base text-muted-foreground">{errorMessage}</p>
        </div>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          Try Again
        </Button>
      </div>
    )
  }

  const isUploading = phase === "uploading"
  const displayProgress = isUploading ? uploadProgress : trainingProgress

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {/* Spinner */}
      <div className="relative">
        <Loader2
          className={cn(
            "size-20 animate-spin text-primary/20",
            isUploading && "text-primary/40"
          )}
          strokeWidth={1.5}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold">{Math.round(displayProgress)}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm">
        <Progress value={displayProgress} className="h-1.5" />
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-base font-medium">
          {isUploading ? "Uploading your selfies..." : "Creating your likeness..."}
        </p>
        {!isUploading && (
          <p className="mt-1 text-sm text-muted-foreground">
            This usually takes about 30 minutes
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        You can leave this page — we&apos;ll notify you when it&apos;s ready.
      </p>
    </div>
  )
}
