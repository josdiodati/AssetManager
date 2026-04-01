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

## Centralized Monitoring Platform

### Overview

Asset Manager integrates with **Zabbix** and **Grafana** to provide centralized multi-client IT infrastructure monitoring. The goal is to give a single pane of glass for monitoring all client environments from one platform.

Each client site gets a **Monitoring Probe** (Raspberry Pi or VM) deployed on-premises. The probe runs a Zabbix Proxy that collects metrics from local network devices and forwards them through a WireGuard VPN tunnel to the central Zabbix Server.

This architecture allows monitoring devices that are behind NATs, firewalls, and private networks — without requiring any inbound ports on the client side.

### Why Monitoreadores (Monitoring Probes)?

Traditional monitoring requires either:
- Direct network access to every device (not possible across client sites)
- Agents installed on every device (not possible on network equipment)

The **Monitoreador** (monitoring probe) solves this by placing a small device inside each client's network that:

1. **Discovers and polls** local devices via SNMP, ICMP ping, and Zabbix Agent
2. **Tunnels everything** back to the central server through an encrypted WireGuard VPN
3. **Works behind any firewall** — only needs outbound UDP on port 51820
4. **Monitors itself** — CPU, RAM, disk, uptime of the probe are also tracked
5. **Scales per-site** — each location gets its own probe with its own proxy

### Architecture

```
CENTRAL SERVER (AWS — 18.117.185.199)
├── Asset Manager (port 3000)
│   ├── Health semaphore table (real-time Zabbix status)
│   ├── Monitoring detail view (raw Zabbix data per asset)
│   ├── Grafana dashboards (embedded via iframe proxy)
│   └── Auto-creates Zabbix hosts when assets are saved
├── Zabbix Server (port 10051 via WireGuard network)
│   └── Receives metrics from all client proxies
├── Grafana (port 3001, proxied at /grafana/)
│   └── Zabbix datasource + "Monitoreo General" dashboard
└── WireGuard (port 51820/udp)
    └── VPN hub, subnet 10.13.13.0/24

CLIENT SITE (Raspberry Pi or VM — "Monitoreador")
├── WireGuard Client (10.13.13.X)
│   └── Encrypted tunnel to central server
├── Zabbix Proxy (SQLite, active mode)
│   └── Polls local devices, forwards to central via WireGuard
├── Zabbix Agent2 (active mode)
│   └── Monitors the probe itself, reports to LOCAL proxy
└── Client LAN devices
    ├── Routers (SNMP)
    ├── Switches (SNMP)
    ├── Access Points (SNMP)
    └── Servers (Zabbix Agent)
```

**Key networking detail:** All three containers (WireGuard, Proxy, Agent) share the same network stack via `network_mode: service:wireguard`. The Proxy reaches the central server through the WireGuard tunnel. The Agent reaches the Proxy at `127.0.0.1`.

### What Gets Monitored

| Category | Method | Examples |
|---|---|---|
| **Servers / VMs** | Zabbix Agent (active) | CPU, RAM, disk, processes, services, uptime, logs |
| **Network Equipment** | SNMP v2c/v3 | Interface status, traffic, errors, CPU/mem, temperature |
| **UniFi Switches** | SNMP (AirOS template) | Port status, traffic per interface, ICMP, uptime |
| **UniFi Gateways** | SNMP (AirOS template) | WAN status, traffic, interfaces, ICMP, system info |
| **UniFi APs** | SNMP (AirOS template) | Radio status, memory, load, interfaces, ICMP |
| **Any IP device** | ICMP Ping | Reachability, latency, packet loss |
| **The probe itself** | Zabbix Agent | CPU, RAM, disk, uptime (self-monitoring) |

### Health Semaphore

The monitoring overview in Asset Manager shows a real-time health status for each monitored asset, derived from live Zabbix data:

| Status | Meaning | Condition |
|---|---|---|
| 🟢 **Healthy** | Device reachable, no significant problems | Available AND no problems or severity ≤ Information |
| 🟡 **Warning** | Device reachable, minor issues detected | Available AND max severity = Warning or Average |
| 🔴 **Critical** | Device unreachable or major problems | Unavailable OR max severity ≥ High |
| ⚪ **Unknown** | No data yet or device just added | All availability signals unknown |
| ⚫ **Disabled** | Monitoring intentionally turned off | Host disabled in Zabbix |

The health status considers both passive interface availability (`interfaces[].available`) and active agent availability (`host.active_available`) to correctly handle active-mode agents that don't use passive checks.

### Monitoring Templates

Templates define what Zabbix template to assign and what monitoring protocol to use. They are selectable via a dropdown in the asset form:

