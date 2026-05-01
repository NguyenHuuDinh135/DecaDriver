"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Grid3X3,
  Heart,
  BookmarkCheck,
  Share2,
  BadgePercent,
  Sparkles,
  Settings,
  Camera,
  MapPin,
  ExternalLink,
  Shirt,
  Wand2,
  X,
  Check,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"

const MOCK_USER = {
  name: "Nguyễn Vinh",
  username: "@nqvinh",
  avatarUrl: "",
  bio: "Fashion lover | Try-on enthusiast | Saigon style",
  location: "Ho Chi Minh City",
  website: "decadriver.app",
  stats: { looks: 42, followers: 1_280, following: 326 },
  hasAvatar: false,
  styleProfile: null as null | { bodyType: string; colorTone: string },
}

const MOCK_LOOKS = Array.from({ length: 18 }, (_, i) => ({
  id: `look-${i + 1}`,
  thumbnail: `https://picsum.photos/seed/look${i + 1}/400/500`,
  likes: Math.floor(Math.random() * 500) + 50,
}))

function StatItem({ label, value }: { label: string; value: number }) {
  const display = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
  return (
    <button className="flex flex-col items-center transition-opacity hover:opacity-70 cursor-pointer">
      <span className="text-xl font-bold tracking-tight">{display}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  )
}

