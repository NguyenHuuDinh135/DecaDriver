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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card"
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
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
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
    <div className="mx-auto max-w-lg pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Affiliate</h1>
        <Badge variant="secondary" className="ml-auto">
          {data.tier}
        </Badge>
      </header>

      {/* Referral link */}
      <section className="mt-5 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Your referral link</CardTitle>
            <CardDescription>
              Share this link to earn commission on every sale.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
                {data.referralLink}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleCopy}
              >
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

      {/* Tier progress */}
      <section className="mt-4 px-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {data.stats.conversions} / {data.nextTierAt} conversions to Gold
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="mt-1" />
      </section>

      {/* Metrics grid */}
      <section className="mt-5 grid grid-cols-2 gap-3 px-4">
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
      <section className="mt-4 px-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total paid</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatVND(data.stats.paidEarnings)}
            </span>
          </CardContent>
        </Card>
      </section>

      <Separator className="mt-6" />

      {/* Recent items */}
      <section className="mt-4 px-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent items
        </h2>
        <div className="space-y-2">
          {data.recentItems.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.product}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.clicks} clicks · {item.date}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  +{formatVND(item.earned)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