| Template | Protocol | Zabbix Template | Applies To |
|---|---|---|---|
| Linux Server | Agent (active) | Linux by Zabbix agent active | Linux servers, VMs |
| Windows Server | Agent (active) | Windows by Zabbix agent active | Windows servers |
| Network Switch | SNMP | Interfaces Simple by SNMP | Generic managed switches |
| Router | SNMP | Interfaces Simple by SNMP | Generic routers |
| Monitoreador | Agent (active) | Linux by Zabbix agent active | Raspberry Pi / VM probes |
| UniFi Switch (USW) | SNMP | Ubiquiti AirOS by SNMP | USW-Lite, USW-Pro, USW-Enterprise |
| UniFi Gateway (UDM/USG) | SNMP | Ubiquiti AirOS by SNMP | UDM, UDM-Pro, USG, USG-Pro |
| UniFi Access Point (UAP) | SNMP | Ubiquiti AirOS by SNMP | UAP, U6, U7 series |

### Grafana Dashboards

Grafana is embedded directly into Asset Manager at `/admin/monitoring/dashboards`. The "Monitoreo General" dashboard includes:

- **ICMP Ping Status** — table showing all hosts up/down
- **CPU Usage per host** — time series
- **Available Memory per host** — time series with red/yellow/green thresholds
- **ICMP Response Time / Latency** — time series
- **ICMP Packet Loss** — time series with thresholds
- **Network Traffic In/Out** — time series (bps)
- **Active Problems** — Zabbix triggers panel with severity
- **System Uptime** — table
- **SNMP / Agent Availability** — stat panels with value mappings
- **Interface Operational Status** — table

Grafana is configured with anonymous access (Viewer role) and `allow_embedding = true`. It serves from the sub-path `/grafana/` and is proxied through Next.js rewrites.

---

## Deploying a New Monitoring Probe

This section describes how to deploy a monitoring probe at a new client site from scratch.

### Prerequisites

- A **Raspberry Pi** (4 or 5, any RAM) or a **VM** (Ubuntu 22.04/24.04, minimum 1 vCPU / 1GB RAM)
- **Docker** and **Docker Compose** installed on the probe
- **SSH access** to the probe
- **Outbound UDP port 51820** allowed from the probe to the internet (for WireGuard)
- **LAN access** from the probe to the devices it will monitor (SNMP 161, ICMP, Agent 10050)

### Step 1: Generate WireGuard Peer on Central Server

```bash
ssh ubuntu@18.117.185.199

# Check current peers and note the next available IP
docker exec wireguard wg show wg0

# Generate keys for the new peer
wg genkey | tee /tmp/peer_privkey | wg pubkey > /tmp/peer_pubkey
cat /tmp/peer_pubkey  # You'll need this for the server config

# Edit WireGuard config
sudo nano /opt/monitoring-data/wireguard/wg_confs/wg0.conf

# Add at the end:
# [Peer]
# PublicKey = <contents of /tmp/peer_pubkey>
# AllowedIPs = 10.13.13.X/32   (next available IP)

# Restart WireGuard to apply
docker restart wireguard

# Get the server's public key (needed for probe config)
docker exec wireguard wg show wg0 | grep "public key"
```

### Step 2: Create the Zabbix Proxy

