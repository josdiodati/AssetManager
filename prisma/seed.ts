import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// Map from category code to categoryId — resolved at runtime
const CATEGORY_CODE_MAP: Record<string, string> = {}

async function resolveCategoryId(code: string): Promise<string> {
  if (CATEGORY_CODE_MAP[code]) return CATEGORY_CODE_MAP[code]
  const cat = await prisma.assetCategory.findUnique({ where: { code } })
  if (!cat) throw new Error(`AssetCategory with code "${code}" not found`)
  CATEGORY_CODE_MAP[code] = cat.id
  return cat.id
}

async function main() {
  console.log('Seeding database...')

  // ── Super Admin ──────────────────────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash('Admin123!', 12)
  await prisma.user.upsert({
    where: { email: 'superadmin@assetmanager.internal' },
    update: {},
    create: {
      email: 'superadmin@assetmanager.internal',
      name: 'Super Admin',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      language: 'es',
    },
  })
  console.log('✓ Super Admin: superadmin@assetmanager.internal')

  // ── Demo Tenant ──────────────────────────────────────────────────────────
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Cliente',
      slug: 'demo',
      config: {
        assetTagPrefix: 'DEMO',
        assetTagFormat: '{PREFIX}-{TYPE}-{SEQ:4}',
        defaultLanguage: 'es',
        visibleBlocks: ['general', 'technical', 'history'],
      },
    },
  })
  console.log('✓ Tenant:', demoTenant.name)

  // ── Internal Admin ───────────────────────────────────────────────────────
  const internalPassword = await bcrypt.hash('Admin123!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@assetmanager.internal' },
    update: {},
    create: {
      email: 'admin@assetmanager.internal',
      name: 'Admin Interno',
      passwordHash: internalPassword,
      role: UserRole.INTERNAL_ADMIN,
      language: 'es',
    },
  })
  console.log('✓ Internal Admin: admin@assetmanager.internal')

  // ── Client Admin ─────────────────────────────────────────────────────────
  const clientPassword = await bcrypt.hash('Admin123!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin Demo',
      passwordHash: clientPassword,
      role: UserRole.CLIENT_ADMIN,
      tenantId: demoTenant.id,
      language: 'es',
    },
  })
  console.log('✓ Client Admin: admin@demo.com')

  // ── Global Asset Types ───────────────────────────────────────────────────
  const assetTypeDefs = [
    { name: 'Laptop',          categoryCode: 'TERMINAL',       requiresApproval: false, allowsPerson: true,
      fields: ['hostname','os','cpu','ram','storageCapacity','macAddress','warrantyExpiresAt','eolDate'] },
    { name: 'Desktop',         categoryCode: 'TERMINAL',       requiresApproval: false, allowsPerson: true,
      fields: ['hostname','os','cpu','ram','storageCapacity','ipAddress','macAddress','warrantyExpiresAt'] },
    { name: 'Servidor',        categoryCode: 'INFRASTRUCTURE', requiresApproval: true,  allowsPerson: false,
      fields: ['hostname','os','cpu','ram','storageCapacity','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Monitor',         categoryCode: 'PERIPHERAL',     requiresApproval: false, allowsPerson: true,
      fields: ['warrantyExpiresAt'] },
    { name: 'Impresora',       categoryCode: 'PERIPHERAL',     requiresApproval: false, allowsPerson: false,
      fields: ['ipAddress','macAddress','firmwareVersion','warrantyExpiresAt'] },
    { name: 'Switch',          categoryCode: 'NETWORKING',     requiresApproval: true,  allowsPerson: false,
      fields: ['hostname','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Router',          categoryCode: 'NETWORKING',     requiresApproval: true,  allowsPerson: false,
      fields: ['hostname','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Storage',         categoryCode: 'STORAGE',        requiresApproval: true,  allowsPerson: false,
      fields: ['hostname','storageCapacity','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Cámara',          categoryCode: 'PERIPHERAL',     requiresApproval: false, allowsPerson: false,
      fields: ['ipAddress','macAddress','firmwareVersion','warrantyExpiresAt'] },
    { name: 'Virtual Machine', categoryCode: 'VIRTUAL',        requiresApproval: true,  allowsPerson: false,
      fields: ['hostname','os','cpu','ram','storageCapacity','ipAddress'] },
  ]

  for (const at of assetTypeDefs) {
    const categoryId = await resolveCategoryId(at.categoryCode)
    const existing = await prisma.assetType.findFirst({ where: { name: at.name, tenantId: null } })
    if (!existing) {
      await prisma.assetType.create({
        data: {
          name: at.name,
          categoryId,
          requiresApproval: at.requiresApproval,
          allowsPersonAssignment: at.allowsPerson,
          fieldConfig: { show: at.fields },
        },
      })
    }
  }
  console.log('✓ Asset types seeded')

  // ── Monitoring Templates ───────────────────────────────────────────────
  const monitoringTemplates = [
    {
      assetTypeName: 'Linux Server',
      zabbixTemplateName: 'Linux by Zabbix agent active',
      protocol: 'AGENT' as const,
      defaultPort: 10050,
      snmpCommunity: null,
      description: 'Servers and VMs running Linux (Ubuntu, Debian, RHEL, etc.)',
      tier: 1,
    },
    {
      assetTypeName: 'Windows Server',
      zabbixTemplateName: 'Windows by Zabbix agent active',
      protocol: 'AGENT' as const,
      defaultPort: 10050,
      snmpCommunity: null,
      description: 'Servers and VMs running Windows Server',
      tier: 1,
    },
    {
      assetTypeName: 'Network Switch',
      zabbixTemplateName: 'Interfaces Simple by SNMP',
      protocol: 'SNMP' as const,
      defaultPort: 161,
      snmpCommunity: '{$SNMP_COMMUNITY}',
      description: 'Generic managed switches (non-UniFi)',
      tier: 1,
    },
    {
      assetTypeName: 'Router',
      zabbixTemplateName: 'Interfaces Simple by SNMP',
      protocol: 'SNMP' as const,
      defaultPort: 161,
      snmpCommunity: '{$SNMP_COMMUNITY}',
      description: 'Generic routers (non-UniFi)',
      tier: 1,
    },
    {
      assetTypeName: 'Monitoreador',
      zabbixTemplateName: 'Linux by Zabbix agent active',
      protocol: 'AGENT' as const,
      defaultPort: 10050,
      snmpCommunity: null,
      description: 'Raspberry Pi or VM monitoring probes',
      tier: 1,
    },
    {
      assetTypeName: 'UniFi Switch (USW)',
      zabbixTemplateName: 'Ubiquiti AirOS by SNMP',
      protocol: 'SNMP' as const,
      defaultPort: 161,
      snmpCommunity: '{$SNMP_COMMUNITY}',
      description: 'UniFi switches: USW-Lite, USW-Pro, USW-Enterprise',
      tier: 1,
    },
    {
      assetTypeName: 'UniFi Gateway (UDM/USG)',
      zabbixTemplateName: 'Ubiquiti AirOS by SNMP',
      protocol: 'SNMP' as const,
      defaultPort: 161,
      snmpCommunity: '{$SNMP_COMMUNITY}',
      description: 'UniFi gateways: UDM, UDM-Pro, USG, USG-Pro',
      tier: 1,
    },
    {
      assetTypeName: 'UniFi Access Point (UAP)',
      zabbixTemplateName: 'Ubiquiti AirOS by SNMP',
      protocol: 'SNMP' as const,
      defaultPort: 161,
      snmpCommunity: '{$SNMP_COMMUNITY}',
      description: 'UniFi access points: UAP, U6, U7 series',
      tier: 1,
    },
  ]

  await prisma.monitoringTemplate.deleteMany()
  await prisma.monitoringTemplate.createMany({
    data: monitoringTemplates,
  })

  const monitoringTemplateCount = await prisma.monitoringTemplate.count()
  if (monitoringTemplateCount !== monitoringTemplates.length) {
    throw new Error(`Expected ${monitoringTemplates.length} monitoring templates, found ${monitoringTemplateCount}`)
  }
  console.log(`✓ Monitoring templates seeded (${monitoringTemplateCount})`)

  // ── Demo Location ────────────────────────────────────────────────────────
  const existingLoc = await prisma.location.findFirst({
    where: { tenantId: demoTenant.id, site: 'Oficina Central' }
  })
  if (!existingLoc) {
    await prisma.location.create({
      data: { tenantId: demoTenant.id, site: 'Oficina Central', area: 'IT', detail: 'Piso 2' },
    })
  }
  console.log('✓ Demo location seeded')

  console.log('\n✅ Seed complete!')
  console.log('\nCredentials:')
  console.log('  Super Admin:    superadmin@assetmanager.internal / Admin123!')
  console.log('  Internal Admin: admin@assetmanager.internal / Admin123!')
  console.log('  Client Admin:   admin@demo.com / Admin123!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
