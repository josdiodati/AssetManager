import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public paths — always allow
  if (pathname.startsWith('/login') || pathname.startsWith('/accept') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Not authenticated → redirect to login
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = session.user.role

  // Super admin only
  if (pathname.startsWith('/admin/tenants') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Not for CLIENT_ADMIN
  const noClientAdmin = ['/import', '/admin/asset-types', '/admin/brands', '/admin/locations', '/admin/templates', '/admin/config']
  if (noClientAdmin.some(p => pathname.startsWith(p)) && role === 'CLIENT_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
