# CLAUDE.md

## Project
AssetManager is a multi-tenant IT asset management app built with Next.js 16 App Router, TypeScript, Prisma 7, PostgreSQL 16, Auth.js v5, Tailwind CSS v4, and shadcn/ui. It covers asset lifecycle management, assignments, approvals, acceptance flows, audit logs, imports/exports, and monitoring via Zabbix + Grafana.

## Common commands
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm prisma generate`
- `pnpm prisma migrate dev`
- `pnpm prisma db seed`

Use Node 22.

## Architecture
- `src/app/` - Next.js App Router pages
  - `(app)/` authenticated shell
  - `accept/[token]` public asset acceptance
  - `asset/[token]` public QR lookup
  - `print/assets/[id]/label` printable QR label
- `src/lib/actions/` - Server Actions
- `src/lib/auth.ts` - auth helpers
- `src/lib/prisma.ts` - Prisma singleton
- `src/lib/email.ts` - acceptance emails + PDF attachments
- `src/lib/zabbix-client.ts` - Zabbix integration
- `src/proxy.ts` - route protection middleware
- `prisma/schema.prisma` - data model and enums
- `config/monitoring.yml` - monitoring config

## Non-negotiable rules
1. This is shared-schema multi-tenancy. Tenant-owned queries must always scope by the active tenant.
   - `CLIENT_ADMIN` -> `session.user.tenantId`
   - `INTERNAL_ADMIN` -> `session.user.activeTenantId`
   - `SUPER_ADMIN` -> cross-tenant or explicit filter
2. `Brand` and `Model` are global catalogs, not tenant-scoped.
3. Respect soft delete. Filter `deletedAt: null` unless you intentionally need inactive records.
4. Server Actions live in `src/lib/actions/`, start with auth, write `AuditLog` on mutations, and revalidate affected paths.
5. Keep pages server-first. Put interactivity in `*-client.tsx`.
6. Public exposure is restricted. `acceptance.kawellu.com.ar` must only expose `/accept/*`.
7. Monitoring token sync is fragile. Never change the Zabbix API token in only one place. Keep Zabbix, DB, `.env`, and `config/monitoring.yml` aligned.

## Core flows
- Asset lifecycle: `AVAILABLE -> ASSIGNED / PENDING_APPROVAL / IN_REPAIR / ON_LOAN / OBSOLETE / LOST / STOLEN / DECOMMISSIONED`
- Acceptance: generate token -> send email -> public accept/reject -> generate signed PDF
- Approval: some asset types require approval before assignment completes
- Monitoring: tenant config -> Zabbix host sync -> app health/status -> Grafana dashboards

## When changing code
- Prefer small, focused changes.
- Preserve tenant scoping and audit logging.
- If you touch Prisma schema, generate client and include a migration.
- If you touch monitoring config, verify token sync behavior and avoid overwriting live credentials.
- Before shipping, run `pnpm build` and `pnpm lint`.

## Deployment notes
- Production app path: `/opt/projects/assetmanager`
- Process: PM2 `assetmanager`
- Runtime: `pnpm start` on port 3000
