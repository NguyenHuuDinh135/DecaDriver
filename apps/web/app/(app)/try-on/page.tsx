"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { MOCK_GARMENTS, MOCK_LOOKS } from "@/lib/mock-data"

export default function TryOnPage() {
  return (
    <Suspense>
      <TryOnContent />
    </Suspense>
  )
}

function TryOnContent() {
  const router = useRouter()
  const [selectedGarment, setSelectedGarment] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedResult, setGeneratedResult] = useState<string | null>(null)

  const selectedGarmentData = MOCK_GARMENTS.find(
    (g) => g.id === selectedGarment
  )

  const handleGenerate = () => {
    if (!selectedGarment) return
    setIsGenerating(true)
    setGeneratedResult(null)

    // Simulate AI generation delay
    setTimeout(() => {
      // Pick a random look result to show as the "generated" image
      const look =
        MOCK_LOOKS.find((l) => l.garment_id === selectedGarment) ??
        MOCK_LOOKS[0]
      if (look) {
        setGeneratedResult(look.result_url)
      }
      setIsGenerating(false)
    }, 2500)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: garment selection */}
        <section>
          <h1 className="font-serif text-3xl tracking-tight lg:text-4xl">
            Select a garment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a piece to virtually try on with your avatar
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MOCK_GARMENTS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedGarment(item.id)
                  setGeneratedResult(null)
                }}
                className={`group relative flex flex-col overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  selectedGarment === item.id
                    ? "border-foreground ring-1 ring-foreground/20"
                    : "border-transparent hover:border-muted-foreground/30"
                }`}
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-2 text-left">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  {item.brand && (
                    <p className="text-[0.65rem] text-muted-foreground truncate">
                      {item.brand}
                    </p>
                  )}
                </div>
                {selectedGarment === item.id && (
                  <div className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Right: preview + generate */}
        <section className="flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 min-h-[400px]">
            {generatedResult ? (
              <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
                <div className="relative aspect-[3/4] w-48 overflow-hidden rounded-lg shadow-lg lg:w-64">
                  <img
                    src={generatedResult}
                    alt="Try-on result"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" />
                    Look generated successfully!
                  </p>
                </div>
              </div>
            ) : selectedGarmentData ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative aspect-[3/4] w-48 overflow-hidden rounded-lg shadow-lg lg:w-64">
                  <img
                    src={selectedGarmentData.image_url}
                    alt={selectedGarmentData.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <p className="font-medium">{selectedGarmentData.title}</p>
                  {selectedGarmentData.brand && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGarmentData.brand}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full border border-dashed border-muted-foreground/40">
                  <Sparkles className="size-6" />
                </div>
                <p className="text-sm">Select a garment to preview</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <Button
              onClick={handleGenerate}
              disabled={!selectedGarment || isGenerating}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Generating...
                </span>
              ) : generatedResult ? (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Try Another
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate Try-On
                </>
              )}
            </Button>

            {generatedResult && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/wardrobe")}
                >
                  View in Wardrobe
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedGarment(null)
                    setGeneratedResult(null)
                  }}
                >
                  Start Over
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}