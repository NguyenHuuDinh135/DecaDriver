"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sparkles, AlertCircle } from "lucide-react"
import { GarmentPicker } from "@workspace/ui/components/blocks/try-on/garment-picker"
import { Button } from "@workspace/ui/components/button"
import { useGarments, useCreateTryOn } from "@/lib/hooks/use-tryon"
import { useHasAvatar } from "@/lib/hooks/use-avatar"

export default function TryOnPage() {
  return (
    <Suspense>
      <TryOnContent />
    </Suspense>
  )
}

function TryOnContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedGarment, setSelectedGarment] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const limit = 20

  useEffect(() => {
    const garmentParam = searchParams.get("garment")
    if (garmentParam) {
      setSelectedGarment(garmentParam)
    }
  }, [searchParams])

  const hasAvatar = useHasAvatar()
  const { data: garmentsData, isLoading: isLoadingGarments } = useGarments(page, limit)
  const createTryOn = useCreateTryOn()

  const garments = garmentsData?.data ?? []
  const totalCount = garmentsData?.count ?? 0
  const hasMore = (page + 1) * limit < totalCount

  const selectedGarmentData = garments.find((g) => g.id === selectedGarment)

  const handleGenerate = () => {
    if (!selectedGarment || !hasAvatar) return

    createTryOn.mutate(selectedGarment, {
      onSuccess: (job) => {
        router.push(`/try-on/result?job=${job.id}`)
      },
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <section>
          <h1 className="font-serif text-3xl tracking-tight lg:text-4xl">
            Select a garment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a piece to virtually try on with your avatar
          </p>

          <div className="mt-6">
            <GarmentPicker
              garments={garments}
              selectedId={selectedGarment}
              onSelect={setSelectedGarment}
              isLoading={isLoadingGarments}
            />
          </div>

          {totalCount > limit && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {Math.ceil(totalCount / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>

        <section className="flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-8">
            {selectedGarmentData ? (
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
            {!hasAvatar && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p className="text-amber-800 dark:text-amber-200">
                  You need a trained avatar to generate try-on images.{" "}
                  <a
                    href="/onboarding/avatar"
                    className="font-medium underline underline-offset-2"
                  >
                    Create one now
                  </a>
                </p>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedGarment || !hasAvatar || createTryOn.isPending}
              size="lg"
              className="w-full"
            >
              {createTryOn.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate Try-On
                </>
              )}
            </Button>

            {createTryOn.isError && (
              <p className="text-center text-sm text-destructive">
                Failed to start try-on. Please try again.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}