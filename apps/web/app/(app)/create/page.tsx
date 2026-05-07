"use client"

import Link from "next/link"
import { Sparkles, Link2, PenSquare } from "lucide-react"

const CREATE_OPTIONS = [
  {
    title: "Create a Look",
    description: "Try on garments with your AI avatar",
    href: "/try-on",
    icon: Sparkles,
  },
  {
    title: "Add a Link",
    description: "Import garments from web URLs",
    href: "/create/link",
    icon: Link2,
  },
  {
    title: "Create a Post",
    description: "Share your style with the community",
    href: "/create/post",
    icon: PenSquare,
  },
] as const

export default function CreatePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="font-serif text-2xl font-semibold">Create</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What would you like to do?
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {CREATE_OPTIONS.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="group flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-background">
                <option.icon className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">{option.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
