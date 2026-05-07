"use client"

import { cn } from "../../../lib/utils"
import { Check } from "lucide-react"

type AvatarStatus = "pending" | "processing" | "completed" | "failed"

interface TrainingProgressProps {
  status: AvatarStatus
}

const STEPS = [
  { key: "analyzing", label: "Analyzing photos" },
  { key: "training", label: "Training model" },
  { key: "finalizing", label: "Finalizing avatar" },
] as const

function getActiveStep(status: AvatarStatus): number {
  switch (status) {
    case "pending":
      return 0
    case "processing":
      return 1
    case "completed":
      return 3
    case "failed":
      return -1
  }
}

export function TrainingProgress({ status }: TrainingProgressProps) {
  const activeStep = getActiveStep(status)

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-2 border-stone-100" />
        {status !== "completed" && status !== "failed" && (
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-stone-900 animate-spin" />
        )}
        {status === "completed" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-stone-900">
            <Check className="h-8 w-8 text-white" />
          </div>
        )}
        {status === "failed" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-red-300">
            <span className="text-2xl text-red-500">!</span>
          </div>
        )}
        {(status === "pending" || status === "processing") && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-stone-900 animate-pulse" />
          </div>
        )}
      </div>

      <div className="text-center flex flex-col gap-2">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">
          Step 2 of 3
        </p>
        <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
          {status === "completed"
            ? "Your avatar is ready!"
            : status === "failed"
              ? "Something went wrong"
              : "Training your avatar..."}
        </h2>
        {(status === "pending" || status === "processing") && (
          <p className="text-sm text-stone-500">
            Usually takes 2&ndash;3 minutes
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {STEPS.map((step, index) => {
          const isComplete = index < activeStep
          const isActive = index === activeStep
          const isFailed = status === "failed"

          return (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-3 transition-opacity duration-300",
                isComplete || isActive ? "opacity-100" : "opacity-40"
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-all",
                  isComplete && "bg-stone-900",
                  isActive && !isFailed && "border-2 border-stone-900",
                  isActive && isFailed && "border-2 border-red-500",
                  !isComplete && !isActive && "border border-stone-200"
                )}
              >
                {isComplete && (
                  <Check className="h-3 w-3 text-white" />
                )}
                {isActive && !isFailed && (
                  <div className="h-1.5 w-1.5 rounded-full bg-stone-900 animate-pulse" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm",
                  isComplete && "text-stone-900 line-through",
                  isActive && !isFailed && "text-stone-900 font-medium",
                  isActive && isFailed && "text-red-600 font-medium",
                  !isComplete && !isActive && "text-stone-400"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { TrainingProgressProps, AvatarStatus }
