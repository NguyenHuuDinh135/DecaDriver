"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Flame,
  Shirt,
  PlusCircle,
  ShoppingBag,
  User,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
const navItems = [
  { href: "/feed", label: "Feed", icon: Flame },
  { href: "/try-on", label: "Try-On", icon: Shirt },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/wardrobe", label: "Wardrobe", icon: ShoppingBag },
  { href: "/profile", label: "Profile", icon: User },
] as const
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1">{children}</main>
      <nav className="sticky bottom-0 z-50 border-t bg-background/80 backdrop-blur-lg">
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
                    isCreate && "relative",
                  )}
                >
                  <Icon
                  className={cn(
                      "size-5",
                      isCreate && "size-7 text-primary",
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
    </div>
  )
}
