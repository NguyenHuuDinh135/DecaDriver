"use client"

import { cn } from "@workspace/ui/lib/utils"

type Preference = "menswear" | "womenswear"

interface StepPreferenceProps {
  selected: Preference | null
  onSelect: (preference: Preference) => void
  onNext: () => void
  onBack: () => void
}

const OPTIONS: { value: Preference; label: string; description: string }[] = [
  {
    value: "menswear",
    label: "Menswear",
    description: "Tailored, streetwear, athletic & more",
  },
  {
    value: "womenswear",
    label: "Womenswear",
    description: "Dresses, tailored, casual & more",
  },
]

export function StepPreference({
  selected,
  onSelect,
  onNext,
  onBack,
}: StepPreferenceProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-stone-900">
          What do you wear?
        </h1>
        <p className="text-sm text-stone-500">
          This helps us show you the right garments
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border-2 p-5 text-left transition-all active:scale-[0.98]",
              selected === option.value
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white text-stone-900 hover:border-stone-400"
            )}
          >
            <span className="text-base font-medium">{option.label}</span>
            <span
              className={cn(
                "text-xs",
                selected === option.value
                  ? "text-stone-300"
                  : "text-stone-500"
              )}
            >
              {option.description}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNext}
          disabled={!selected}
          className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-medium text-white tracking-wide transition-all hover:bg-stone-800 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 tracking-wide transition-all hover:bg-stone-50 active:scale-[0.98]"
        >
          Back
        </button>
      </div>
    </div>
  )
}

export type { Preference }
