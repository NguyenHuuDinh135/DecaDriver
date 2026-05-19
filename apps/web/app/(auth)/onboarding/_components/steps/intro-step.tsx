import type { ReactNode } from "react"
import { StepCopy, StepFrame } from "../onboarding-shell"
import { ActionRow, NextIcon, PrimaryButton } from "../onboarding-actions"

export function IntroStep({
  actions,
}: {
  actions?: ReactNode
}) {
  return (
    <StepFrame
      actions={
        actions ?? (
          <ActionRow>
            <PrimaryButton className="sm:min-w-44">
              Continue
              <NextIcon />
            </PrimaryButton>
          </ActionRow>
        )
      }
    >
      <StepCopy
        eyebrow="Private image profile"
        title="Create your likeness"
      >
        Build a private image profile so DecaDriver can show better fits,
        proportions, and outfit previews.
      </StepCopy>
    </StepFrame>
  )
}
