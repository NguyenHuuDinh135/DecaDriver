import type { ReactNode } from "react"
import { StepCopy, StepFrame } from "../onboarding-shell"
import { GuidelineGrid } from "../mock-visuals"
import { SELFIE_ANGLES, SELFIE_GUIDELINES } from "../../_data/likeness-mock-data"

export function SelfieIntroStep({
  actions,
}: {
  actions: ReactNode
}) {
  return (
    <StepFrame actions={actions}>
      <StepCopy eyebrow="Face reference" title="Take 6 selfies">
        We&apos;ll use six angles to understand your facial reference.
      </StepCopy>
      <div className="mt-8 max-w-xl space-y-5">
        <div className="flex flex-wrap gap-2">
          {SELFIE_ANGLES.map((angle) => (
            <span
              key={angle.id}
              className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700"
            >
              {angle.label}
            </span>
          ))}
        </div>
        <GuidelineGrid guidelines={SELFIE_GUIDELINES} />
      </div>
    </StepFrame>
  )
}
