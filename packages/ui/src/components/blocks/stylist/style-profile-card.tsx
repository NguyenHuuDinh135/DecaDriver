"use client"

import { User, Palette, Ruler } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../card"
import { Badge } from "../../badge"
import { cn } from "../../../lib/utils"

interface StyleProfileData {
  body_type: string | null
  color_tone: string | null
  height_estimate: string | null
  recommended_styles: string[]
  avoid_styles: string[]
}

interface StyleProfileCardProps {
  profile: StyleProfileData
  className?: string
}

function ColorSwatch({ tone }: { tone: string }) {
  const swatchColor = (() => {
    const lower = tone.toLowerCase()
    if (lower.includes("warm")) return "bg-amber-400"
    if (lower.includes("cool")) return "bg-sky-400"
    if (lower.includes("neutral")) return "bg-stone-400"
    return "bg-zinc-400"
  })()

  return <span className={cn("inline-block size-3 rounded-full", swatchColor)} />
}

export function StyleProfileCard({ profile, className }: StyleProfileCardProps) {
  return (
    <Card className={cn("border-0 ring-0 shadow-none bg-transparent", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg font-semibold tracking-tight">
          Your Style Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {profile.body_type && (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 p-3">
              <User className="size-4 text-muted-foreground" />
              <span className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                Body
              </span>
              <span className="text-xs font-medium text-center">
                {profile.body_type}
              </span>
            </div>
          )}
          {profile.color_tone && (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 p-3">
              <Palette className="size-4 text-muted-foreground" />
              <span className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                Tone
              </span>
              <span className="text-xs font-medium flex items-center gap-1.5">
                <ColorSwatch tone={profile.color_tone} />
                {profile.color_tone}
              </span>
            </div>
          )}
          {profile.height_estimate && (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 p-3">
              <Ruler className="size-4 text-muted-foreground" />
              <span className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                Height
              </span>
              <span className="text-xs font-medium">
                {profile.height_estimate}
              </span>
            </div>
          )}
        </div>

        {profile.recommended_styles.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Recommended Styles</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.recommended_styles.map((style) => (
                <Badge key={style} variant="secondary" className="text-[0.65rem]">
                  {style}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {profile.avoid_styles.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Styles to Avoid</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.avoid_styles.map((style) => (
                <Badge
                  key={style}
                  variant="outline"
                  className="text-[0.65rem] text-muted-foreground line-through"
                >
                  {style}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { StyleProfileData, StyleProfileCardProps }
