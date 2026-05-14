"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Check } from "lucide-react"
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

export default function AffiliatePage() {
  const { data: user } = useCurrentUser()
  const [copied, setCopied] = useState(false)

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/ref/${user?.id ?? ""}`
    : `/ref/${user?.id ?? ""}`

  function handleCopy() {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success("Referral link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const encodedUrl = encodeURIComponent(referralLink)
  const shareText = encodeURIComponent("Join me on DecaDriver - virtual try-on fashion!")

  return (
    <div className="mx-auto max-w-lg pb-8">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="font-serif text-lg font-semibold">Referral</h1>
      </header>

      <section className="mt-5 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
            <CardDescription>
              Share this link with friends and earn rewards when they sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
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
      </section>

      <section className="mt-4 px-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Share via
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
