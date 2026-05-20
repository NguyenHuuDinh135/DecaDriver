import type { ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import { StepCopy, StepFrame } from "../onboarding-shell"
import {
  ActionRow,
  NextIcon,
  PrimaryButton,
  SecondaryButton,
} from "../onboarding-actions"
import type { CapturePrompt } from "../../_data/likeness-mock-data"

export function SelfieCaptureStep({
  capturedCount,
  currentPrompt,
  isComplete,
  onCapture,
  onRetake,
  totalSelfies,
}: {
  capturedCount: number
  currentPrompt: CapturePrompt
  isComplete: boolean
  onCapture: () => void
  onRetake: () => void
  totalSelfies: number
}) {
  return (
    <StepFrame
      actions={
        <ActionRow>
          <SecondaryButton
            className="border-white/15 bg-white/10 text-white hover:bg-white/15 sm:min-w-36"
            disabled={capturedCount === 0}
            onClick={onRetake}
          >
            <RotateCcw className="size-4" strokeWidth={1.8} />
            Retake
          </SecondaryButton>
          <PrimaryButton
            className="bg-white text-stone-950 hover:bg-white/90 sm:min-w-44"
            onClick={onCapture}
          >
            {isComplete ? "Continue" : "Capture"}
            {isComplete ? <NextIcon /> : null}
          </PrimaryButton>
        </ActionRow>
      }
      className="text-white"
    >
      <StepCopy
        eyebrow={`Selfie ${Math.min(
          capturedCount + 1,
          totalSelfies
        )} of ${totalSelfies}`}
        isDark
        title={isComplete ? "Selfies complete" : "Capture selfies"}
      >
        <span aria-live="polite">
          {isComplete
            ? "All six angles are ready. Continue when you are happy with the strip."
            : `${currentPrompt.instruction}. ${currentPrompt.helper}`}
        </span>
      </StepCopy>
    </StepFrame>
  )
}
