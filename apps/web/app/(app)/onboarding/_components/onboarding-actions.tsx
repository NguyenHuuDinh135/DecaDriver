import type { ComponentProps, ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export function PrimaryButton({
  children,
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 py-3 text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-stone-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white/70 px-5 py-3 text-sm font-medium tracking-wide text-stone-700 transition-all duration-200 hover:border-stone-300 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function ActionRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mt-8 flex flex-col gap-3 sm:flex-row sm:items-center",
        className
      )}
    >
      {children}
    </div>
  )
}

export function NextIcon() {
  return <ArrowRight className="size-4" strokeWidth={1.8} />
}
