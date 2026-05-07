"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { LookDetailView } from "@workspace/ui/components/blocks/feed/look-detail"
import { ShareModal } from "@workspace/ui/components/blocks/share-modal"
import { useTryOnDetail, useDeleteLook } from "@/lib/hooks/use-wardrobe"
import { useGarments } from "@/lib/hooks/use-tryon"
import { useStyleProfile } from "@/lib/hooks/use-profile"
import { downloadImage } from "@/lib/utils/download"

interface PageProps {
  params: Promise<{ lookId: string }>
}

export default function LookDetailPage({ params }: PageProps) {
  const { lookId } = use(params)
  const router = useRouter()
  const { data: job, isLoading } = useTryOnDetail(lookId)
  const deleteLook = useDeleteLook()
  const { data: styleProfile } = useStyleProfile()
  const [shareOpen, setShareOpen] = useState(false)

  const { data: garmentsData } = useGarments(0, 100)
  const garment = garmentsData?.data?.find((g) => g.id === job?.garment_id)

  const handleDownload = () => {
    if (job?.result_url) {
      downloadImage(job.result_url, `decadriver-look-${lookId}.jpg`)
    }
  }

  const handleDelete = () => {
    if (!window.confirm("Are you sure you want to delete this look?")) return
    deleteLook.mutate(lookId, {
      onSuccess: () => {
        toast.success("Look deleted")
        router.push("/feed")
      },
      onError: () => {
        toast.error("Failed to delete look")
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">Look not found</p>
        <button
          onClick={() => router.push("/feed")}
          className="text-sm underline"
        >
          Back to Feed
        </button>
      </div>
    )
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/feed/${lookId}`
      : ""

  return (
    <div className="h-full overflow-y-auto">
      <LookDetailView
        resultUrl={job.result_url}
        garmentTitle={garment?.title}
        garmentBrand={garment?.brand}
        createdAt={job.created_at}
        onBack={() => router.back()}
        onDownload={handleDownload}
        onShare={() => setShareOpen(true)}
        onDelete={handleDelete}
        isDeleting={deleteLook.isPending}
      />

      {styleProfile && (
        <section className="px-4 pb-24 pt-6 lg:max-w-md lg:ml-auto lg:pr-8">
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <h3 className="font-serif text-sm font-semibold">
                AI Stylist says
              </h3>
            </div>
            {styleProfile.recommended_styles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Based on your profile, try pairing with:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {styleProfile.recommended_styles.map((style) => (
                    <Badge key={style} variant="secondary" className="text-[0.65rem]">
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {styleProfile.avoid_styles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  You might want to avoid:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {styleProfile.avoid_styles.map((style) => (
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
          </div>
        </section>
      )}

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title="Share Look"
      />
    </div>
  )
}
