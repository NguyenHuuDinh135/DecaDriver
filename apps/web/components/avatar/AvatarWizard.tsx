"use client"

import { useState, useCallback } from "react"
import { StepperSidebar } from "./StepperSidebar"
import { UploadStep } from "./UploadStep"
import { TrainingStep } from "./TrainingStep"
import { CompleteStep } from "./CompleteStep"

const WIZARD_STEPS = [
  {
    title: "Upload selfies",
    description: "6 photos from different angles",
  },
  {
    title: "Training",
    description: "AI creates your likeness",
  },
  {
    title: "Complete",
    description: "Ready to try on clothes",
  },
]

/**
 * Main avatar wizard orchestrator.
 *
 * 2-column desktop layout:
 * - Left: vertical stepper sidebar
 * - Right: step content panel (switches based on current step)
 *
 * Manages:
 * - Image selection state
 * - Step transitions
 * - Error handling / retry
 */
export function AvatarWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [images, setImages] = useState<File[]>([])
  const [, setLoraKey] = useState<string | null>(null)

  // Step 1 → 2: Start training
  const handleStartTraining = useCallback(() => {
    setCurrentStep(1)
  }, [])

  // Step 2 → 3: Training complete
  const handleTrainingComplete = useCallback((key: string) => {
    setLoraKey(key)
    setCurrentStep(2)
  }, [])

  // Error handler (stays on step 2, TrainingStep handles display)
  const handleError = useCallback((_message: string) => {
    // TrainingStep manages its own error state internally
  }, [])

  // Retry: go back to step 0
  const handleRetry = useCallback(() => {
    setImages([])
    setCurrentStep(0)
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
      {/* ─── Stepper sidebar (left column) ─── */}
      <aside className="hidden lg:block pt-2">
        <StepperSidebar steps={WIZARD_STEPS} currentStep={currentStep} />
      </aside>

      {/* ─── Mobile step indicator ─── */}
      <div className="flex gap-2 lg:hidden">
        {WIZARD_STEPS.map((step, i) => (
          <div
            key={step.title}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* ─── Content panel (right column) ─── */}
      <main className="min-w-0">
        {currentStep === 0 && (
          <UploadStep
            images={images}
            onImagesChange={setImages}
            onSubmit={handleStartTraining}
          />
        )}

        {currentStep === 1 && (
          <TrainingStep
            images={images}
            onComplete={handleTrainingComplete}
            onError={handleError}
            onRetry={handleRetry}
          />
        )}

        {currentStep === 2 && <CompleteStep />}
      </main>
    </div>
  )
}
