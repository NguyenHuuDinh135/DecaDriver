import Link from "next/link"
import { ArrowLeft, Heart, Grid3X3, MoreHorizontal } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Separator } from "@workspace/ui/components/separator"

const MOCK_USERS: Record<
  string,
  {
    name: string
    username: string
    avatarUrl: string
    bio: string
    stats: { looks: number; followers: number; following: number }
    isFollowing: boolean
  }
> = {
  default: {
    name: "Trần Mai",
    username: "@tranmai",
    avatarUrl: "",
    bio: "Streetwear & minimalism ✨",
    stats: { looks: 87, followers: 4_230, following: 215 },
    isFollowing: false,
  },
}

const MOCK_LOOKS = Array.from({ length: 9 }, (_, i) => ({
  id: `other-look-${i + 1}`,
  thumbnail: `https://picsum.photos/seed/other${i + 1}/400/500`,
  likes: Math.floor(Math.random() * 800) + 30,
}))

function StatItem({ label, value }: { label: string; value: number }) {
  const display =
    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold">{display}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const user = MOCK_USERS[userId] ?? MOCK_USERS.default!

  return (
    <div className="mx-auto max-w-lg pb-4">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/feed">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="flex-1 text-lg font-semibold">{user.username}</h1>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="size-5" />
        </Button>
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
        <Button
          className="flex-1"
          size="sm"
          variant={user.isFollowing ? "outline" : "default"}
        >
          {user.isFollowing ? "Following" : "Follow"}
        </Button>
        <Button variant="outline" className="flex-1" size="sm">
          Message
        </Button>
      </section>

      <Separator className="mt-4" />

      {/* Looks grid */}
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
    </div>
  )
}
