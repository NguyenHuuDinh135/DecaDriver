"use client"

import { cn } from "@workspace/ui/lib/utils"
import { Check } from "lucide-react"

interface Step {
  title: string
  description: string
}

interface StepperSidebarProps {
  steps: Step[]
  currentStep: number
  className?: string
}

/**
 * Vertical step indicator for the avatar wizard.
 * Shows completed (check), active (filled), and pending (empty) states
 * with connecting lines between steps.
 */
export function StepperSidebar({
  steps,
  currentStep,
  className,
}: StepperSidebarProps) {
  return (
    <nav className={cn("flex flex-col gap-0", className)} aria-label="Progress">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isActive = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step.title} className="flex gap-4">
            {/* Circle + connecting line column */}
            <div className="flex flex-col items-center">
              {/* Step circle */}
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isActive &&
                    "border-primary bg-primary/10 text-primary",
                  !isCompleted && !isActive &&
                    "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <Check className="size-5" strokeWidth={3} />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-10 transition-colors duration-300",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>

            {/* Text column */}
            <div className={cn("pb-10", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-base font-semibold leading-10 transition-colors",
                  isActive && "text-foreground",
                  isCompleted && "text-foreground",
                  !isCompleted && !isActive && "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
