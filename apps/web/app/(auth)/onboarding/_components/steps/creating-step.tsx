import type { ReactNode } from "react"
import { StepCopy, StepFrame } from "../onboarding-shell"

export function CreatingStep({
  actions,
  mockProgress,
}: {
  actions: ReactNode
  mockProgress: number
}) {
  return (
    <StepFrame actions={actions}>
      <StepCopy eyebrow="Local simulation" title="Creating your likeness">
        This is a local UI simulation. In production this may take about
        30 minutes.
      </StepCopy>
      <p className="mt-6 text-sm text-stone-500" aria-live="polite">
        Mock progress is {mockProgress}% complete.
      </p>
    </StepFrame>
  )
}
