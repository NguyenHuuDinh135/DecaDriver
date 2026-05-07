import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Separator } from "@workspace/ui/components/separator"

export const dynamicParams = false

export function generateStaticParams() {
  return [{ userId: "placeholder" }]
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  return (
    <div className="mx-auto max-w-lg pb-4">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/feed">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="font-serif text-lg font-semibold">Profile</h1>
      </header>

      <section className="flex flex-col items-center gap-3 px-4 pt-8">
        <Avatar className="size-20 border">
          <AvatarFallback className="text-xl font-serif">
            {userId.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="text-center">
          <p className="text-sm font-semibold">DecaDriver User</p>
          <p className="text-xs text-muted-foreground">@{userId}</p>
        </div>

        <Button variant="outline" size="sm">
          Follow
        </Button>
      </section>

      <Separator className="mt-6" />

      <div className="flex min-h-40 items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Public looks gallery coming soon.
        </p>
      </div>
    </div>
  )
}
