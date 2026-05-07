"use client"

import { useRouter } from "next/navigation"
import { Check } from "lucide-react"

interface StepCompleteProps {
  fullName: string
  avatarStarted: boolean
}

export function StepComplete({ fullName, avatarStarted }: StepCompleteProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900">
        <Check className="h-7 w-7 text-white" />
      </div>

      <div className="text-center flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-stone-900">
          You&apos;re all set!
        </h1>
        <p className="text-sm text-stone-500">
          Welcome, {fullName || "there"}. Here&apos;s what we set up:
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-3 rounded-lg border border-stone-100 px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900">
            <Check className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm text-stone-700">Profile name saved</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-stone-100 px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900">
            <Check className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm text-stone-700">Style preference set</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-stone-100 px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900">
            <Check className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm text-stone-700">
            {avatarStarted
              ? "Avatar training in progress (~3 min)"
              : "Avatar skipped (create later in profile)"}
          </span>
        </div>
      </div>

      {avatarStarted && (
        <p className="text-xs text-stone-400 text-center">
          Your avatar is being created. You can start browsing while it trains.
        </p>
      )}

      <button
        type="button"
        onClick={() => router.push("/feed")}
        className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-medium text-white tracking-wide transition-all hover:bg-stone-800 active:scale-[0.98]"
      >
        Start Exploring
      </button>
    </div>
  )
}
