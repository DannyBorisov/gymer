import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

const protectedRoutes = ["/select-sheet", "/sheet", "/create-program"]
const publicRoutes = ["/"]

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  )
  const isPublicRoute = publicRoutes.includes(path)

  const session = await auth()

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/", request.nextUrl))
  }

  if (isPublicRoute && session && path === "/") {
    return NextResponse.redirect(new URL("/select-sheet", request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
