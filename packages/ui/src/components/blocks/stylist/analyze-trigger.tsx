"use client"

import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "../../button"
import { StyleProfileCard, type StyleProfileData } from "./style-profile-card"
import { cn } from "../../../lib/utils"

interface AnalyzeTriggerProps {
  onAnalyze: () => void
  isAnalyzing: boolean
  result?: StyleProfileData | null
  className?: string
}

export function AnalyzeTrigger({
  onAnalyze,
  isAnalyzing,
  result,
  className,
}: AnalyzeTriggerProps) {
  if (result) {
    return <StyleProfileCard profile={result} className={className} />
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-dashed border-border/50 p-6",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <Sparkles className="size-6 text-muted-foreground" />
        <h3 className="font-serif text-base font-semibold">
          Discover Your Style
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs">
          Our AI analyzes your body type, color tone, and proportions to
          recommend styles that suit you best.
        </p>
      </div>
      <Button onClick={onAnalyze} disabled={isAnalyzing} size="lg">
        {isAnalyzing ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            Analyze My Style
          </>
        )}
      </Button>
    </div>
  )
}

export type { AnalyzeTriggerProps }
