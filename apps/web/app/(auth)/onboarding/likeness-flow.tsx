"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useReducedMotion } from "motion/react"
import { Bell, Sparkles } from "lucide-react"
import { WebOnboardingShell } from "./_components/onboarding-shell"
import { OnboardingProgress } from "./_components/onboarding-progress"
import {
  ActionRow,
  NextIcon,
  PrimaryButton,
  SecondaryButton,
} from "./_components/onboarding-actions"
import {
  StepTransition,
  VisualTransition,
} from "./_components/step-transition"
import { IntroStep } from "./_components/steps/intro-step"
import { PrivacyStep } from "./_components/steps/privacy-step"
import { SelfieIntroStep } from "./_components/steps/selfie-intro-step"
import { SelfieCaptureStep } from "./_components/steps/selfie-capture-step"
import { BodyPhotosStep } from "./_components/steps/body-photos-step"
import { ReviewStep } from "./_components/steps/review-step"
import { NotificationsStep } from "./_components/steps/notifications-step"
import { CreatingStep } from "./_components/steps/creating-step"
import {
  BodyPhotoSlotGrid,
  CameraMockPanel,
  CreatingVisual,
  IntroVisual,
  NotificationVisual,
  PrivacyVisual,
  ReviewProfileGrid,
  SelfieAngleGallery,
} from "./_components/mock-visuals"
import {
  MOCK_BODY_PHOTOS,
  MOCK_SELFIES,
  SELFIE_ANGLES,
  type MockImage,
} from "./_data/likeness-mock-data"

type OnboardingStep =
  | "intro"
  | "privacy"
  | "selfieIntro"
  | "selfieCapture"
  | "bodyPhotos"
  | "review"
  | "notifications"
  | "creating"

type NavigationDirection = "forward" | "back"

const FLOW_STEPS: OnboardingStep[] = [
  "intro",
  "privacy",
  "selfieIntro",
  "selfieCapture",
  "bodyPhotos",
  "review",
  "notifications",
  "creating",
]

const STEP_LABELS: Record<OnboardingStep, string> = {
  intro: "Create your likeness",
  privacy: "Privacy first",
  selfieIntro: "Take 6 selfies",
  selfieCapture: "Capture selfies",
  bodyPhotos: "Add full-body photos",
  review: "Review image profile",
  notifications: "Notifications",
  creating: "Creating likeness",
}

const TOTAL_SELFIES = SELFIE_ANGLES.length

type BodyPhotoState = [MockImage | null, MockImage | null]

function emptyBodyPhotos(): BodyPhotoState {
  return [null, null]
}

