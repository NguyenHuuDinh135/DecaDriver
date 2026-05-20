import type { ReactNode } from "react"
import { StepCopy, StepFrame } from "../onboarding-shell"
import { GuidelineGrid } from "../mock-visuals"
import { BODY_PHOTO_GUIDELINES } from "../../_data/likeness-mock-data"

export function BodyPhotosStep({
  actions,
}: {
  actions: ReactNode
}) {
  return (
    <StepFrame actions={actions}>
      <StepCopy eyebrow="Body photo" title="Upload your full-body photo">
        This is the photo the AI will dress. Use a clear head-to-toe photo so the final try-on result is based on your body.
      </StepCopy>
      <div className="mt-8 max-w-xl">
        <GuidelineGrid guidelines={BODY_PHOTO_GUIDELINES} />
      </div>
    </StepFrame>
  )
}
