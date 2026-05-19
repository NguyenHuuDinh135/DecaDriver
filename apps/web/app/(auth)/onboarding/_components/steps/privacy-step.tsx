import type { ReactNode } from "react"
import { StepCopy, StepFrame } from "../onboarding-shell"

export function PrivacyStep({
  actions,
}: {
  actions: ReactNode
}) {
  return (
    <StepFrame actions={actions}>
      <StepCopy eyebrow="Private by design" title="Privacy first">
        Your images are only used to create your likeness mock profile in
        this demo. They are not uploaded or shared.
      </StepCopy>
      <div className="mt-8 max-w-xl">
        <div className="grid gap-3 sm:grid-cols-3">
          {["Local state only", "No upload", "No sharing"].map(
            (point) => (
              <div
                key={point}
                className="rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm font-medium text-stone-700"
              >
                {point}
              </div>
            )
          )}
        </div>
      </div>
    </StepFrame>
  )
}