Via Zabbix Web UI (http://localhost:8080) or API:

1. Go to **Administration → Proxies → Create proxy**
2. Set:
   - **Proxy name:** `proxy-CLIENTNAME-lan1` (this MUST match the probe's `PROXY_NAME` exactly)
   - **Proxy mode:** Active
   - **Encryption:** None (WireGuard handles encryption at the transport layer)
3. Save

### Step 3: Prepare the Probe

SSH into the probe and create the deployment directory:

```bash
mkdir -p ~/monitoring-probe/wireguard
cd ~/monitoring-probe
```

Create `docker-compose.yml`:

```yaml
services:
  wireguard:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: ${PROBE_PREFIX:-probe}-wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      PUID: 1000
      PGID: 1000
      TZ: ${TZ:-America/Argentina/Buenos_Aires}
    volumes:
      - ./wireguard:/config
      - /lib/modules:/lib/modules:ro
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped

  zabbix-proxy:
    image: zabbix/zabbix-proxy-sqlite3:7.2-ubuntu-latest
    container_name: ${PROBE_PREFIX:-probe}-zabbix-proxy
    environment:
      ZBX_HOSTNAME: ${PROXY_NAME}
      ZBX_SERVER_HOST: ${ZABBIX_SERVER_WG_IP:-10.13.13.1}
      ZBX_SERVER_PORT: 10051
      ZBX_PROXYMODE: 0
      ZBX_ENABLEREMOTECOMMANDS: 1
      ZBX_LOGREMOTECOMMANDS: 1
      ZBX_DEBUGLEVEL: 3
      ZBX_TIMEOUT: 10
      ZBX_STARTPOLLERS: 20
      ZBX_STARTPINGERS: 5
      ZBX_STARTDISCOVERERS: 3
      ZBX_STARTHTTPPOLLERS: 2
    volumes:
      - ./zabbix-proxy:/var/lib/zabbix
    network_mode: service:wireguard
    depends_on:
      - wireguard
    restart: unless-stopped

  zabbix-agent:
    image: zabbix/zabbix-agent2:7.2-ubuntu-latest
    container_name: ${PROBE_PREFIX:-probe}-zabbix-agent
    environment:
      # ⚠️ CRITICAL: Agent MUST point to the LOCAL proxy (127.0.0.1)
      # NOT the central server (10.13.13.1)!
      # If this is wrong, the agent will report "host not found"
      ZBX_HOSTNAME: ${PROXY_NAME}
      ZBX_SERVER_HOST: 127.0.0.1
      ZBX_SERVER_PORT: 10051
      ZBX_PASSIVE_ALLOW: "false"
    network_mode: service:wireguard
    depends_on:
      - wireguard
    restart: unless-stopped
```

Create `.env`:

```bash
PROXY_NAME=proxy-CLIENTNAME-lan1
PROBE_PREFIX=CLIENTNAME
TZ=America/Argentina/Buenos_Aires
ZABBIX_SERVER_WG_IP=10.13.13.1
```

### Step 4: Configure WireGuard on the Probe

Create `wireguard/wg0.conf`:

```ini
[Interface]
PrivateKey = <PROBE_PRIVATE_KEY_FROM_STEP_1>
Address = 10.13.13.X/32

[Peer]
PublicKey = <CENTRAL_SERVER_PUBLIC_KEY>
Endpoint = 18.117.185.199:51820
AllowedIPs = 10.13.13.0/24
PersistentKeepalive = 25
```

### Step 5: Start the Probe

```bash
cd ~/monitoring-probe
docker compose up -d
```

### Step 6: Verify

From the **central server**:
```bash
# Check WireGuard handshake
docker exec wireguard wg show wg0
# Look for: latest handshake: X seconds ago

# Ping the probe
docker exec wireguard ping -c 1 10.13.13.X
```

From the **probe**:
```bash
# Check proxy is receiving config from server
docker logs CLIENTNAME-zabbix-proxy --tail 10
# Should see: "received configuration data from server"

# Check agent is reporting to local proxy
docker logs CLIENTNAME-zabbix-agent --tail 10
# Should see: "active check configuration update ... is working"
# Should NOT see: "host [proxy-...] not found"
```

### Step 7: Register in Asset Manager

1. **Create a Monitoring Zone** at `/admin/monitoring/zones`:
   - Name: client site name
   - Proxy name: `proxy-CLIENTNAME-lan1` (must match exactly)
   - Link to a Location if desired

2. **Create monitored assets** at `/assets/new`:
   - Fill in asset details (type, brand, model, IP)
   - In the **Monitoring tab**:
     - Enable monitoring ✅
     - Select the zone
     - Select the template from the dropdown (e.g., "UniFi Switch (USW)")
     - Set the monitoring IP (must be reachable from the probe's LAN)
     - Set SNMP community if applicable
   - **Save** → Asset Manager automatically creates the host in Zabbix with the correct template, proxy, interface type, and SNMP community

3. **Verify** at `/admin/monitoring`:
   - The asset should appear in the table
   - Health status updates within 1-2 minutes
   - Click on the asset to see the full monitoring detail

### Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Agent logs: `host [proxy-xxx] not found` | Agent `ZBX_SERVER_HOST` points to central server instead of local proxy | Set `ZBX_SERVER_HOST=127.0.0.1` in the agent environment |
| Agent logs: `cannot connect to 10.13.13.1:10051` | WireGuard tunnel not established or Zabbix Server not reachable via WireGuard | Verify WireGuard handshake, check that `zabbix-server` uses `network_mode: service:wireguard` on the central server |
| No WireGuard handshake | Firewall blocking outbound UDP 51820 | Open outbound UDP 51820 on client's firewall/router |
| SNMP items show "Not supported" | Wrong community string, or device doesn't expose those OIDs | Verify SNMP is enabled on the device, check community string matches |
| Health shows "Unknown" in AM | For active agents: code must read `host.active_available`, not just `interfaces[].available` | Ensure running latest code version |
| Zabbix host creation fails with "proxyid" error | Zabbix 7.2 requires `monitored_by: 1` when assigning a proxy | Ensure running latest code version |
| SNMP device unreachable from probe | Probe is in a different VLAN with no routing | Ensure the probe's default gateway routes to the target VLAN, or add a static route |

### Network & Security Considerations

- **No inbound ports** required on the client side — the probe only needs outbound UDP 51820
- **WireGuard** encrypts all traffic between probe and central server
- **SNMP v2c** is used for network equipment — community string is configured per client
- **Zabbix Agent (active mode)** — the agent initiates all connections, no listening ports needed
- **VLAN routing** — the probe must have network-level access (routing) to the VLANs where monitored devices live. If devices are in different VLANs, the probe's default gateway must be able to route to them
- **Before testing connectivity** to unknown IPs from the probe, always verify routing with `ip route` first. Rapid network commands to unreachable IPs can trigger ARP flood protection on some hypervisors/switches and lock the NIC

## Roadmap (Phase 3+)

- [ ] Dashboard KPIs (asset count by status, recent activity charts)
- [ ] Asset assignment UI (assign/unassign flow from asset detail page)
- [ ] Acceptance flow trigger (send acceptance email from UI)
- [ ] Audit log viewer (filterable, paginated)
- [ ] Notifications center
- [ ] Warranty / EOL alert emails (automated)
- [ ] Reports & Excel export (per-tenant)
- [ ] Bulk import improvements (validation report, preview)

