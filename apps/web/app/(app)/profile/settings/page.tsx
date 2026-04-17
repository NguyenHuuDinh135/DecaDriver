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
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card"

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
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={destructive ? "text-destructive" : "text-muted-foreground"}>
        {icon}
      </span>
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
      <Link href={href} className="block transition-colors hover:bg-muted/50">
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
    <div className="mx-auto max-w-lg pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      {/* Account */}
      <section className="mt-6 px-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        <Card>
          <CardContent className="p-0">
            <SettingRow
              icon={<UserCog className="size-5" />}
              label="Edit profile"
              description="Name, bio, avatar"
            />
            <Separator />
            <SettingRow
              icon={<Lock className="size-5" />}
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
          </CardContent>
        </Card>
      </section>

      {/* Preferences */}
      <section className="mt-6 px-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preferences
        </h2>
        <Card>
          <CardContent className="p-0">
            <SettingRow
              icon={<Bell className="size-5" />}
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
              icon={<Moon className="size-5" />}
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
              icon={<Globe className="size-5" />}
              label="Language"
              description="Tiếng Việt"
            />
            <Separator />
            <SettingRow
              icon={<Eye className="size-5" />}
              label="Content preferences"
              description="Brands, styles, sizing"
            />
          </CardContent>
        </Card>
      </section>

      {/* Danger zone */}
      <section className="mt-6 px-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Danger zone
        </h2>
        <Card>
          <CardContent className="p-0">
            <button className="w-full cursor-pointer transition-colors hover:bg-muted/50">
              <SettingRow
                icon={<LogOut className="size-5" />}
                label="Log out"
              />
            </button>
            <Separator />
            <button className="w-full cursor-pointer transition-colors hover:bg-muted/50">
              <SettingRow
                icon={<Trash2 className="size-5" />}
                label="Delete account"
                description="Permanently delete all your data"
                destructive
              />
            </button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