export function LikenessOnboardingFlow() {
  const router = useRouter()
  const prefersReduced = useReducedMotion()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("intro")
  const [navigationDirection, setNavigationDirection] =
    useState<NavigationDirection>("forward")
  const [capturedSelfies, setCapturedSelfies] = useState<MockImage[]>([])
  const [currentSelfieIndex, setCurrentSelfieIndex] = useState(0)
  const [fullBodyPhotos, setFullBodyPhotos] =
    useState<BodyPhotoState>(emptyBodyPhotos)
  const [recentCaptureId, setRecentCaptureId] = useState<string | null>(null)
  const [mockProgress, setMockProgress] = useState(0)

  const currentIndex = FLOW_STEPS.indexOf(currentStep)
  const isDark = currentStep === "selfieCapture"
  const canGoBack = currentIndex > 0
  const currentPrompt =
    SELFIE_ANGLES[Math.min(currentSelfieIndex, TOTAL_SELFIES - 1)] ??
    SELFIE_ANGLES[0]!
  const selfiesComplete = capturedSelfies.length === TOTAL_SELFIES
  const bodyPhotosComplete = fullBodyPhotos.every(Boolean)
  const reviewComplete = selfiesComplete && bodyPhotosComplete

  const goToStep = (step: OnboardingStep) => {
    const nextIndex = FLOW_STEPS.indexOf(step)
    setNavigationDirection(nextIndex > currentIndex ? "forward" : "back")

    if (step === "creating") {
      setMockProgress(prefersReduced ? 100 : 12)
    }

    setCurrentStep(step)
  }

  const goNext = () => {
    setNavigationDirection("forward")
    setCurrentStep((step) => {
      const nextIndex = Math.min(
        FLOW_STEPS.indexOf(step) + 1,
        FLOW_STEPS.length - 1
      )

      return FLOW_STEPS[nextIndex] ?? step
    })
  }

  const goBack = () => {
    setNavigationDirection("back")
    setCurrentStep((step) => {
      const nextIndex = Math.max(FLOW_STEPS.indexOf(step) - 1, 0)

      return FLOW_STEPS[nextIndex] ?? step
    })
  }

  const handleCapture = () => {
    if (selfiesComplete) {
      goToStep("bodyPhotos")
      return
    }

    const nextIndex = capturedSelfies.length
    const nextImage = MOCK_SELFIES[nextIndex]

    if (!nextImage) return

    setCapturedSelfies((current) => [...current, nextImage])
    setCurrentSelfieIndex(Math.min(nextIndex + 1, TOTAL_SELFIES - 1))
    setRecentCaptureId(nextImage.id)
  }

  const handleRetakeLastSelfie = () => {
    if (capturedSelfies.length === 0) return

    const nextLength = capturedSelfies.length - 1
    setCapturedSelfies((current) => current.slice(0, -1))
    setCurrentSelfieIndex(Math.max(nextLength, 0))
  }

  const handleFillBodyPhoto = (slot: number) => {
    const nextImage = MOCK_BODY_PHOTOS[slot]
    if (!nextImage) return

    setFullBodyPhotos((current) => {
      const next = [...current] as BodyPhotoState
      next[slot] = nextImage
      return next
    })
  }

  const handleRemoveSelfie = (id: string) => {
    const next = capturedSelfies.filter((image) => image.id !== id)
    setCapturedSelfies(next)
    setCurrentSelfieIndex(Math.min(next.length, TOTAL_SELFIES - 1))
  }

  const handleRetakeSelfie = (id: string) => {
    handleRemoveSelfie(id)
    goToStep("selfieCapture")
  }

  const handleRemoveBodyPhoto = (slot: number) => {
    setFullBodyPhotos((current) => {
      const next = [...current] as BodyPhotoState
      next[slot] = null
      return next
    })
  }

  const handleRetakeBodyPhoto = (slot: number) => {
    handleRemoveBodyPhoto(slot)
    goToStep("bodyPhotos")
  }

  useEffect(() => {
    if (!recentCaptureId) return

    const timeout = window.setTimeout(() => {
      setRecentCaptureId(null)
    }, 650)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [recentCaptureId])

  useEffect(() => {
    if (currentStep !== "creating" || prefersReduced) return

    const interval = window.setInterval(() => {
      setMockProgress((current) => Math.min(current + 11, 100))
    }, 450)

    return () => {
      window.clearInterval(interval)
    }
  }, [currentStep, prefersReduced])

  const renderContent = () => {
    switch (currentStep) {
      case "intro":
        return (
          <IntroStep
            actions={
              <ActionRow>
                <PrimaryButton className="sm:min-w-44" onClick={goNext}>
                  Continue
                  <NextIcon />
                </PrimaryButton>
              </ActionRow>
            }
          />
        )

      case "privacy":
        return (
          <PrivacyStep
            actions={
              <ActionRow>
                <PrimaryButton className="sm:min-w-44" onClick={goNext}>
                  Continue
                  <NextIcon />
                </PrimaryButton>
              </ActionRow>
            }
          />
        )

      case "selfieIntro":
        return (
          <SelfieIntroStep
            actions={
              <ActionRow>
                <PrimaryButton
                  className="sm:min-w-44"
                  onClick={() => goToStep("selfieCapture")}
                >
                  Start Selfies
                  <NextIcon />
                </PrimaryButton>
              </ActionRow>
            }
          />
        )

      case "selfieCapture":
        return (
          <SelfieCaptureStep
            capturedCount={capturedSelfies.length}
            currentPrompt={currentPrompt}
            isComplete={selfiesComplete}
            onCapture={handleCapture}
            onRetake={handleRetakeLastSelfie}
            totalSelfies={TOTAL_SELFIES}
          />
        )

      case "bodyPhotos":
        return (
          <BodyPhotosStep
            actions={
              <div>
                {!bodyPhotosComplete ? (
                  <p className="mb-3 text-sm text-stone-500">
                    Add both full-length photos to continue.
                  </p>
                ) : null}
                <ActionRow className="mt-0">
                  <PrimaryButton
                    className="sm:min-w-44"
                    disabled={!bodyPhotosComplete}
                    onClick={() => goToStep("review")}
                  >
                    Continue
                    <NextIcon />
                  </PrimaryButton>
                </ActionRow>
              </div>
            }
          />
        )

      case "review":
        return (
          <ReviewStep
            isComplete={reviewComplete}
            actions={
              <ActionRow className="mt-0">
                <PrimaryButton
                  className="sm:min-w-48"
                  disabled={!reviewComplete}
                  onClick={() => goToStep("notifications")}
                >
                  Create Likeness
                  <Sparkles className="size-4" strokeWidth={1.8} />
                </PrimaryButton>
              </ActionRow>
            }
          />
        )

      case "notifications":
        return (
          <NotificationsStep
            actions={
              <ActionRow>
                <PrimaryButton
                  className="sm:min-w-56"
                  onClick={() => goToStep("creating")}
                >
                  Enable Notifications
                  <Bell className="size-4" strokeWidth={1.8} />
                </PrimaryButton>
                <SecondaryButton
                  className="sm:min-w-32"
                  onClick={() => goToStep("creating")}
                >
                  Skip
                </SecondaryButton>
              </ActionRow>
            }
          />
        )

      case "creating":
        return (
          <CreatingStep
            mockProgress={mockProgress}
            actions={
              <ActionRow>
                <PrimaryButton
                  className="sm:min-w-44"
                  onClick={() => router.push("/onboarding/brands")}
                >
                  Select Brands
                  <NextIcon />
                </PrimaryButton>
              </ActionRow>
            }
          />
        )
    }
  }

  const renderVisual = () => {
    switch (currentStep) {
      case "intro":
        return <IntroVisual />
      case "privacy":
        return <PrivacyVisual selfies={capturedSelfies} />
      case "selfieIntro":
        return <SelfieAngleGallery selfies={MOCK_SELFIES} />
      case "selfieCapture":
        return (
          <CameraMockPanel
            capturedSelfies={capturedSelfies}
            currentPrompt={currentPrompt}
            isComplete={selfiesComplete}
            recentCaptureId={recentCaptureId}
          />
        )
      case "bodyPhotos":
        return (
          <div className="flex h-full min-h-[420px] flex-col justify-center rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <BodyPhotoSlotGrid
              fullBodyPhotos={fullBodyPhotos}
              onFillSlot={handleFillBodyPhoto}
            />
          </div>
        )
      case "review":
        return (
          <ReviewProfileGrid
            fullBodyPhotos={fullBodyPhotos}
            onRemoveBodyPhoto={handleRemoveBodyPhoto}
            onRemoveSelfie={handleRemoveSelfie}
            onRetakeBodyPhoto={handleRetakeBodyPhoto}
            onRetakeSelfie={handleRetakeSelfie}
            selfies={capturedSelfies}
          />
        )
      case "notifications":
        return <NotificationVisual />
      case "creating":
        return (
          <CreatingVisual progress={mockProgress} selfies={capturedSelfies} />
        )
    }
  }

  return (
    <WebOnboardingShell
      isDark={isDark}
      visual={
        <VisualTransition direction={navigationDirection} stepKey={currentStep}>
          {renderVisual()}
        </VisualTransition>
      }
    >
      <OnboardingProgress
        canGoBack={canGoBack}
        currentIndex={currentIndex}
        isDark={isDark}
        onBack={goBack}
        stepLabel={STEP_LABELS[currentStep]}
        totalSteps={FLOW_STEPS.length}
      />
      <StepTransition direction={navigationDirection} stepKey={currentStep}>
        {renderContent()}
      </StepTransition>
    </WebOnboardingShell>
  )
}
