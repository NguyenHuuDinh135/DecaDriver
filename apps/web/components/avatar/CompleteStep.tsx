"use client"

import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Check, Sparkles } from "lucide-react"

interface CompleteStepProps {
  className?: string
}

/**
 * Step 3: Training complete — success state.
 * Shows animated checkmark, success message, and CTAs.
 */
export function CompleteStep({ className }: CompleteStepProps) {
  return (
    <div className={`flex flex-col items-center gap-6 py-12 ${className || ""}`}>
      {/* Animated check icon */}
      <div className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground animate-in zoom-in-50 duration-500">
        <Check className="size-10" strokeWidth={3} />
      </div>

      {/* Success text */}
      <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-backwards">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="size-6 text-primary" />
          <h3 className="text-3xl font-bold tracking-tight">
            Your likeness is ready!
          </h3>
        </div>
        <p className="mt-2 text-base text-muted-foreground">
          You can now explore new looks and see how clothes look on you.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500 fill-mode-backwards">
        <Button asChild size="lg">
          <Link href="/try-on">Go to Try-On</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/profile">Back to Profile</Link>
        </Button>
      </div>
    </div>
  )
}
