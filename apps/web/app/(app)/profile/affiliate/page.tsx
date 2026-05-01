"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Copy,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  ShoppingCart,
  Check,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { Progress } from "@workspace/ui/components/progress"

const MOCK_AFFILIATE = {
  referralCode: "VINH2026",
  referralLink: "https://decadriver.app/r/VINH2026",
  tier: "Silver",
  stats: {
    totalClicks: 2_140,
    conversions: 48,
    conversionRate: 2.2,
    pendingEarnings: 324_000,
    paidEarnings: 1_560_000,
  },
  nextTierAt: 100,
  recentItems: [
    { id: "1", product: "ZARA Linen Blazer", clicks: 312, earned: 89_000, date: "12/04" },
    { id: "2", product: "H&M Wide Pants", clicks: 198, earned: 54_000, date: "10/04" },
    { id: "3", product: "Uniqlo AIRism Tee", clicks: 456, earned: 112_000, date: "08/04" },
  ],
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/[0.06]">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80">
        <Icon className="size-[18px] text-foreground/70" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AffiliatePage() {
  const [copied, setCopied] = useState(false)
  const data = MOCK_AFFILIATE

  function handleCopy() {
    navigator.clipboard.writeText(data.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const progressPercent = Math.min(
    (data.stats.conversions / data.nextTierAt) * 100,
    100,
  )

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/30 bg-card/80 px-5 py-3 backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold tracking-tight">Affiliate</h1>
        <Badge variant="secondary" className="ml-auto">
          {data.tier}
        </Badge>
      </header>

      <div className="mx-auto max-w-xl px-5 pb-8 pt-6">
        {/* Referral link */}
        <section>
          <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/[0.06]">
            <h3 className="text-sm font-semibold">Your referral link</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share this link to earn commission on every sale.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 truncate rounded-xl bg-muted/60 px-3 py-2.5 text-xs">
                {data.referralLink}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-xl"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Tier progress */}
        <section className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {data.stats.conversions} / {data.nextTierAt} conversions to Gold
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="mt-1.5" />
        </section>

        {/* Metrics grid */}
        <section className="mt-6 grid grid-cols-2 gap-3">
          <MetricCard
            icon={MousePointerClick}
            label="Total clicks"
            value={data.stats.totalClicks.toLocaleString()}
          />
          <MetricCard
            icon={ShoppingCart}
            label="Conversions"
            value={String(data.stats.conversions)}
          />
          <MetricCard
            icon={TrendingUp}
            label="CVR"
            value={`${data.stats.conversionRate}%`}
          />
          <MetricCard
            icon={DollarSign}
            label="Pending"
            value={formatVND(data.stats.pendingEarnings)}
          />
        </section>

        {/* Paid total */}
        <section className="mt-4">
          <div className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-foreground/[0.06]">
            <span className="text-sm text-muted-foreground">Total paid</span>
            <span className="text-lg font-bold text-green-600">
              {formatVND(data.stats.paidEarnings)}
            </span>
          </div>
        </section>

        <Separator className="my-6" />

        {/* Recent items */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent items
          </h2>
          <div className="space-y-2">
            {data.recentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-card p-3.5 ring-1 ring-foreground/[0.06]">
                <div>
                  <p className="text-sm font-medium">{item.product}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.clicks} clicks · {item.date}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +{formatVND(item.earned)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
