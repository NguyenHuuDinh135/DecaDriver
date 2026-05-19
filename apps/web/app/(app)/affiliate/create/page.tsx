"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Check, ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { toast } from "sonner"
import { api } from "@/lib/api/client"

interface AffiliatePost {
  id: string
  tiki_link: string
  product_image_url: string
  ai_image_url: string | null
  title: string
  price: string
  status: "pending" | "completed" | "failed"
}

export default function CreateAffiliatePostPage() {
  const router = useRouter()
  const [tikiLink, setTikiLink] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [post, setPost] = useState<AffiliatePost | null>(null)
  const [polling, setPolling] = useState(false)

  // Polling for job completion
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (polling && post) {
      interval = setInterval(async () => {
        try {
          const updatedPost = await api.get<AffiliatePost>(`/affiliate/posts/${post.id}`)
          if (updatedPost.status === "completed") {
            setPost(updatedPost)
            setPolling(false)
            setIsGenerating(false)
            toast.success("AI Model Image Generated!")
          } else if (updatedPost.status === "failed") {
            setPolling(false)
            setIsGenerating(false)
            toast.error("Generation failed. Please try again.")
          }
        } catch (error) {
          console.error("Polling error:", error)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [polling, post])

  const handleExtractAndGenerate = async () => {
    if (!tikiLink || !tikiLink.includes("tiki.vn")) {
      toast.error("Please enter a valid Tiki link")
      return
    }

    setIsExtracting(true)
    try {
      const newPost = await api.post<AffiliatePost>("/affiliate/posts", {
        tiki_link: tikiLink
      })
      setPost(newPost)
      setIsExtracting(false)
      setIsGenerating(true)
      setPolling(true)
      toast.info("Product extracted! Generating AI model image...")
    } catch (error: any) {
      setIsExtracting(false)
      toast.error(error.detail || "Failed to process link")
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Create Affiliate Post</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tiki Product Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Paste Tiki product link here..."
                value={tikiLink}
                onChange={(e) => setTikiLink(e.target.value)}
                disabled={isExtracting || isGenerating}
              />
              <Button 
                onClick={handleExtractAndGenerate} 
                disabled={isExtracting || isGenerating || !tikiLink}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting
                  </>
                ) : (
                  "Create Post"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll extract product details and generate an AI model wearing this item.
            </p>
          </CardContent>
        </Card>

        {post && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50 py-3">
                <CardTitle className="text-xs uppercase tracking-wider">Product Info</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="aspect-square relative rounded-md overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.product_image_url} alt="Product" className="object-cover w-full h-full" />
                </div>
                <div>
                  <h3 className="font-semibold line-clamp-2">{post.title}</h3>
                  <p className="text-primary font-bold">{post.price}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-primary/20 bg-primary/5">
              <CardHeader className="bg-primary/10 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  AI Generation
                </CardTitle>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  post.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {post.status.toUpperCase()}
                </span>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center justify-center min-h-[300px]">
                {post.status === 'pending' || isGenerating ? (
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-sm font-medium">Generating your AI Model...</p>
                    <p className="text-xs text-muted-foreground">This usually takes about 30-60 seconds.</p>
                  </div>
                ) : post.status === 'completed' ? (
                  <div className="space-y-4 w-full">
                    <div className="aspect-square relative rounded-md overflow-hidden bg-white shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.ai_image_url!} alt="AI Result" className="object-cover w-full h-full" />
                    </div>
                    <Button className="w-full" onClick={() => router.push('/profile/affiliate')}>
                      View in Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-destructive">
                    <p>Generation failed. Please try again.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
