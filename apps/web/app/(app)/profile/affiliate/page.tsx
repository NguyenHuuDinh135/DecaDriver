"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Copy, Check, Plus, BarChart3, 
  MousePointer2, ShoppingBag, DollarSign, ExternalLink,
  Loader2, Trash2
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card"
import { useCurrentUser } from "@/lib/hooks/use-auth"
import { api, BASE_URL } from "@/lib/api/client"

interface AffiliateStats {
  total_clicks: number
  total_conversions: number
  total_revenue: number
  total_commission: number
}

interface AffiliatePost {
  id: string
  title: string
  tiki_link: string
  product_image_url: string
  ai_image_url: string | null
  price: string
  status: string
  created_at: string
}

export default function AffiliateDashboardPage() {
  const { data: user } = useCurrentUser()
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [posts, setPosts] = useState<AffiliatePost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function fetchData() {
    try {
      const [statsData, postsData] = await Promise.all([
        api.get<AffiliateStats>("/affiliate/me/stats"),
        api.get<AffiliatePost[]>("/affiliate/me/posts")
      ])
      setStats(statsData)
      setPosts(postsData)
    } catch (error) {
      console.error("Failed to fetch affiliate data", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Refresh data when user returns to this tab (e.g. after clicking a link)
    window.addEventListener("focus", fetchData)
    return () => window.removeEventListener("focus", fetchData)
  }, [])

  async function handleDeletePost(id: string) {
    if (!confirm("Are you sure you want to delete this post? This will not affect your earned commission.")) return
    
    try {
      await api.delete(`/affiliate/posts/${id}`)
      toast.success("Post deleted")
      fetchData()
    } catch (error) {
      toast.error("Failed to delete post")
      console.error(error)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/profile">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold">Affiliate Dashboard</h1>
        </div>
        <Button asChild>
          <Link href="/affiliate/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Link>
        </Button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <StatCard 
          title="Total Clicks" 
          value={stats?.total_clicks ?? 0} 
          icon={MousePointer2}
          color="blue"
        />
        <StatCard 
          title="Conversions" 
          value={stats?.total_conversions ?? 0} 
          icon={ShoppingBag}
          color="green"
        />
        <StatCard 
          title="Revenue" 
          value={`${(stats?.total_revenue ?? 0).toLocaleString()}đ`} 
          icon={BarChart3}
          color="purple"
        />
        <StatCard 
          title="Commission" 
          value={`${(stats?.total_commission ?? 0).toLocaleString()}đ`} 
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Posts List */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Your Affiliate Posts
          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {posts.length}
          </span>
        </h2>
        
        {posts.length === 0 && !isLoading ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="font-medium">No affiliate posts yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start by creating your first post with a Tiki link.
            </p>
            <Button variant="outline" asChild>
              <Link href="/affiliate/create">Create My First Post</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden group">
                <a 
                  href={`${BASE_URL}/affiliate/click/${post.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="aspect-[4/5] relative bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={post.ai_image_url || post.product_image_url} 
                      alt={post.title} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    {post.status !== 'completed' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                </a>
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium line-clamp-1 mb-1">{post.title}</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-bold">{post.price}</span>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive" 
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-3.3 w-3.3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="h-6 w-6" asChild>
                        <a href={`${BASE_URL}/affiliate/click/${post.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.3 w-3.3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Referral Link (Moved from old page) */}
      <section className="mt-12 pt-8 border-t">
        <h2 className="text-lg font-semibold mb-4">Old Referral Program</h2>
        <ReferralSection user={user} />
      </section>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  }

  return (
    <Card className={`border shadow-sm`}>
      <CardContent className="p-4 flex flex-col items-center text-center">
        <div className={`p-2 rounded-full mb-2 ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {title}
        </div>
      </CardContent>
    </Card>
  )
}

function ReferralSection({ user }: any) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const referralLink = mounted
    ? `${window.location.origin}/ref/${user?.id ?? ""}`
    : `/ref/${user?.id ?? ""}`

  function handleCopy() {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success("Referral link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardHeader className="py-4">
        <CardTitle className="text-sm">Your Referral Link</CardTitle>
        <CardDescription className="text-xs">
          Earn rewards when friends sign up using your link.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-[10px]">
            {referralLink}
          </code>
          <Button variant="outline" size="icon-sm" onClick={handleCopy}>
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
