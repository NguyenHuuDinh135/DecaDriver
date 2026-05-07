"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ProductCatalog } from "@workspace/ui/components/blocks/feed/product-catalog"
import { useGarments } from "@/lib/hooks/use-tryon"

export default function FeedProductsPage() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const limit = 20
  const { data: garmentsData, isLoading } = useGarments(page, limit)

  const allGarments = garmentsData?.data ?? []
  const totalCount = garmentsData?.count ?? 0
  const hasMore = (page + 1) * limit < totalCount

  const filteredGarments = searchQuery
    ? allGarments.filter((g) =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allGarments

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 border-b bg-background px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-serif text-lg font-semibold">All Garments</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search garments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <ProductCatalog
          garments={filteredGarments}
          onTryOn={(id) => router.push(`/try-on?garment=${id}`)}
          isLoading={isLoading}
        />

        {hasMore && !isLoading && !searchQuery && (
          <div className="flex justify-center pt-6">
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
