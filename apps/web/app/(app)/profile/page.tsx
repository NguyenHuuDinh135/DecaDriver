"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Settings,
  Grid3X3,
  Heart,
  BookmarkCheck,
  Share2,
  BadgePercent,
  Calendar,
  Sparkles,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ShareModal } from "@workspace/ui/components/blocks/share-modal"
import { useCurrentUser } from "@/lib/hooks/use-auth"
import { useStyleProfile } from "@/lib/hooks/use-profile"
import { useTryOnHistory } from "@/lib/hooks/use-wardrobe"

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: styleProfile } = useStyleProfile()
  const { data: tryOns } = useTryOnHistory()
  const [shareOpen, setShareOpen] = useState(false)

  const completedCount = tryOns?.filter((j) => j.status === "completed").length ?? 0
  const totalCount = tryOns?.length ?? 0
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null

  if (userLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-8 space-y-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="mx-auto max-w-lg pb-4">
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-serif text-lg font-semibold">Profile</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile/affiliate">
              <BadgePercent className="size-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile/settings">
              <Settings className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="flex items-center gap-5 px-4 pt-5">
        <Avatar className="size-20 border">
          <AvatarFallback className="text-xl font-serif">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-1 justify-around">
          <StatItem label="Try-Ons" value={totalCount} />
          <StatItem label="Completed" value={completedCount} />
        </div>
      </section>

      <section className="px-4 pt-3">
        <p className="text-sm font-semibold">{user?.full_name ?? "User"}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        {memberSince && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            Member since {memberSince}
          </p>
        )}
      </section>

      <section className="flex gap-2 px-4 pt-4">
        <Button variant="outline" className="flex-1" size="sm" asChild>
          <Link href="/profile/settings">Edit Profile</Link>
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => setShareOpen(true)}>
          <Share2 className="size-4" />
        </Button>
      </section>

      {styleProfile && (
        <>
          <Separator className="mt-4" />
          <section className="px-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-serif">
                  <Sparkles className="size-4" />
                  Style Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {styleProfile.body_type && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Body Type</span>
                    <span className="font-medium">{styleProfile.body_type}</span>
                  </div>
                )}
                {styleProfile.color_tone && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Color Tone</span>
                    <span className="font-medium">{styleProfile.color_tone}</span>
                  </div>
                )}
                {styleProfile.recommended_styles.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-1">Recommended</p>
                    <div className="flex flex-wrap gap-1">
                      {styleProfile.recommended_styles.map((style) => (
                        <Badge key={style} variant="secondary" className="text-[0.65rem]">
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      <Separator className="mt-4" />

      <Tabs defaultValue="looks" className="mt-2">
        <TabsList variant="line" className="w-full justify-around">
          <TabsTrigger value="looks">
            <Grid3X3 className="size-4" />
          </TabsTrigger>
          <TabsTrigger value="liked">
            <Heart className="size-4" />
          </TabsTrigger>
          <TabsTrigger value="saved">
            <BookmarkCheck className="size-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="looks">
          {completedCount === 0 ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              Your completed looks will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 pt-1">
              {tryOns
                ?.filter((j) => j.status === "completed" && j.result_url)
                .map((job) => (
                  <Link
                    key={job.id}
                    href="/wardrobe/history"
                    className="group relative aspect-[4/5] overflow-hidden bg-muted"
                  >
                    <img
                      src={job.result_url!}
                      alt=""
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  </Link>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked">
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            Looks you liked will appear here.
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            Saved looks will appear here.
          </div>
        </TabsContent>
      </Tabs>

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={`https://decadriver.com/profile/${user?.id ?? ""}`}
        title="Share Profile"
      />
    </div>
  )
}
