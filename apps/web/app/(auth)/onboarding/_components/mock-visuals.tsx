import type { CSSProperties } from "react"
import { Bell, Camera, Check, LockKeyhole, Sparkles, Upload, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  INTRO_CARDS,
  PRIVACY_POINTS,
  SELFIE_ANGLES,
  type CapturePrompt,
  type Guideline,
  type MockImage,
} from "../_data/likeness-mock-data"

export function MockPortrait({
  className,
  image,
  size = "md",
  style,
}: {
  className?: string
  image: MockImage
  size?: "sm" | "md" | "lg"
  style?: CSSProperties
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-gradient-to-br ring-1 ring-black/5",
        image.tone,
        size === "sm" && "size-14",
        size === "md" && "size-20",
        size === "lg" && "size-28",
        className
      )}
      aria-label={image.alt}
      role="img"
      style={style}
    >
      <div className="absolute inset-x-[26%] top-[18%] h-[24%] rounded-full bg-white/60 blur-[1px]" />
      <div className="absolute inset-x-[18%] bottom-[10%] h-[48%] rounded-t-full bg-black/20" />
      <div className="absolute inset-x-[35%] top-[36%] h-[5%] rounded-full bg-black/20" />
    </div>
  )
}

export function MockBodyPhoto({
  className,
  image,
}: {
  className?: string
  image: MockImage
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] min-h-0 items-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 ring-1 ring-black/5",
        image.tone,
        className
      )}
      aria-label={image.alt}
      role="img"
    >
      <div className="absolute top-[14%] left-1/2 size-12 -translate-x-1/2 rounded-full bg-white/65" />
      <div className="absolute top-[30%] left-1/2 h-[45%] w-[34%] -translate-x-1/2 rounded-t-full bg-black/20" />
      <div className="absolute bottom-[10%] left-[38%] h-[25%] w-[8%] rounded-full bg-black/25" />
      <div className="absolute right-[38%] bottom-[10%] h-[25%] w-[8%] rounded-full bg-black/25" />
      <span className="relative rounded-full bg-white/75 px-2.5 py-1 text-[0.7rem] font-medium text-stone-700 backdrop-blur">
        {image.label}
      </span>
    </div>
  )
}

