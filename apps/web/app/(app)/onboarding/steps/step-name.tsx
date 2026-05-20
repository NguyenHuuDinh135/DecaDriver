"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { api } from "@/lib/api/client"

const nameSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
})

type NameFormData = z.infer<typeof nameSchema>

interface StepNameProps {
  defaultName: string
  onNext: (name: string) => void
  onBack: () => void
}

export function StepName({ defaultName, onNext, onBack }: StepNameProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: defaultName },
  })

  const onSubmit = async (data: NameFormData) => {
    setIsSubmitting(true)
    setApiError(null)
    try {
      await api.patch("/users/me", { full_name: data.fullName })
      onNext(data.fullName)
    } catch {
      setApiError("Failed to save. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-stone-900">
          What&apos;s your name?
        </h1>
        <p className="text-sm text-stone-500">
          We&apos;ll use this to personalise your experience
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="fullName"
            className="text-xs font-medium uppercase tracking-wider text-stone-400"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            autoFocus
            placeholder="Your name"
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none transition-colors"
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="text-xs text-red-600">{errors.fullName.message}</p>
          )}
          {apiError && <p className="text-xs text-red-600">{apiError}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-medium text-white tracking-wide transition-all hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 tracking-wide transition-all hover:bg-stone-50 active:scale-[0.98]"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  )
}
