import { DefaultSession } from 'next-auth'
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      tenantId: string | null
      activeTenantId: string | null
      language: string
    } & DefaultSession['user']
  }
}
