"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { AvatarWizard } from "@/components/avatar/AvatarWizard"

export default function AvatarPage() {
  return (
    <div className="min-h-screen bg-secondary">
      {/* ─── Header with back button ─── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/30 bg-card/80 px-5 py-3 backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" asChild className="cursor-pointer">
          <Link href="/profile">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Create your likeness</h1>
          <p className="text-sm text-muted-foreground">
            Your personalized avatar for virtual try-on
          </p>
        </div>
      </header>

      {/* ─── Wizard — full width with controlled max-width ─── */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <AvatarWizard />
      </div>
    </div>
  )
}
