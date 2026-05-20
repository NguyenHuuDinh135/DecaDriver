import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Demo mode: frontend routes are intentionally public.
// Backend endpoints that still require auth will fail at API level, but the UI
// itself should not redirect teachers/students to /login during the demo.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/feed/:path*",
    "/try-on/:path*",
    "/create/:path*",
    "/wardrobe/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
  ],
}
