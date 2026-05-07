"use client"

import { Sparkles, Camera, Wand2 } from "lucide-react"

interface StepWelcomeProps {
  onNext: () => void
}

const FEATURES = [
  {
    icon: Camera,
    title: "AI Avatar",
    description: "Create a photorealistic digital twin",
  },
  {
    icon: Sparkles,
    title: "Virtual Try-On",
    description: "See how any garment looks on you",
  },
  {
    icon: Wand2,
    title: "Style Picks",
    description: "Personalised recommendations",
  },
] as const

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-stone-900">
          Welcome to DecaDriver
        </h1>
        <p className="text-sm text-stone-500">
          Your AI-powered virtual try-on experience
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex items-center gap-4 rounded-xl border border-stone-100 p-4"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100">
              <feature.icon className="h-5 w-5 text-stone-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-900">
                {feature.title}
              </p>
              <p className="text-xs text-stone-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-medium text-white tracking-wide transition-all hover:bg-stone-800 active:scale-[0.98]"
      >
        Get Started
      </button>
    </div>
  )
}
