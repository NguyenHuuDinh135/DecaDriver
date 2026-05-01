"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Flame,
  Shirt,
  PlusCircle,
  ShoppingBag,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar"

const navItems = [
  { href: "/feed", label: "Feed", icon: Flame },
  { href: "/try-on", label: "Try-On", icon: Shirt },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/wardrobe", label: "Wardrobe", icon: ShoppingBag },
] as const

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isProfileActive =
    pathname === "/profile" || pathname.startsWith("/profile/")

  return (
    <div className="flex min-h-svh">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-border/40 bg-background py-6 lg:flex xl:w-[220px]">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center">
          <span className="text-lg font-bold tracking-tight xl:text-xl">D</span>
          <span className="hidden text-lg font-bold tracking-tight xl:inline">eca</span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1 px-2 xl:px-3 xl:w-full">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors cursor-pointer xl:justify-start",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon
                  className="size-5 shrink-0"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Profile — avatar instead of icon */}
        <Link
          href="/profile"
          className={cn(
            "mt-auto flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 transition-colors cursor-pointer xl:justify-start xl:w-full xl:px-3",
            isProfileActive
              ? "bg-muted"
              : "hover:bg-muted/50"
          )}
        >
          <Avatar className={cn("size-8 ring-2 ring-offset-1 ring-offset-background transition-all", isProfileActive ? "ring-foreground/30" : "ring-transparent")}>
            <AvatarImage src="https://i.pravatar.cc/150?u=nqvinh" alt="Profile" />
            <AvatarFallback className="text-xs font-bold bg-muted">N</AvatarFallback>
          </Avatar>
          <span className={cn("hidden text-sm font-medium xl:inline", isProfileActive ? "text-foreground" : "text-muted-foreground")}>
            Profile
          </span>
        </Link>
      </aside>

      {/* ─── Main content area ─── */}
      <main className="flex-1 lg:ml-[72px] xl:ml-[220px]">{children}</main>

      {/* ─── Mobile Bottom Bar ─── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl lg:hidden">
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
                    "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[0.65rem] font-medium transition-colors cursor-pointer",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    isCreate && "relative",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      isCreate && "size-7 text-foreground",
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={cn(isCreate && "sr-only")}>{label}</span>
                </Link>
              </li>
            )
          })}
          {/* Profile avatar in mobile bottom bar */}
          <li>
            <Link
              href="/profile"
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[0.65rem] font-medium transition-colors cursor-pointer",
                isProfileActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Avatar className={cn("size-6", isProfileActive && "ring-1.5 ring-foreground")}>
                <AvatarImage src="https://i.pravatar.cc/150?u=nqvinh" alt="" />
                <AvatarFallback className="text-[8px]">N</AvatarFallback>
              </Avatar>
              <span>Profile</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
