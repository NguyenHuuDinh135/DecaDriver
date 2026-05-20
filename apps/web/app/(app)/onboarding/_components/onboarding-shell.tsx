import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

export function WebOnboardingShell({
  children,
  isDark = false,
  visual,
}: {
  children: ReactNode
  isDark?: boolean
  visual: ReactNode
}) {
  return (
    <section
      className={cn(
        "min-h-svh w-full overflow-hidden transition-colors duration-500 motion-reduce:transition-none",
        isDark ? "bg-stone-950 text-white" : "bg-stone-50 text-stone-950"
      )}
    >
      <div className="mx-auto grid min-h-svh w-full max-w-7xl grid-cols-1 gap-8 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center lg:gap-12 lg:px-8 lg:py-10">
        <div className="flex min-h-[calc(100svh-2.5rem)] flex-col lg:min-h-[680px]">
          {children}
        </div>
        <aside className="min-h-[360px] pb-8 lg:min-h-[680px] lg:pb-0">
          {visual}
        </aside>
      </div>
    </section>
  )
}

export function StepCopy({
  children,
  className,
  eyebrow,
  isDark = false,
  title,
}: {
  children: ReactNode
  className?: string
  eyebrow: string
  isDark?: boolean
  title: string
}) {
  return (
    <div className={cn("max-w-xl", className)}>
      <p
        className={cn(
          "text-xs font-medium tracking-[0.28em] uppercase",
          isDark ? "text-white/45" : "text-stone-400"
        )}
      >
        {eyebrow}
      </p>
      <h1
        className={cn(
          "mt-4 font-serif text-5xl leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl",
          isDark ? "text-white" : "text-stone-950"
        )}
      >
        {title}
      </h1>
      <div
        className={cn(
          "mt-5 text-base leading-7 sm:text-lg",
          isDark ? "text-white/65" : "text-stone-600"
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function StepFrame({
  actions,
  children,
  className,
}: {
  actions: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col justify-between gap-8 pt-8 lg:pt-14",
        className
      )}
    >
      <div>{children}</div>
      {actions}
    </div>
  )
}
