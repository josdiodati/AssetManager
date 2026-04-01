# AssetManager

A multi-tenant IT Asset Management web application built for internal operations teams. Tracks hardware and software assets across multiple client organizations, manages assignments, handles acceptance workflows, and surfaces warranty/EOL alerts.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Multi-Tenancy](#multi-tenancy)
  - [Roles](#roles)
- [Features](#features)
- [Core Flows](#core-flows)
  - [Asset Lifecycle](#asset-lifecycle)
  - [Assignment Flow](#assignment-flow)
  - [Acceptance Flow](#acceptance-flow)
  - [Approval Flow](#approval-flow)
- [Alerts](#alerts)
- [Audit Log](#audit-log)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Seed Credentials](#seed-credentials)
- [Infrastructure](#infrastructure)

---

## Overview

AssetManager is a full-stack web application that helps IT teams manage the lifecycle of physical and virtual assets across one or more client organizations (tenants). It supports asset tracking, person assignment, digital acceptance signatures, warranty/EOL monitoring, audit trails, bulk import/export, and printable QR labels.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Auth | Auth.js v5 (Credentials provider, JWT sessions) |
| Email | Resend |
| PDF generation | @react-pdf/renderer |
| Runtime | Node.js 22 (via nvm) |
| Package manager | pnpm |
| Process manager | PM2 |
| Tunnel | Cloudflare Tunnel |

---

## Architecture

### Multi-Tenancy

AssetManager uses a **shared-schema, tenant-scoped** multi-tenant model. All tenants share the same database and tables. Every tenant-owned record carries a `tenantId` foreign key. All queries are automatically filtered by tenant context derived from the authenticated session.

The only global (cross-tenant) records are:
- **Brands** and **Models** — shared catalog, visible to all tenants
- **Users with role `SUPER_ADMIN`** — platform-wide operators with no tenant binding

### Roles

| Role | Scope | Capabilities |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide | All tenants, all data, tenant management, user management |
| `INTERNAL_ADMIN` | Assigned tenant | Asset management, user management within tenant, config |
| `CLIENT_ADMIN` | Own tenant | Read/manage assets and persons within own tenant |

Role enforcement is applied at two layers:
1. **Middleware (`proxy.ts`)** — route-level protection before the page renders
2. **Server Actions** — session is checked inside every data mutation

---

## Features

### Assets
- Create, edit, view, soft-delete assets
- Tabbed form: **General** (tag, type, brand, model, status, condition) / **Technical** (hostname, OS, CPU, RAM, storage, IP, MAC, firmware, antivirus, warranty, EOL) / **Financial** (provider, invoice, purchase info)
- Asset status: `AVAILABLE`, `ASSIGNED`, `PENDING_APPROVAL`, `IN_REPAIR`, `ON_LOAN`, `OBSOLETE`, `LOST`, `STOLEN`, `DECOMMISSIONED`
- Asset conditions: `NEW`, `GOOD`, `FAIR`, `POOR`
- Per-asset QR token for quick lookup via `/asset/[token]`
- Printable QR label page (`/print/assets/[id]/label`)
- Image and document attachments (stored as base64 in DB)
- Paginated list with server-side filters by status, asset type, and free-text search
- Excel export (`/api/export/assets`)
- Bulk import via CSV/XLSX (`/api/import/assets`)

### Persons
- People who receive assets (not platform users — no login)
- Fields: name, email, area, position, location, hire date, notes
- Linked to a tenant
- Full CRUD with soft-delete

### Admin
- **Tenants** (`SUPER_ADMIN` only): create and manage client organizations
- **Users**: create platform users, assign roles and tenants
- **Asset Types**: define custom asset categories with flags (`requiresApproval`, `allowsPersonAssignment`) and custom field config
- **Brands & Models**: global brand catalog with model tree (shared across tenants)
- **Locations**: tenant-scoped physical locations (site → area → detail)
- **Templates**: per-tenant email templates for acceptance workflows (HTML body, subject, language)
- **Config**: tenant-level configuration via JSON

### Dashboard
- KPI cards: total assets, by-status breakdown, recent activity

### Alerts
- Proactive monitoring of:
  - **Warranty expiring within 30 days**
  - **EOL date within 60 days**
  - **Warranty already expired** (asset still active)
- Per-category counters with color-coded tables
- Header bell badge shows **new alerts since last visit** (cookie-based seen-count tracking — badge clears when you open the alerts page)

### Audit Log
- Full tamper-evident log of all create/update/delete actions
- Captures: entity type, entity ID, action, before/after JSON snapshot, user, IP, source (WEB / IMPORT / SYSTEM)
- Filterable audit viewer at `/audit`

### Notifications
- Notification records per tenant for sent emails (acceptance, approval, reminders)
- Status tracking: `PENDING`, `SENT`, `DELIVERED`, `ERROR`, `BOUNCED`

### Import / Export
- **Export**: download all tenant assets as an Excel file
- **Import**: upload CSV/XLSX to bulk-create assets with validation

---

## Core Flows

### Asset Lifecycle

```
AVAILABLE
   │
   ├─► [assign to person] ──────────────► ASSIGNED
   │        │                                 │
   │        └─ (requiresApproval=true) ──► PENDING_APPROVAL
   │                                          │
   │                                   approved/rejected
   │
   ├─► [send to repair] ────────────────► IN_REPAIR
   ├─► [loan out] ──────────────────────► ON_LOAN
   ├─► [retire] ────────────────────────► OBSOLETE / DECOMMISSIONED
   └─► [report loss/theft] ─────────────► LOST / STOLEN
```

### Assignment Flow

1. Admin opens an asset and assigns it to a Person
2. If the Asset Type has `requiresApproval = true`, status becomes `PENDING_APPROVAL` and an `ApprovalEvent` is logged
3. An authorized user (SUPER_ADMIN or INTERNAL_ADMIN) approves or rejects
4. On approval, status transitions to `ASSIGNED`
5. An `AssignmentHistory` record is created for every assign/unassign/reassign action

### Acceptance Flow

After an asset is assigned, the admin can trigger the acceptance flow:

1. Admin initiates acceptance → system generates a unique `AcceptanceToken` (UUID) with an expiry date
2. Email is sent to the person via **Resend** using the tenant's configured template
3. Email contains a secure link: `https://acceptance.kawellu.com.ar/accept/[token]`
4. Person opens the link (publicly accessible — no login required) and sees a summary of the asset they're receiving
5. Person clicks **Accept** or **Reject**
6. On acceptance:
   - `AcceptanceToken.acceptedAt` is stamped
   - Asset's `acceptanceStatus` → `ACCEPTED`
   - A PDF is generated (using the tenant's `PdfTemplate`) and stored as an `AssetDocument`
   - PDF is attached to a confirmation email sent to the person
7. The acceptance page is only exposed via **Cloudflare Tunnel** at `/accept/*` — all other routes are blocked externally (403)

### Approval Flow

Certain asset types require manager approval before assignment is confirmed:

1. Assignment is created → asset enters `PENDING_APPROVAL`
2. An `ApprovalEvent` with action `SUBMITTED` is recorded
3. Authorized user reviews and approves or rejects in the app
4. `ApprovalEvent` with action `APPROVED` or `REJECTED` is recorded
5. Asset status updates accordingly

---

## Alerts

Alerts are computed live from asset data on every page load. No separate alert records are stored.

| Alert Type | Condition |
|---|---|
| Warranty expiring | `warrantyExpiresAt` between now and +30 days |
| EOL approaching | `eolDate` between now and +60 days |
| Warranty expired | `warrantyExpiresAt` < now AND status not DECOMMISSIONED/OBSOLETE |

The header bell badge shows the **delta** between the current alert count and the last count the user saw. Visiting `/alerts` sets a `alerts_seen_count` cookie — the badge resets to 0 and only lights up again when new alerts appear.

---

## Audit Log

Every significant mutation (create / update / delete) generates an `AuditLog` record:

```
AuditLog {
  tenantId    — scoped to tenant
  userId      — who did it
  entityType  — e.g. "Asset", "Person", "User"
  entityId    — UUID of the affected record
  action      — e.g. "CREATE", "UPDATE", "DELETE"
  beforeData  — JSON snapshot before the change
  afterData   — JSON snapshot after the change
  ipAddress   — client IP
  source      — WEB | IMPORT | SYSTEM
  createdAt   — timestamp
}
```

---

## Data Model

### Core entities

```
Tenant ──< User
Tenant ──< Person
Tenant ──< Asset
Tenant ──< Location
Tenant ──< AssetType
Tenant ──< AcceptanceTemplate
Tenant ──< PdfTemplate
Tenant ──< Notification
Tenant ──< AuditLog

Brand ──< Model
Brand ──< Asset
Model ──< Asset

Asset ──< AssetImage
Asset ──< AssetAttachment
Asset ──< AssignmentHistory
Asset ──< ApprovalEvent
Asset ──< AcceptanceToken
Asset ──< AssetDocument
Asset ──< Notification

Person ──< Asset (assigned)
Person ──< AssignmentHistory
Person ──< AcceptanceToken

User ──< Asset (createdBy)
User ──< AssignmentHistory (performedBy)
User ──< ApprovalEvent (performedBy)
User ──< AuditLog
```

### Key enums

- **AssetStatus**: AVAILABLE, ASSIGNED, PENDING_APPROVAL, IN_REPAIR, ON_LOAN, OBSOLETE, LOST, STOLEN, DECOMMISSIONED
- **AssetCondition**: NEW, GOOD, FAIR, POOR
- **AcceptanceStatus**: NOT_SENT, PENDING, ACCEPTED, REJECTED, BOUNCED, ERROR
- **ApprovalStatus**: NOT_REQUIRED, PENDING, APPROVED, REJECTED
- **UserRole**: SUPER_ADMIN, INTERNAL_ADMIN, CLIENT_ADMIN
- **AssetCategory**: INFRASTRUCTURE, TERMINAL, PERIPHERAL, STORAGE, VIRTUAL, NETWORKING, OTHER

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                  # Authenticated app shell
│   │   ├── layout.tsx          # Root layout: sidebar + header + SidebarProvider
│   │   ├── dashboard/          # KPI dashboard
│   │   ├── assets/             # Asset list, create, edit, detail
│   │   │   └── [id]/           # Asset detail + edit
│   │   ├── persons/            # Persons CRUD
│   │   ├── alerts/             # Warranty / EOL alert views
│   │   ├── audit/              # Audit log viewer
│   │   ├── notifications/      # Notification history
│   │   ├── import/             # Bulk import UI
│   │   └── admin/
│   │       ├── tenants/        # Tenant management (SUPER_ADMIN)
│   │       ├── users/          # User management
│   │       ├── asset-types/    # Asset type config
│   │       ├── brands/         # Brand + model tree
│   │       ├── locations/      # Location management
│   │       ├── templates/      # Email acceptance templates
│   │       └── config/         # Tenant config
│   ├── accept/[token]/         # Public acceptance page (no auth)
│   ├── asset/[token]/          # Public QR lookup page (no auth)
│   ├── print/assets/[id]/label # Printable QR label
│   ├── login/                  # Login page
│   └── api/
│       ├── auth/               # Auth.js handler
│       ├── documents/[id]/     # Document download
│       ├── export/assets/      # Excel export
│       └── import/assets/      # Bulk import
│
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         # Responsive sidebar (desktop static / mobile drawer)
│   │   ├── sidebar-context.tsx # Sidebar open/close React context
│   │   └── header.tsx          # Top bar with hamburger, alerts bell, user menu
│   └── ui/                     # shadcn/ui components + custom
│
├── lib/
│   ├── actions/                # Server Actions (one file per entity)
│   │   ├── assets.ts
│   │   ├── persons.ts
│   │   ├── alerts.ts
│   │   ├── audit.ts
│   │   ├── acceptance.ts
│   │   ├── assignments.ts
│   │   ├── brands.ts
│   │   ├── locations.ts
│   │   ├── tenants.ts
│   │   ├── users.ts
│   │   ├── asset-types.ts
│   │   ├── templates.ts
│   │   ├── config.ts
│   │   └── dashboard.ts
│   ├── auth.ts                 # Auth.js config + session helpers
│   ├── prisma.ts               # Prisma client singleton
│   ├── email.ts                # Resend email dispatch
│   ├── acceptance-pdf.tsx      # React-PDF acceptance document component
│   ├── generate-acceptance-pdf.ts  # PDF generation + storage
│   ├── pdf-template-defaults.ts    # Default PDF clause structure
│   ├── email-defaults.ts           # Default email template content
│   └── utils.ts
│
├── proxy.ts                    # Next.js middleware: route protection by role
│
prisma/
├── schema.prisma               # Full data model (17 models)
└── seed.ts                     # Dev seed: tenants, users, sample assets
```

---

## Getting Started

### Prerequisites

- Node.js 22+ (via nvm recommended)
- pnpm
- PostgreSQL 16 (Docker recommended)
- Resend account (for email)

### Environment Variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URL=postgresql://devuser:devpass@localhost:5432/devdb

# Auth.js
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
ACCEPTANCE_BASE_URL=http://localhost:3000   # Public URL for /accept/* links

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### Database Setup

```bash
# Start PostgreSQL (Docker)
docker compose -f /opt/docker/compose.yml up -d

# Run migrations
pnpm prisma migrate deploy

# Seed with dev data
pnpm prisma db seed
```

### Running the App

**Development:**
```bash
pnpm dev
```

**Production build:**
```bash
pnpm build
pnpm start
```

**With PM2 (production):**
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Seed Credentials

These users are created by the seed script for local development:

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@assetmanager.internal | Admin123! |
| Internal Admin | admin@assetmanager.internal | Admin123! |
| Client Admin | admin@demo.com | Admin123! |

---


## Monitoring Configuration (YAML source of truth)

Monitoring infrastructure is no longer populated from the admin CRUD views.
The source of truth is the server-side file:

- `config/monitoring.yml`

The left sidebar entry **Monitoreo** remains, but it now acts as an operational/status page that reads and syncs the YAML into the database.

### What the YAML controls

- Global Zabbix URL and API token
- Global Grafana URL
- Per-tenant monitoring integration
- Per-tenant monitoreadores / probes
- Zabbix proxy metadata
- WireGuard endpoint and public key
- Notes for each monitoreador

### Required data to populate a tenant

For each tenant/client, define:

- Tenant reference
  - Prefer `databaseId` from table `Tenant.id`
  - Or use the exact tenant `name`
- Integration data
  - `enabled`
  - `zabbixHostGroupName`
  - optionally tenant-specific Zabbix/Grafana overrides
- One or more probes (`probes[]`)
  - `name`
  - `location`
    - Prefer `databaseId` from table `Location.id`
    - Or use exact `site` + optional `area`
  - `zabbixProxy.name`
  - `zabbixProxy.id`
  - `wireguard.endpoint`
  - `wireguard.publicKey`
  - `notes`

### How to identify tenant and location

Preferred: use database UUIDs.

Examples:

- Tenant ID source: table `Tenant`, column `id`
- Location ID source: table `Location`, column `id`

If you do not use IDs, matching falls back to:

- tenant by exact `name`
- location by exact `site` + `area` within the tenant

### Example

```yaml
version: 1

global:
  zabbix:
    url: http://127.0.0.1:8080
    apiToken: YOUR_ZABBIX_API_TOKEN
  grafana:
    url: http://127.0.0.1:3001

tenants:
  - tenant:
      name: "PO+"
      # databaseId: "tenant-uuid"
    integration:
      enabled: true
      zabbixHostGroupName: "PO+"
    probes:
      - name: "Monitoreador PO+"
        location:
          site: "Central"
          # databaseId: "location-uuid"
        zabbixProxy:
          name: "proxy-po-plus-lan1"
          id: "1"
        wireguard:
          endpoint: "10.13.13.2"
          publicKey: "BASE64_PUBLIC_KEY"
        notes: "Ubuntu VM probe"
```

### Operational flow

1. Edit `config/monitoring.yml` on the app server.
2. Re-open **Admin → Monitoreo** or restart the app.
3. The app syncs YAML → `MonitoringIntegration` + `MonitoringZone` in PostgreSQL.
4. Assets can reference the synced monitoreadores from the existing asset monitoring flow.

### Current production data

The repository/server config already includes the first PO+ monitoreador:

- Tenant: `PO+`
- Probe name: `Monitoreador PO+`
- Zabbix proxy: `proxy-po-plus-lan1` (`id: 1`)
- WireGuard endpoint: `10.13.13.2`


## Infrastructure

### Dev Server
- **Host:** Ubuntu 24.04 LTS VM (192.168.15.88)
- **Process manager:** PM2 (`assetmanager` process, autostart on reboot)
- **Database:** PostgreSQL 16 in Docker (`dev-postgres` container, port 5432 localhost only)
- **Data persistence:** `/opt/postgres-data/`

### Cloudflare Tunnel

The acceptance flow requires the `/accept/*` route to be publicly accessible without exposing the full application. This is handled via a Cloudflare Tunnel:

- **Tunnel name:** `assetmanager`  
- **Public URL:** `https://acceptance.kawellu.com.ar`  
- **Routing:** Only `/accept/*` is forwarded → all other paths return 403  
- **Service:** `cloudflared.service` (systemd, enabled, auto-start)

This means the full app is never exposed to the internet — only the public acceptance endpoint is reachable externally.

---

## Roadmap (Phase 3+)

- [ ] Dashboard KPIs (asset count by status, recent activity charts)
- [ ] Asset assignment UI (assign/unassign flow from asset detail page)
- [ ] Acceptance flow trigger (send acceptance email from UI)
- [ ] Audit log viewer (filterable, paginated)
- [ ] Notifications center
- [ ] Warranty / EOL alert emails (automated)
- [ ] Reports & Excel export (per-tenant)
- [ ] Bulk import improvements (validation report, preview)
