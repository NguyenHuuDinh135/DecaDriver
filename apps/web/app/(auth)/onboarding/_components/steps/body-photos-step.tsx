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
      <StepCopy eyebrow="Body reference" title="Add 2 full-length photos">
        These help DecaDriver understand proportions and garment drape.
      </StepCopy>
      <div className="mt-8 max-w-xl">
        <GuidelineGrid guidelines={BODY_PHOTO_GUIDELINES} />
      </div>
    </StepFrame>
  )
}
