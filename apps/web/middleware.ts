import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedPaths = ["/feed", "/try-on", "/create", "/wardrobe", "/profile"]
const publicPaths = ["/login", "/register", "/onboarding"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  const token =
    request.cookies.get("auth-token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "")

  const hasLocalStorageToken = request.cookies.get("auth-storage")?.value

  let isAuthenticated = !!token

  if (!isAuthenticated && hasLocalStorageToken && hasLocalStorageToken !== "undefined") {
    try {
      // Handle potential URI encoding
      const decoded = hasLocalStorageToken.includes("%") 
        ? decodeURIComponent(hasLocalStorageToken) 
        : hasLocalStorageToken
      const parsed = JSON.parse(decoded)
      isAuthenticated = !!parsed?.state?.token
    } catch (e) {
      console.error("Middleware auth parse error:", e)
      isAuthenticated = false
    }
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/feed/:path*",
    "/try-on/:path*",
    "/create/:path*",
    "/wardrobe/:path*",
    "/profile/:path*",
  ],
}
