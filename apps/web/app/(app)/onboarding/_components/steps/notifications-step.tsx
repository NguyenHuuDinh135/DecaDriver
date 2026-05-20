import type { ReactNode } from "react"
import { StepCopy, StepFrame } from "../onboarding-shell"

export function NotificationsStep({
  actions,
}: {
  actions: ReactNode
}) {
  return (
    <StepFrame actions={actions}>
      <StepCopy eyebrow="Optional" title="One more thing">
        Get notified when your likeness and recommendations are ready.
        This mock step does not ask the browser for permission.
      </StepCopy>
    </StepFrame>
  )
}
