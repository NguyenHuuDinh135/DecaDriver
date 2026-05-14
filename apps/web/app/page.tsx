"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Sparkles, Upload, ImageIcon, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const FEATURES = [
  {
    title: "Virtual Try-On",
    description:
      "See yourself in any garment instantly. Our AI generates photorealistic results in seconds.",
  },
  {
    title: "AI Stylist",
    description:
      "Get personalized outfit recommendations based on your body type, preferences, and trends.",
  },
  {
    title: "Smart Wardrobe",
    description:
      "Organize your closet digitally. Mix, match, and plan outfits with intelligent suggestions.",
  },
] as const

function DropZone({
  label,
  sublabel,
  file,
  onFile,
  icon: Icon,
}: {
  label: string
  sublabel: string
  file: File | null
  onFile: (f: File) => void
  icon: typeof Upload
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFile = useCallback(
    (f: File) => {
      if (f.type.startsWith("image/")) onFile(f)
    },
    [onFile],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
      }}
      onClick={() => inputRef.current?.click()}
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 aspect-[3/4] ${
        isDragging
          ? "border-foreground/40 bg-accent"
          : preview
            ? "border-transparent"
            : "border-border hover:border-foreground/30 hover:bg-accent/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="absolute inset-0 h-full w-full rounded-lg object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
            <p className="text-sm font-medium text-foreground">Change image</p>
          </div>
          <div className="absolute right-2 top-2">
            <CheckCircle2 className="size-5 text-foreground" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="rounded-full border border-border p-3 transition-colors group-hover:bg-accent">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const demoRef = useRef<HTMLDivElement>(null)
  const [personFile, setPersonFile] = useState<File | null>(null)
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!personFile || !garmentFile) return

    setIsLoading(true)
    setError(null)
    setResultUrl(null)

    try {
      const form = new FormData()
      form.append("person_image", personFile)
      form.append("garment_image", garmentFile)

      const res = await fetch(`${API_URL}/demo/tryon`, {
        method: "POST",
        body: form,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Error ${res.status}`)
      }

      const { job_id } = await res.json()

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const poll = await fetch(`${API_URL}/demo/tryon/${job_id}`)
        const data = await poll.json()

        if (data.status === "completed" && data.result_url) {
          setResultUrl(data.result_url)
          return
        }
        if (data.status === "failed") {
          throw new Error("Processing failed. Please try again.")
        }
      }
      throw new Error("Request timed out. Please try again.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="font-serif text-xl font-semibold tracking-tight">
            DecaDriver
          </span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            AI-Powered Fashion
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">
            Try on anything,
            <br />
            before you buy
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Upload your photo and any garment. Our AI generates a photorealistic
            image of you wearing it — in seconds, for free.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={() =>
                demoRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Sparkles className="mr-2 size-4" />
              Try It Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8"
              asChild
            >
              <Link href="/feed">Explore Feed</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Fashion meets intelligence
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three tools that transform how you shop and dress.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {FEATURES.map(({ title, description }) => (
              <div key={title} className="space-y-3">
                <h3 className="font-serif text-lg font-medium">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section
        ref={demoRef}
        className="border-t border-border/50 px-4 py-24"
        id="demo"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Try it now
            </h2>
            <p className="mt-3 text-muted-foreground">
              Upload your photo and a garment image to see the result.
            </p>
          </div>

          <div className="mx-auto grid max-w-xl grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your Photo
              </p>
              <DropZone
                label="Full-body photo"
                sublabel="Drag & drop or click"
                file={personFile}
                onFile={setPersonFile}
                icon={Upload}
              />
            </div>
            <div className="space-y-2">
              <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Garment
              </p>
              <DropZone
                label="Garment image"
                sublabel="Drag & drop or click"
                file={garmentFile}
                onFile={setGarmentFile}
                icon={ImageIcon}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="rounded-full px-10"
              onClick={handleSubmit}
              disabled={!personFile || !garmentFile || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate Try-On
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {resultUrl && (
            <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-accent/50 px-4 py-2.5">
                <CheckCircle2 className="size-4 text-foreground" />
                <span className="text-sm font-medium">Result ready</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultUrl} alt="AI Try-On Result" className="w-full" />
            </div>
          )}

          {isLoading && (
            <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-lg border border-border">
              <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4 bg-accent/30">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Generating your try-on...
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This takes about 15-30 seconds
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 DecaDriver
          </p>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <div className="flex gap-6">
            <Link
              href="/feed"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Feed
            </Link>
            <Link
              href="/try-on"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Try-On
            </Link>
            <Link
              href="/wardrobe"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Wardrobe
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
