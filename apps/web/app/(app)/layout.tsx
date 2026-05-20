"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Flame,
  Shirt,
  PlusCircle,
  ShoppingBag,
  User,
  Sparkles,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { AvatarStatusBanner } from "@/components/avatar-status-banner"

const navItems = [
  { href: "/feed", label: "Feed", icon: Flame },
  { href: "/try-on", label: "Try-On", icon: Shirt },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/wardrobe", label: "Wardrobe", icon: ShoppingBag },
  { href: "/onboarding", label: "Onboarding", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
] as const

function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-50 hidden border-b bg-background/80 backdrop-blur-lg lg:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
        <Link href="/feed" className="font-serif text-2xl tracking-tight">
          DecaDriver
        </Link>

        <nav>
          <ul className="flex items-center gap-1">
            {navItems
              .filter(({ href }) => href !== "/profile")
              .map(({ href, label }) => {
                const isActive =
                  pathname === href || pathname.startsWith(href + "/")
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "relative px-4 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                      {isActive && (
                        <span className="absolute inset-x-4 -bottom-[1.05rem] h-px bg-foreground" />
                      )}
                    </Link>
                  </li>
                )
              })}
          </ul>
        </nav>

        <Link
          href="/profile"
          className={cn(
            "flex size-9 items-center justify-center rounded-full border transition-colors duration-[var(--duration-fast)]",
            pathname.startsWith("/profile")
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          )}
        >
          <User className="size-4" strokeWidth={1.5} />
        </Link>
      </div>
    </header>
  )
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="sticky bottom-0 z-50 border-t bg-background/80 backdrop-blur-lg lg:hidden">
      <ul className="mx-auto flex h-14 max-w-lg items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/")
          const isCreate = href === "/create"
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[0.65rem] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                  isCreate && "relative"
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    isCreate && "size-7 text-primary"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(isCreate && "sr-only")}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-svh flex-col">
      <AvatarStatusBanner />
      <DesktopNav pathname={pathname} />
      <main className="flex-1">{children}</main>
      <MobileNav pathname={pathname} />
    </div>
  )
}
