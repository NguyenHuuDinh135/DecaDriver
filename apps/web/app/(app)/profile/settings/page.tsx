"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  Moon,
  Globe,
  Lock,
  LogOut,
  Trash2,
  ChevronRight,
  UserCog,
  Eye,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Switch } from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  description?: string
  action?: React.ReactNode
  href?: string
  destructive?: boolean
}

function SettingRow({
  icon,
  label,
  description,
  action,
  href,
  destructive,
}: SettingRowProps) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${destructive ? "bg-destructive/10" : "bg-muted/80"}`}>
        <span className={destructive ? "text-destructive" : "text-muted-foreground"}>
          {icon}
        </span>
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${destructive ? "text-destructive" : ""}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action ?? <ChevronRight className="size-4 text-muted-foreground" />}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:bg-muted/40">
        {content}
      </Link>
    )
  }
  return content
}

export default function SettingsPage() {
  const [pushEnabled, setPushEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [privateAccount, setPrivateAccount] = useState(false)

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/30 bg-card/80 px-5 py-3 backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
      </header>

      <div className="mx-auto max-w-xl px-5 pb-8 pt-6">
        {/* Account */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.06]">
            <SettingRow
              icon={<UserCog className="size-[18px]" />}
              label="Edit profile"
              description="Name, bio, avatar"
            />
            <Separator />
            <SettingRow
              icon={<Lock className="size-[18px]" />}
              label="Private account"
              description="Only followers can see your looks"
              action={
                <Switch
                  checked={privateAccount}
                  onCheckedChange={setPrivateAccount}
                  size="sm"
                />
              }
            />
          </div>
        </section>

        {/* Preferences */}
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preferences
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.06]">
            <SettingRow
              icon={<Bell className="size-[18px]" />}
              label="Push notifications"
              action={
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={setPushEnabled}
                  size="sm"
                />
              }
            />
            <Separator />
            <SettingRow
              icon={<Moon className="size-[18px]" />}
              label="Dark mode"
              action={
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  size="sm"
                />
              }
            />
            <Separator />
            <SettingRow
              icon={<Globe className="size-[18px]" />}
              label="Language"
              description="Tiếng Việt"
            />
            <Separator />
            <SettingRow
              icon={<Eye className="size-[18px]" />}
              label="Content preferences"
              description="Brands, styles, sizing"
            />
          </div>
        </section>

        {/* Danger zone */}
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Danger zone
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.06]">
            <button className="w-full cursor-pointer transition-colors hover:bg-muted/40">
              <SettingRow
                icon={<LogOut className="size-[18px]" />}
                label="Log out"
              />
            </button>
            <Separator />
            <button className="w-full cursor-pointer transition-colors hover:bg-muted/40">
              <SettingRow
                icon={<Trash2 className="size-[18px]" />}
                label="Delete account"
                description="Permanently delete all your data"
                destructive
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
