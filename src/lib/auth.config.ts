import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isPublic = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/accept')
      if (isPublic) return true
      if (!isLoggedIn) return false
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId ?? null
        token.language = (user as any).language
        token.activeTenantId = (user as any).tenantId ?? null
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.tenantId = token.tenantId as string | null
      session.user.language = token.language as string
      session.user.activeTenantId = token.activeTenantId as string | null
      return session
    },
  },
  providers: [],
  session: { strategy: 'jwt' },
}
