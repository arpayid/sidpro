import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'users.read', name: 'Read Users', module: 'users' },
  { code: 'users.create', name: 'Create Users', module: 'users' },
  { code: 'users.update', name: 'Update Users', module: 'users' },
  { code: 'users.delete', name: 'Delete Users', module: 'users' },
  { code: 'roles.read', name: 'Read Roles', module: 'roles' },
  { code: 'roles.create', name: 'Create Roles', module: 'roles' },
  { code: 'roles.update', name: 'Update Roles', module: 'roles' },
  { code: 'permissions.read', name: 'Read Permissions', module: 'permissions' },
  { code: 'settings.manage', name: 'Manage Settings', module: 'settings' },
  { code: 'audit.read', name: 'Read Audit Logs', module: 'audit' },
  { code: 'population.read', name: 'Read Population', module: 'population' },
  { code: 'population.create', name: 'Create Population', module: 'population' },
  { code: 'population.update', name: 'Update Population', module: 'population' },
  { code: 'population.delete', name: 'Delete Population', module: 'population' },
  { code: 'population.import', name: 'Import Population', module: 'population' },
  { code: 'population.export', name: 'Export Population', module: 'population' },
  { code: 'population.view_sensitive', name: 'View Sensitive Population Data', module: 'population' },
  { code: 'families.read', name: 'Read Families', module: 'families' },
  { code: 'families.create', name: 'Create Families', module: 'families' },
  { code: 'families.update', name: 'Update Families', module: 'families' },
  { code: 'families.delete', name: 'Delete Families', module: 'families' },
  { code: 'letters.read', name: 'Read Letters', module: 'letters' },
  { code: 'letters.create', name: 'Create Letters', module: 'letters' },
  { code: 'letters.verify', name: 'Verify Letters', module: 'letters' },
  { code: 'letters.approve', name: 'Approve Letters', module: 'letters' },
  { code: 'letters.reject', name: 'Reject Letters', module: 'letters' },
  { code: 'letters.sign', name: 'Sign Letters', module: 'letters' },
  { code: 'letters.generate', name: 'Generate Letters', module: 'letters' },
  { code: 'letters.download', name: 'Download Letters', module: 'letters' },
  { code: 'letters.manage', name: 'Manage Letter Types', module: 'letters' },
  { code: 'complaints.read', name: 'Read Complaints', module: 'complaints' },
  { code: 'complaints.create', name: 'Create Complaints', module: 'complaints' },
  { code: 'complaints.assign', name: 'Assign Complaints', module: 'complaints' },
  { code: 'complaints.respond', name: 'Respond Complaints', module: 'complaints' },
  { code: 'complaints.close', name: 'Close Complaints', module: 'complaints' },
  { code: 'finance.read', name: 'Read Finance', module: 'finance' },
  { code: 'finance.manage', name: 'Manage Finance', module: 'finance' },
  { code: 'assets.read', name: 'Read Assets', module: 'assets' },
  { code: 'assets.manage', name: 'Manage Assets', module: 'assets' },
  { code: 'aid.read', name: 'Read Aid', module: 'aid' },
  { code: 'aid.manage', name: 'Manage Aid', module: 'aid' },
  { code: 'development.read', name: 'Read Development', module: 'development' },
  { code: 'development.manage', name: 'Manage Development', module: 'development' },
  { code: 'cms.read', name: 'Read CMS', module: 'cms' },
  { code: 'cms.manage', name: 'Manage CMS', module: 'cms' },
  { code: 'reports.read', name: 'Read Reports', module: 'reports' },
  { code: 'reports.export', name: 'Export Reports', module: 'reports' },
];

const LETTER_TYPES = [
  { code: 'SKD', name: 'Surat Keterangan Domisili' },
  { code: 'SKU', name: 'Surat Keterangan Usaha' },
  { code: 'SKCK', name: 'Surat Pengantar SKCK' },
  { code: 'SKTM', name: 'Surat Keterangan Tidak Mampu' },
  { code: 'SKL', name: 'Surat Keterangan Kelahiran' },
  { code: 'SKM', name: 'Surat Keterangan Kematian' },
];

async function main() {
  console.log('Seeding SIDPRO database...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permIds = allPermissions.map((p) => p.id);

  const tenant = await prisma.tenant.upsert({
    where: { code: 'demo-desa' },
    update: {},
    create: {
      name: 'Desa Demo',
      code: 'demo-desa',
      status: 'active',
    },
  });

  await prisma.village.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DEMO001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Desa Demo Makmur',
      code: 'DEMO001',
      address: 'Jl. Raya Desa No. 1',
      province: 'Sulawesi Selatan',
      regency: 'Kabupaten Demo',
      district: 'Kecamatan Demo',
      postalCode: '90000',
      vision: 'Desa Demo Makmur yang mandiri dan sejahtera',
      mission: 'Meningkatkan kesejahteraan masyarakat melalui pelayanan publik yang baik',
      description: 'Desa percontohan untuk pengembangan SIDPRO',
    },
  });

  const roles = [
    { code: 'superadmin_system', name: 'Superadmin Sistem', scope: 'system', tenantId: null },
    { code: 'admin_desa', name: 'Admin Desa', scope: 'tenant', tenantId: tenant.id },
    { code: 'operator_desa', name: 'Operator Desa', scope: 'tenant', tenantId: tenant.id },
    { code: 'warga', name: 'Warga', scope: 'tenant', tenantId: tenant.id },
  ];

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: roleData.tenantId ?? tenant.id, code: roleData.code } },
      update: {},
      create: {
        name: roleData.name,
        code: roleData.code,
        scope: roleData.scope,
        tenantId: roleData.tenantId,
      },
    });

    const permsToAssign =
      roleData.code === 'superadmin_system' || roleData.code === 'admin_desa'
        ? permIds
        : roleData.code === 'operator_desa'
          ? allPermissions
              .filter((p) =>
                ['population', 'families', 'letters', 'complaints', 'cms'].some((m) =>
                  p.module.startsWith(m),
                ),
              )
              .map((p) => p.id)
          : allPermissions
              .filter((p) => ['letters.create', 'complaints.create'].includes(p.code))
              .map((p) => p.id);

    for (const permissionId of permsToAssign) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  const adminRole = await prisma.role.findFirst({
    where: { code: 'admin_desa', tenantId: tenant.id },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo-desa.id' },
    update: {},
    create: {
      email: 'admin@demo-desa.id',
      name: 'Admin Desa Demo',
      passwordHash,
      tenantId: tenant.id,
      status: 'active',
    },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });
  }

  for (const lt of LETTER_TYPES) {
    await prisma.letterType.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: lt.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: lt.code,
        name: lt.name,
        isActive: true,
      },
    });
  }

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'app.theme' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'app.theme',
      value: { primary: 'emerald', name: 'Emerald Government' },
    },
  });

  console.log('Seed completed!');
  console.log('Default admin: admin@demo-desa.id / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
