"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Sparkles, Loader2 } from "lucide-react"
import { useAvatarStatus } from "@/lib/hooks/use-avatar"

export function AvatarStatusBanner() {
  const { data: status } = useAvatarStatus()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null
  if (!status) return null
  if (status.status !== "pending" && status.status !== "processing" && status.status !== "completed") return null

  const isTraining = status.status === "pending" || status.status === "processing"
  const isReady = status.status === "completed"

  return (
    <div className="relative flex items-center justify-center gap-2 bg-stone-900 px-4 py-2.5 text-white">
      {isTraining && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <p className="text-xs font-medium">
            Your avatar is being created...
          </p>
          <Link
            href="/onboarding/avatar"
            className="ml-1 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            View progress
          </Link>
        </>
      )}

      {isReady && (
        <>
          <Sparkles className="h-3.5 w-3.5" />
          <p className="text-xs font-medium">Avatar ready!</p>
          <Link
            href="/try-on"
            className="ml-1 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            Try it on
          </Link>
        </>
      )}

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
