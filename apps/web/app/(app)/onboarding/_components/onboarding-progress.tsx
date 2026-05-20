"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowLeft } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export function OnboardingProgress({
  canGoBack,
  currentIndex,
  isDark = false,
  onBack,
  onSkip,
  stepLabel,
  totalSteps,
}: {
  canGoBack: boolean
  currentIndex: number
  isDark?: boolean
  onBack: () => void
  onSkip?: () => void
  stepLabel: string
  totalSteps: number
}) {
  const prefersReduced = useReducedMotion()
  const progress = ((currentIndex + 1) / totalSteps) * 100

  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none",
            isDark
              ? "bg-white/10 text-white hover:bg-white/15"
              : "bg-white text-stone-800 shadow-sm ring-1 ring-stone-200 hover:bg-stone-100"
          )}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" strokeWidth={1.8} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepLabel}
              initial={prefersReduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "text-xs font-medium tracking-[0.22em] uppercase",
                isDark ? "text-white/45" : "text-stone-400"
              )}
            >
              Step {currentIndex + 1} of {totalSteps}
            </motion.p>
          </AnimatePresence>
        </div>

        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className={cn(
              "min-h-10 rounded-full px-3 text-sm font-medium transition-colors motion-reduce:transition-none",
              isDark
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-stone-500 hover:bg-white hover:text-stone-900"
            )}
          >
            Skip
          </button>
        ) : (
          <div className="w-[4.5rem]" aria-hidden="true" />
        )}
      </div>

      <div>
        <div
          className={cn(
            "h-1.5 overflow-hidden rounded-full",
            isDark ? "bg-white/15" : "bg-stone-200"
          )}
          role="progressbar"
          aria-label={`Onboarding progress: ${stepLabel}`}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentIndex + 1}
        >
          <motion.div
            className={cn(
              "h-full rounded-full",
              isDark ? "bg-white" : "bg-stone-950"
            )}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 30 }
            }
          />
        </div>
      </div>
    </header>
  )
}
