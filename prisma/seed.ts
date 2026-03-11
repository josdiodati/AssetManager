import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, UserRole, AssetCategory } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

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
  const assetTypes = [
    { name: 'Laptop', category: AssetCategory.TERMINAL, requiresApproval: false, allowsPerson: true,
      fields: ['hostname','os','cpu','ram','storageCapacity','macAddress','warrantyExpiresAt','eolDate'] },
    { name: 'Desktop', category: AssetCategory.TERMINAL, requiresApproval: false, allowsPerson: true,
      fields: ['hostname','os','cpu','ram','storageCapacity','ipAddress','macAddress','warrantyExpiresAt'] },
    { name: 'Servidor', category: AssetCategory.INFRASTRUCTURE, requiresApproval: true, allowsPerson: false,
      fields: ['hostname','os','cpu','ram','storageCapacity','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Monitor', category: AssetCategory.PERIPHERAL, requiresApproval: false, allowsPerson: true,
      fields: ['warrantyExpiresAt'] },
    { name: 'Impresora', category: AssetCategory.PERIPHERAL, requiresApproval: false, allowsPerson: false,
      fields: ['ipAddress','macAddress','firmwareVersion','warrantyExpiresAt'] },
    { name: 'Switch', category: AssetCategory.NETWORKING, requiresApproval: true, allowsPerson: false,
      fields: ['hostname','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Router', category: AssetCategory.NETWORKING, requiresApproval: true, allowsPerson: false,
      fields: ['hostname','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Storage', category: AssetCategory.STORAGE, requiresApproval: true, allowsPerson: false,
      fields: ['hostname','storageCapacity','ipAddress','macAddress','firmwareVersion','warrantyExpiresAt','eolDate'] },
    { name: 'Cámara', category: AssetCategory.PERIPHERAL, requiresApproval: false, allowsPerson: false,
      fields: ['ipAddress','macAddress','firmwareVersion','warrantyExpiresAt'] },
    { name: 'Virtual Machine', category: AssetCategory.VIRTUAL, requiresApproval: true, allowsPerson: false,
      fields: ['hostname','os','cpu','ram','storageCapacity','ipAddress'] },
  ]

  for (const at of assetTypes) {
    const existing = await prisma.assetType.findFirst({ where: { name: at.name, tenantId: null } })
    if (!existing) {
      await prisma.assetType.create({
        data: {
          name: at.name,
          category: at.category,
          requiresApproval: at.requiresApproval,
          allowsPersonAssignment: at.allowsPerson,
          fieldConfig: { show: at.fields },
        },
      })
    }
  }
  console.log('✓ Asset types seeded')

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
