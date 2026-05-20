"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useReducedMotion } from "motion/react"
import { Bell, Sparkles, Upload, Video } from "lucide-react"
import {
  useCreateFullOutfitDemo,
  useCreateFullOutfitVideo,
  useFullOutfitDemoStatus,
} from "@/lib/hooks/use-full-outfit-demo"
import { StepCopy, StepFrame, WebOnboardingShell } from "./_components/onboarding-shell"
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
  CameraMockPanel,
  CreatingVisual,
  IntroVisual,
  NotificationVisual,
  PrivacyVisual,
  ReviewProfileGrid,
  SelfieAngleGallery,
} from "./_components/mock-visuals"
import {
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
  | "outfit"
  | "result"
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
  "outfit",
  "result",
  "notifications",
  "creating",
]

const STEP_LABELS: Record<OnboardingStep, string> = {
  intro: "Create your likeness",
  privacy: "Privacy first",
  selfieIntro: "Take 6 selfies",
  selfieCapture: "Capture selfies",
  bodyPhotos: "Upload body photo",
  review: "Review image profile",
  outfit: "Upload outfit",
  result: "Full outfit result",
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
  const [bodyReferenceFile, setBodyReferenceFile] = useState<File | null>(null)
  const [topImage, setTopImage] = useState<File | null>(null)
  const [bottomImage, setBottomImage] = useState<File | null>(null)
  const [fullOutfitJobId, setFullOutfitJobId] = useState<string | null>(null)

  const bodyPreviewUrl = useMemo(() => bodyReferenceFile ? URL.createObjectURL(bodyReferenceFile) : null, [bodyReferenceFile])
  const topPreviewUrl = useMemo(() => topImage ? URL.createObjectURL(topImage) : null, [topImage])
  const bottomPreviewUrl = useMemo(() => bottomImage ? URL.createObjectURL(bottomImage) : null, [bottomImage])

  useEffect(() => {
    return () => {
      if (bodyPreviewUrl) URL.revokeObjectURL(bodyPreviewUrl)
    }
  }, [bodyPreviewUrl])

  useEffect(() => {
    return () => {
      if (topPreviewUrl) URL.revokeObjectURL(topPreviewUrl)
    }
  }, [topPreviewUrl])

  useEffect(() => {
    return () => {
      if (bottomPreviewUrl) URL.revokeObjectURL(bottomPreviewUrl)
    }
  }, [bottomPreviewUrl])

  const createFullOutfit = useCreateFullOutfitDemo()
  const createVideo = useCreateFullOutfitVideo()
  const fullOutfitStatus = useFullOutfitDemoStatus(fullOutfitJobId)

  const currentIndex = FLOW_STEPS.indexOf(currentStep)
  const isDark = currentStep === "selfieCapture"
  const canGoBack = currentIndex > 0
  const currentPrompt =
    SELFIE_ANGLES[Math.min(currentSelfieIndex, TOTAL_SELFIES - 1)] ??
    SELFIE_ANGLES[0]!
  const selfiesComplete = capturedSelfies.length === TOTAL_SELFIES
  const bodyPhotosComplete = Boolean(bodyReferenceFile)
  const reviewComplete = selfiesComplete && bodyPhotosComplete
  const outfitReady = Boolean(topImage && bottomImage)
  const fullOutfit = fullOutfitStatus.data

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

  const handleGenerateFullOutfit = async () => {
    if (!topImage || !bottomImage || !bodyReferenceFile) return
    const job = await createFullOutfit.mutateAsync({
      topImage,
      bottomImage,
      bodyReference: bodyReferenceFile,
    })
    setFullOutfitJobId(job.job_id)
    goToStep("result")
  }

  const handleGenerateVideo = async () => {
    if (!fullOutfitJobId) return
    await createVideo.mutateAsync(fullOutfitJobId)
    await fullOutfitStatus.refetch()
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
              <div className="space-y-4">
                <label className="block cursor-pointer rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600 transition hover:border-stone-500 hover:bg-stone-50">
                  <span className="font-medium text-stone-950">Your full-body photo</span>
                  <span className="mt-1 block text-xs">
                    Upload a clear head-to-toe photo of you. This is the photo the AI will dress, so the final result uses your body instead of a demo preset.
                  </span>
                  <input
                    accept="image/*"
                    className="sr-only"
                    name="body_reference"
                    onChange={(event) => setBodyReferenceFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                  {bodyPreviewUrl ? (
                    <img alt="Body photo preview" className="mt-3 max-h-48 rounded-xl object-contain" src={bodyPreviewUrl} />
                  ) : null}
                  <span className="mt-3 inline-flex rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold text-white">
                    {bodyReferenceFile ? "Change body photo" : "Choose body photo"}
                  </span>
                  <span className="mt-2 block text-xs font-medium text-stone-950">
                    {bodyReferenceFile?.name ?? "No body photo selected"}
                  </span>
                </label>
                <p className="rounded-xl bg-stone-100 p-3 text-xs text-stone-600">
                  Tip: use a front-facing, well-lit, full-body photo. If you want a different pose, upload another photo of yourself in that pose.
                </p>
                <ActionRow className="mt-0">
                  <PrimaryButton className="sm:min-w-44" disabled={!bodyPhotosComplete} onClick={() => goToStep("review")}>
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
                  onClick={() => goToStep("outfit")}
                >
                  Choose Outfit
                  <Sparkles className="size-4" strokeWidth={1.8} />
                </PrimaryButton>
              </ActionRow>
            }
          />
        )

      case "outfit":
        return (
          <StepFrame
            actions={
              <div className="space-y-3">
                {createFullOutfit.error ? (
                  <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {createFullOutfit.error.message}
                  </p>
                ) : null}
                <ActionRow className="mt-0">
                  <PrimaryButton
                    className="sm:min-w-52"
                    disabled={!outfitReady || createFullOutfit.isPending}
                    onClick={handleGenerateFullOutfit}
                  >
                    {createFullOutfit.isPending ? "Submitting..." : "Generate Full Outfit"}
                    <Sparkles className="size-4" strokeWidth={1.8} />
                  </PrimaryButton>
                </ActionRow>
              </div>
            }
          >
            <StepCopy eyebrow="Full outfit" title="Upload top and bottom">
              DecaDriver will call the real AI pipeline and return one completed image. Video is optional after the image is ready.
            </StepCopy>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="cursor-pointer rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600 transition hover:border-stone-500 hover:bg-stone-50">
                {topPreviewUrl ? (
                  <img alt="Top garment preview" className="mb-3 max-h-40 rounded-xl object-contain" src={topPreviewUrl} />
                ) : (
                  <Upload className="mb-3 size-5 text-stone-950" />
                )}
                <span className="font-medium text-stone-950">Top garment</span>
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setTopImage(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <span className="mt-3 inline-flex rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold text-white">
                  {topImage ? "Change top garment" : "Choose top garment"}
                </span>
                <span className="mt-2 block text-xs font-medium text-stone-950">{topImage?.name ?? "No top garment selected"}</span>
              </label>
              <label className="cursor-pointer rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600 transition hover:border-stone-500 hover:bg-stone-50">
                {bottomPreviewUrl ? (
                  <img alt="Bottom garment preview" className="mb-3 max-h-40 rounded-xl object-contain" src={bottomPreviewUrl} />
                ) : (
                  <Upload className="mb-3 size-5 text-stone-950" />
                )}
                <span className="font-medium text-stone-950">Bottom garment</span>
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setBottomImage(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <span className="mt-3 inline-flex rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold text-white">
                  {bottomImage ? "Change bottom garment" : "Choose bottom garment"}
                </span>
                <span className="mt-2 block text-xs font-medium text-stone-950">{bottomImage?.name ?? "No bottom garment selected"}</span>
              </label>
            </div>
          </StepFrame>
        )

      case "result":
        return (
          <StepFrame
            actions={
              <ActionRow className="mt-0">
                <PrimaryButton
                  className="sm:min-w-44"
                  disabled={fullOutfit?.status !== "completed" || createVideo.isPending || fullOutfit?.video_status === "processing"}
                  onClick={handleGenerateVideo}
                >
                  {fullOutfit?.video_status === "processing" || createVideo.isPending ? "Creating Video..." : "Create Video"}
                  <Video className="size-4" strokeWidth={1.8} />
                </PrimaryButton>
                <SecondaryButton className="sm:min-w-32" onClick={() => goToStep("outfit")}>
                  Edit outfit
                </SecondaryButton>
              </ActionRow>
            }
          >
            <StepCopy eyebrow="Result" title="One completed outfit image">
              The image is generated first. Click Create Video only if you want the optional MP4.
            </StepCopy>
            <div className="mt-6 space-y-3 text-sm text-stone-600">
              {fullOutfit?.status === "processing" ? (
                <p>AI is generating the full outfit{fullOutfit.stage ? ` (${fullOutfit.stage})` : ""}...</p>
              ) : null}
              {fullOutfit?.status === "failed" ? <p className="text-red-700">{fullOutfit.error ?? "Generation failed"}</p> : null}
              {fullOutfit?.video_status === "failed" ? <p className="text-red-700">{fullOutfit.video_error ?? "Video failed"}</p> : null}
              {fullOutfit?.video_url ? (
                <video className="w-full rounded-2xl border border-stone-200" controls src={fullOutfit.video_url} />
              ) : null}
            </div>
          </StepFrame>
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
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            {bodyPreviewUrl ? (
              <img alt="Body photo preview" className="max-h-[380px] rounded-2xl object-contain" src={bodyPreviewUrl} />
            ) : (
              <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">
                Body photo: <span className="font-semibold text-stone-950">Waiting for upload</span>
              </div>
            )}
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
      case "outfit":
        return (
          <div className="flex h-full min-h-[420px] flex-col justify-center rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-center rounded-2xl bg-stone-100 p-5">
                <p className="self-start text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Top</p>
                {topPreviewUrl ? (
                  <img alt="Top garment preview" className="mt-3 max-h-48 rounded-xl object-contain" src={topPreviewUrl} />
                ) : (
                  <p className="mt-3 text-sm font-medium text-stone-950">Waiting for upload</p>
                )}
              </div>
              <div className="flex flex-col items-center rounded-2xl bg-stone-100 p-5">
                <p className="self-start text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Bottom</p>
                {bottomPreviewUrl ? (
                  <img alt="Bottom garment preview" className="mt-3 max-h-48 rounded-xl object-contain" src={bottomPreviewUrl} />
                ) : (
                  <p className="mt-3 text-sm font-medium text-stone-950">Waiting for upload</p>
                )}
              </div>
            </div>
          </div>
        )
      case "result":
        return (
          <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            {fullOutfit?.result_url ? (
              <img alt="Generated full outfit" className="max-h-[560px] rounded-2xl object-contain" src={fullOutfit.result_url} />
            ) : (
              <div className="text-center text-sm text-stone-500">
                <Sparkles className="mx-auto mb-3 size-8 text-stone-950" />
                Generating real AI result...
              </div>
            )}
          </div>
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