/* ─── Quick Action Button — icon-only with expanding label on hover ─── */
function QuickActionButton({
  href,
  icon,
  gradient,
  label,
}: {
  href: string
  icon: React.ReactNode
  gradient: string
  label: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-2 cursor-pointer"
    >
      {/* Icon circle */}
      <div className={cn(
        "flex size-11 items-center justify-center rounded-full text-white shadow-md transition-all duration-300",
        "group-hover:scale-110 group-hover:shadow-lg group-hover:rotate-6",
        gradient
      )}>
        {icon}
      </div>
      {/* Expanding label — hidden by default, slides in on hover */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 ease-out group-hover:max-w-[200px] group-hover:opacity-100">
        {label}
      </span>
    </Link>
  )
}

/* ─── Edit Profile Form ─── */
function EditProfilePanel({
  user,
  onClose,
}: {
  user: typeof MOCK_USER
  onClose: () => void
}) {
  const [name, setName] = useState(user.name)
  const [bio, setBio] = useState(user.bio)
  const [location, setLocation] = useState(user.location)
  const [website, setWebsite] = useState(user.website)

  return (
    <div className="rounded-2xl bg-card ring-1 ring-foreground/[0.06] p-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold">Edit Profile</h3>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-full cursor-pointer">
            <X className="size-4" />
          </Button>
          <Button size="icon-sm" onClick={onClose} className="rounded-full cursor-pointer">
            <Check className="size-4" />
          </Button>
        </div>
      </div>

      {/* Avatar change */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <Avatar className="size-18 ring-2 ring-border/50">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
            <AvatarFallback className="bg-muted text-2xl font-bold">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <button className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-110 cursor-pointer">
            <Camera className="size-3.5" />
          </button>
        </div>
        <Button variant="outline" size="sm" className="rounded-full text-sm cursor-pointer">
          Change photo
        </Button>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-muted/50 px-4 py-3 text-base outline-none ring-1 ring-foreground/[0.06] focus:ring-foreground/20 transition-shadow"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="w-full rounded-xl bg-muted/50 px-4 py-3 text-base outline-none ring-1 ring-foreground/[0.06] focus:ring-foreground/20 resize-none transition-shadow"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl bg-muted/50 px-4 py-3 text-base outline-none ring-1 ring-foreground/[0.06] focus:ring-foreground/20 transition-shadow"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-xl bg-muted/50 px-4 py-3 text-base outline-none ring-1 ring-foreground/[0.06] focus:ring-foreground/20 transition-shadow"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const user = MOCK_USER
  const [editing, setEditing] = useState(false)

  return (
    <div className="min-h-screen bg-secondary">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
        {/* ─── Profile hero ─── */}
        <section>
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="size-28 ring-[3px] ring-border/50 ring-offset-[3px] ring-offset-secondary md:size-36">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-muted text-4xl font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-110 cursor-pointer">
                <Camera className="size-4" />
              </button>
            </div>

            {/* Info column */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-4">
                <h2 className="text-3xl font-bold tracking-tight">{user.name}</h2>
                {/* Settings & affiliate */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" asChild className="cursor-pointer">
                    <Link href="/profile/affiliate">
                      <BadgePercent className="size-5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon-sm" asChild className="cursor-pointer">
                    <Link href="/profile/settings">
                      <Settings className="size-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              <p className="text-base text-muted-foreground">{user.username}</p>

              {/* Stats */}
              <div className="mt-4 flex justify-center gap-10 md:justify-start">
                <StatItem label="Looks" value={user.stats.looks} />
                <StatItem label="Followers" value={user.stats.followers} />
                <StatItem label="Following" value={user.stats.following} />
              </div>

              {/* Bio */}
              <p className="mt-3 text-base leading-relaxed">{user.bio}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground md:justify-start">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {user.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="size-3.5" />
                  {user.website}
                </span>
              </div>

              {/* Actions row: Edit + Share + Quick Action buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-6 text-sm font-medium cursor-pointer"
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? "Cancel" : "Edit profile"}
                </Button>
                <Button variant="outline" size="icon-sm" className="rounded-full cursor-pointer">
                  <Share2 className="size-4" />
                </Button>

                {/* Divider */}
                <div className="mx-1 h-6 w-px bg-border/50" />

                {/* Quick Action icon buttons — horizontal row */}
                <QuickActionButton
                  href="/profile/avatar"
                  icon={<Sparkles className="size-4" />}
                  gradient="bg-gradient-to-br from-violet-500 to-fuchsia-500"
                  label="AI Avatar"
                />
                <QuickActionButton
                  href="/try-on"
                  icon={<Shirt className="size-4" />}
                  gradient="bg-gradient-to-br from-sky-500 to-blue-600"
                  label="Try-On"
                />
                <QuickActionButton
                  href="/profile/settings"
                  icon={<Wand2 className="size-4" />}
                  gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                  label="AI Stylist"
                />
              </div>
            </div>
          </div>

          {/* Inline Edit Profile */}
          {editing && (
            <div className="mt-6 max-w-2xl">
              <EditProfilePanel user={user} onClose={() => setEditing(false)} />
            </div>
          )}
        </section>

        <Separator className="my-6" />

        {/* ─── Content grid ─── */}
        <Tabs defaultValue="looks">
          <TabsList variant="line" className="w-full justify-around">
            <TabsTrigger value="looks" className="gap-2 cursor-pointer">
              <Grid3X3 className="size-5" />
              <span className="text-sm font-medium">Looks</span>
            </TabsTrigger>
            <TabsTrigger value="liked" className="gap-2 cursor-pointer">
              <Heart className="size-5" />
              <span className="text-sm font-medium">Liked</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2 cursor-pointer">
              <BookmarkCheck className="size-5" />
              <span className="text-sm font-medium">Saved</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="looks" className="mt-3">
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-1.5">
              {MOCK_LOOKS.map((look) => (
                <Link
                  key={look.id}
                  href={`/feed/${look.id}`}
                  className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/[0.04] transition-all hover:shadow-lg md:rounded-xl cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={look.thumbnail}
                    alt=""
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="flex items-center gap-1.5 text-base font-bold text-white drop-shadow-md">
                      <Heart className="size-5 fill-white" />
                      {look.likes}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="liked">
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Heart className="size-12 text-muted-foreground/30" />
              <p className="text-base">Looks you liked will appear here.</p>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <BookmarkCheck className="size-12 text-muted-foreground/30" />
              <p className="text-base">Saved looks will appear here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
