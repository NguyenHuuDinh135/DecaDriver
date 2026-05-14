"use client"

import { useState } from "react"
import { api } from "@/lib/api/client"
import { StepWelcome } from "./steps/step-welcome"
import { StepName } from "./steps/step-name"
import { StepPreference, type Preference } from "./steps/step-preference"
import { StepAvatar } from "./steps/step-avatar"
import { StepComplete } from "./steps/step-complete"

const TOTAL_STEPS = 5

interface FormData {
  fullName: string
  preference: Preference | null
  avatarStarted: boolean
}

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i <= current ? "w-6 bg-stone-900" : "w-1.5 bg-stone-200"
          }`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    preference: null,
    avatarStarted: false,
  })

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0))

  const handleNameComplete = (name: string) => {
    setFormData((prev) => ({ ...prev, fullName: name }))
    goNext()

    // Persist name to backend (fire-and-forget)
    api.patch("/users/me", { full_name: name }).catch(() => {
      // Non-blocking: don't prevent step progression on failure
    })
  }

  const handlePreferenceSelect = (pref: Preference) => {
    setFormData((prev) => ({ ...prev, preference: pref }))
    // TODO: Persist style preference to backend once a field/endpoint exists.
    // Currently no `style_preference` field on UserUpdateMe or dedicated endpoint.
  }

  const handleAvatarComplete = (started: boolean) => {
    setFormData((prev) => ({ ...prev, avatarStarted: started }))
    goNext()
  }

  return (
    <div className="flex flex-col">
      <ProgressIndicator current={currentStep} total={TOTAL_STEPS} />

      <div className="transition-opacity duration-200">
        {currentStep === 0 && <StepWelcome onNext={goNext} />}

        {currentStep === 1 && (
          <StepName
            defaultName={formData.fullName}
            onNext={handleNameComplete}
            onBack={goBack}
          />
        )}

        {currentStep === 2 && (
          <StepPreference
            selected={formData.preference}
            onSelect={handlePreferenceSelect}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 3 && (
          <StepAvatar onNext={handleAvatarComplete} onBack={goBack} />
        )}

        {currentStep === 4 && (
          <StepComplete
            fullName={formData.fullName}
            avatarStarted={formData.avatarStarted}
          />
        )}
      </div>
    </div>
  )
}
