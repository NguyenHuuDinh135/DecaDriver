import type { ReactNode } from "react"
import { StepCopy, StepFrame } from "../onboarding-shell"

export function ReviewStep({
  actions,
  isComplete,
}: {
  actions: ReactNode
  isComplete: boolean
}) {
  return (
    <StepFrame actions={actions}>
      <StepCopy eyebrow="Final check" title="Review your image profile">
        Review the six selfie angles and two full-body references before
        creating the local mock likeness.
      </StepCopy>
      {!isComplete ? (
        <p className="mt-4 text-sm text-stone-500">
          Add 6 selfies and 2 full-body photos to create your likeness.
        </p>
      ) : null}
    </StepFrame>
  )
}
