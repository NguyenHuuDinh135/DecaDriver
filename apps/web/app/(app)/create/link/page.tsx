"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { api } from "@/lib/api/client"

export default function CreateLinkPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || !title) return

    setIsSubmitting(true)
    setError(null)

    try {
      await api.post("/garments/", { title, image_url: url })
      router.push("/wardrobe")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to import garment"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-serif text-2xl tracking-tight">Import from URL</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste a garment image URL to add it to your wardrobe.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-medium text-foreground"
          >
            Title
          </label>
          <Input
            id="title"
            placeholder="e.g. Blue Denim Jacket"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="url" className="text-sm font-medium text-foreground">
            Image URL
          </label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com/garment.jpg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={!url || !title || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Importing..." : "Import Garment"}
        </Button>
      </form>
    </div>
  )
}