export function GuidelineGrid({
  guidelines,
  isDark = false,
}: {
  guidelines: Guideline[]
  isDark?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {guidelines.map((guideline) => (
        <div
          key={guideline.title}
          className={cn(
            "flex gap-3 rounded-xl border p-4",
            isDark
              ? "border-white/10 bg-white/[0.06]"
              : "border-stone-200 bg-white/70"
          )}
        >
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              isDark ? "bg-white text-stone-950" : "bg-stone-950 text-white"
            )}
          >
            <guideline.icon className="size-4" />
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                isDark ? "text-white" : "text-stone-950"
              )}
            >
              {guideline.title}
            </p>
            <p
              className={cn(
                "mt-1 text-xs leading-5",
                isDark ? "text-white/55" : "text-stone-500"
              )}
            >
              {guideline.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function IntroVisual() {
  return (
    <div className="relative flex h-full min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(250,250,249,1),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(214,211,209,0.45),transparent_26%)]"
        aria-hidden="true"
      />
      <div className="relative h-[460px] w-full max-w-[540px]">
        {INTRO_CARDS.map((card, index) => {
          const baseTransforms = [
            "-translate-x-1/2 rotate-[-4deg]",
            "rotate-[7deg]",
            "rotate-[-10deg]",
          ]
          const floatYValues = ["-6px", "-8px", "-5px"]
          const floatDurations = ["4s", "4.6s", "3.8s"]

          return (
            <div
              key={card.id}
              className={cn(
                "absolute h-[330px] w-[240px] overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-2xl ring-1 shadow-stone-300/40 ring-black/5 motion-safe:animate-ob-float motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none",
                card.tone,
                index === 0 &&
                  "top-10 left-1/2 z-30 -translate-x-1/2 rotate-[-4deg]",
                index === 1 &&
                  "top-20 right-2 z-20 rotate-[7deg] opacity-85 md:right-8",
                index === 2 &&
                  "top-24 left-2 z-10 rotate-[-10deg] opacity-80 md:left-8"
              )}
              style={{
                "--ob-base-transform": baseTransforms[index],
                "--ob-float-y": floatYValues[index],
                "--ob-float-duration": floatDurations[index],
                animationDelay: `${index * 200}ms`,
              } as React.CSSProperties}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-xs font-medium tracking-[0.22em] text-white/65 uppercase">
                    Virtual try-on
                  </p>
                  <p className="mt-2 font-serif text-3xl leading-none text-white">
                    {card.title}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="h-32 w-20 rounded-t-full bg-white/35 backdrop-blur-sm" />
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur">
                    {card.subtitle}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div className="absolute right-6 bottom-4 left-6 z-40 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-xl backdrop-blur">
          <p className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">
            Image profile
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Fit", "Drape", "Scale"].map((item) => (
              <div key={item} className="rounded-xl bg-stone-100 px-3 py-2">
                <p className="text-sm font-medium text-stone-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PrivacyVisual({ selfies }: { selfies: MockImage[] }) {
  const visibleSelfies = selfies.length > 0 ? selfies.slice(0, 4) : []

  return (
    <div className="relative flex h-full min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="absolute inset-x-10 top-10 h-40 rounded-full bg-stone-100 blur-3xl" />
      <div className="relative w-full max-w-xl space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-stone-950 p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.24em] text-white/45 uppercase">
                Privacy first
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-none">
                Demo images stay local
              </h2>
            </div>
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-stone-950">
              <LockKeyhole className="size-7" strokeWidth={1.6} />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3" aria-hidden="true">
            {(visibleSelfies.length > 0 ? visibleSelfies : SELFIE_ANGLES).map(
              (item, index) => (
                <div
                  key={item.id}
                  className="relative aspect-square rounded-2xl bg-white/10"
                >
                  <div className="absolute inset-3 rounded-full bg-white/25" />
                  <div className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-white text-stone-950">
                    <LockKeyhole className="size-3.5" />
                  </div>
                  <span className="sr-only">Private item {index + 1}</span>
                </div>
              )
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PRIVACY_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-stone-200 bg-white/80 p-4 shadow-sm"
            >
              <point.icon className="size-5 text-stone-950" />
              <p className="mt-3 text-sm font-medium text-stone-950">
                {point.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SelfieAngleGallery({ selfies }: { selfies: MockImage[] }) {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SELFIE_ANGLES.map((angle, index) => (
            <div
              key={angle.id}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
            >
              <MockPortrait image={selfies[index] ?? selfies[0]!} size="sm" />
              <p className="mt-4 text-sm font-medium text-stone-950">
                {angle.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                {angle.helper}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CameraMockPanel({
  capturedSelfies,
  currentPrompt,
  isComplete,
  recentCaptureId,
}: {
  capturedSelfies: MockImage[]
  currentPrompt: CapturePrompt
  isComplete: boolean
  recentCaptureId: string | null
}) {
  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-white/10 bg-black p-4 shadow-2xl shadow-black/30 lg:p-6">
      <div className="flex items-center justify-between text-xs font-medium tracking-[0.18em] text-white/40 uppercase">
        <span>Web camera mock</span>
        <span aria-live="polite">{capturedSelfies.length} / 6</span>
      </div>

      <div className="relative mt-4 flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-white/10">
        <div className="absolute inset-6 rounded-2xl border border-dashed border-white/15" />
        <div className="absolute inset-x-1/2 top-[18%] h-[42%] w-[28%] -translate-x-1/2 rounded-full border border-white/20" />
        <div className="absolute top-[24%] left-1/2 size-32 -translate-x-1/2 rounded-full bg-gradient-to-br from-white/25 to-white/5 blur-[0.5px]" />
        <div className="absolute bottom-[14%] h-48 w-36 rounded-t-full bg-white/10" />
        <Camera className="absolute top-5 left-5 size-5 text-white/35" />

        {recentCaptureId ? (
          <div
            key={recentCaptureId}
            className="absolute inset-0 flex items-center justify-center bg-black/35 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in motion-reduce:animate-none"
            aria-live="polite"
          >
            <div className="flex size-20 items-center justify-center rounded-full bg-white text-black motion-safe:animate-in motion-safe:duration-300 motion-safe:zoom-in motion-reduce:animate-none">
              <Check className="size-10" strokeWidth={1.8} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium tracking-[0.2em] text-white/35 uppercase">
          {isComplete ? "Selfies complete" : `Current angle`}
        </p>
        <h2 className="mt-2 font-serif text-4xl leading-none text-white">
          {isComplete ? "All six angles captured" : currentPrompt.instruction}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/55">
          {isComplete
            ? "Review the thumbnail strip, then continue to full-body photos."
            : currentPrompt.helper}
        </p>
      </div>

      <div
        className="mt-5 grid grid-cols-6 gap-2"
        aria-label="Captured selfie thumbnails"
      >
        {SELFIE_ANGLES.map((angle, index) => {
          const image = capturedSelfies[index]

          return (
            <div
              key={angle.id}
              className={cn(
                "flex aspect-square items-center justify-center overflow-hidden rounded-xl border",
                image
                  ? "border-white/30 bg-white/15"
                  : "border-white/10 bg-white/[0.04]"
              )}
            >
              {image ? (
                <MockPortrait image={image} size="sm" className="scale-75" />
              ) : (
                <span className="text-xs text-white/25">{index + 1}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BodyPhotoSlotGrid({
  fullBodyPhotos,
  onFillSlot,
}: {
  fullBodyPhotos: Array<MockImage | null>
  onFillSlot: (slot: number) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fullBodyPhotos.map((image, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onFillSlot(index)}
          className="group min-h-[280px] cursor-pointer overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-stone-500 hover:bg-stone-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-stone-900/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          aria-label={
            image
              ? `Replace ${image.label}`
              : `Add full body photo ${index + 1}`
          }
        >
          {image ? (
            <MockBodyPhoto image={image} className="h-full rounded-none" />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors group-hover:bg-stone-950 group-hover:text-white motion-reduce:transition-none">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">
                  Full body slot {index + 1}
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  Click to use a local mock placeholder.
                </p>
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

export function ReviewProfileGrid({
  fullBodyPhotos,
  onRemoveBodyPhoto,
  onRemoveSelfie,
  onRetakeBodyPhoto,
  onRetakeSelfie,
  selfies,
}: {
  fullBodyPhotos: Array<MockImage | null>
  onRemoveBodyPhoto: (slot: number) => void
  onRemoveSelfie: (id: string) => void
  onRetakeBodyPhoto: (slot: number) => void
  onRetakeSelfie: (id: string) => void
  selfies: MockImage[]
}) {
  return (
    <div className="flex h-full min-h-[420px] flex-col justify-center rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <section aria-label="Selfie review">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-stone-950">Selfies</h2>
          <span className="text-xs text-stone-400">{selfies.length} / 6</span>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => {
            const image = selfies[index]

            return image ? (
              <div key={image.id} className="mx-auto flex flex-col items-center">
                <div className="relative">
                  <MockPortrait image={image} size="md" />
                  <button
                    type="button"
                    onClick={() => onRemoveSelfie(image.id)}
                    className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-stone-950 text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-stone-900/25 motion-reduce:transition-none"
                    aria-label={`Remove ${image.label} selfie`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRetakeSelfie(image.id)}
                  className="mt-2 rounded-full px-2 py-1 text-[0.7rem] font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950 motion-reduce:transition-none"
                  aria-label={`Retake ${image.label} selfie`}
                >
                  Retake
                </button>
              </div>
            ) : (
              <div
                key={index}
                className="mx-auto flex size-20 items-center justify-center rounded-full border border-dashed border-stone-200 bg-stone-50 text-xs text-stone-300"
              >
                Empty
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8" aria-label="Full body review">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-stone-950">
            Full-body photos
          </h2>
          <span className="text-xs text-stone-400">
            {fullBodyPhotos.filter(Boolean).length} / 2
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fullBodyPhotos.map((image, index) =>
            image ? (
              <div key={image.id} className="relative">
                <MockBodyPhoto image={image} />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onRetakeBodyPhoto(index)}
                    className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-stone-800 backdrop-blur transition-colors hover:bg-white motion-reduce:transition-none"
                    aria-label={`Retake ${image.label}`}
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBodyPhoto(index)}
                    className="flex size-8 items-center justify-center rounded-full bg-stone-950 text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-stone-900/25 motion-reduce:transition-none"
                    aria-label={`Remove ${image.label}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={index}
                className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-xs text-stone-300"
              >
                Empty
              </div>
            )
          )}
        </div>
      </section>
    </div>
  )
}

export function CreatingVisual({
  progress,
  selfies,
}: {
  progress: number
  selfies: MockImage[]
}) {
  const thumbnails = selfies.length > 0 ? selfies : []

  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="relative size-72" aria-hidden="true">
        <div className="absolute inset-8 rounded-full border border-stone-100" />
        {thumbnails.slice(0, 6).map((image, index) => {
          const angle = (index / 6) * Math.PI * 2
          const x = Math.cos(angle) * 98
          const y = Math.sin(angle) * 98

          return (
            <MockPortrait
              key={image.id}
              image={image}
              size="sm"
              className="absolute top-1/2 left-1/2 blur-[1px] motion-safe:animate-ob-orbit motion-reduce:animate-none"
              style={{
                "--ob-x": `${x}px`,
                "--ob-y": `${y}px`,
                "--ob-orbit-duration": `${10 + index * 2}s`,
                animationDelay: `${index * -1.5}s`,
              } as React.CSSProperties}
            />
          )
        })}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-28 items-center justify-center rounded-full bg-stone-950 text-white shadow-2xl shadow-stone-300">
            <Sparkles className="size-11 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      </div>
      <div className="mt-8 w-full max-w-md">
        <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
          <span>Local simulation</span>
          <span>{progress}%</span>
        </div>
        <div
          className="relative h-2 overflow-hidden rounded-full bg-stone-100"
          role="progressbar"
          aria-label="Creating likeness progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-stone-950 transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 animate-ob-shimmer motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}

export function NotificationVisual() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-stone-950 p-6 text-white shadow-2xl shadow-stone-300/40">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-white/45 uppercase">
              Optional update
            </p>
            <h2 className="mt-3 font-serif text-5xl leading-none">
              Ready when it is done
            </h2>
          </div>
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-stone-950">
            <Bell className="size-7" strokeWidth={1.6} />
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {["Likeness ready", "New outfits", "No spam"].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
            >
              <Check className="size-5 text-white" strokeWidth={1.8} />
              <p className="mt-3 text-sm font-medium text-white">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
