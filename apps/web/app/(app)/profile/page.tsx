import Link from "next/link"
import {
  Settings,
  Grid3X3,
  Heart,
  BookmarkCheck,
  Share2,
  BadgePercent,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"

const MOCK_USER = {
  name: "Nguyễn Vinh",
  username: "@nqvinh",
  avatarUrl: "",
  bio: "Fashion lover 🌸 | Try-on enthusiast",
  stats: { looks: 42, followers: 1_280, following: 326 },
}

const MOCK_LOOKS = Array.from({ length: 6 }, (_, i) => ({
  id: `look-${i + 1}`,
  thumbnail: `https://picsum.photos/seed/look${i + 1}/400/500`,
  likes: Math.floor(Math.random() * 500) + 50,
}))

function StatItem({ label, value }: { label: string; value: number }) {
  const display = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold">{display}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function ProfilePage() {
  const user = MOCK_USER

  return (
    <div className="mx-auto max-w-lg pb-4">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-lg font-semibold">Profile</h1>
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

      {/* Avatar + Stats */}
      <section className="flex items-center gap-5 px-4 pt-5">
        <Avatar className="size-20">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-xl">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-1 justify-around">
          <StatItem label="Looks" value={user.stats.looks} />
          <StatItem label="Followers" value={user.stats.followers} />
          <StatItem label="Following" value={user.stats.following} />
        </div>
      </section>

      {/* Bio */}
      <section className="px-4 pt-3">
        <p className="text-sm font-semibold">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.username}</p>
        <p className="mt-1 text-sm">{user.bio}</p>
      </section>

      {/* Actions */}
      <section className="flex gap-2 px-4 pt-4">
        <Button variant="outline" className="flex-1" size="sm">
          Edit profile
        </Button>
        <Button variant="outline" size="icon-sm">
          <Share2 className="size-4" />
        </Button>
      </section>

      <Separator className="mt-4" />

      {/* Content Tabs */}
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
          <div className="grid grid-cols-3 gap-0.5 pt-1">
            {MOCK_LOOKS.map((look) => (
              <Link
                key={look.id}
                href={`/feed/${look.id}`}
                className="group relative aspect-[4/5] overflow-hidden bg-muted"
              >
                <img
                  src={look.thumbnail}
                  alt=""
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/50 px-1.5 py-0.5 text-[0.6rem] text-white">
                  <Heart className="size-3" />
                  {look.likes}
                </span>
              </Link>
            ))}
          </div>
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
    </div>
  )
}
