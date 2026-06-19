import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'users.read', name: 'Read Users', module: 'users' },
  { code: 'users.create', name: 'Create Users', module: 'users' },
  { code: 'users.update', name: 'Update Users', module: 'users' },
  { code: 'users.disable', name: 'Disable Users', module: 'users' },
  { code: 'users.delete', name: 'Delete Users', module: 'users' },
  { code: 'roles.read', name: 'Read Roles', module: 'roles' },
  { code: 'roles.create', name: 'Create Roles', module: 'roles' },
  { code: 'roles.update', name: 'Update Roles', module: 'roles' },
  { code: 'roles.assign_permissions', name: 'Assign Role Permissions', module: 'roles' },
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
  { code: 'families.export', name: 'Export Families', module: 'families' },
  { code: 'families.view_sensitive', name: 'View Sensitive Family Data', module: 'families' },
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
  { code: 'complaints.update', name: 'Update Complaints', module: 'complaints' },
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
  { code: 'reports.population', name: 'Population Reports', module: 'reports' },
  { code: 'reports.letters', name: 'Letters Reports', module: 'reports' },
  { code: 'reports.finance', name: 'Finance Reports', module: 'reports' },
  { code: 'tenants.regency_overview', name: 'Regency Overview Dashboard', module: 'tenants' },
];

const LETTER_TYPES = [
  { code: 'SKD', name: 'Surat Keterangan Domisili' },
  { code: 'SKU', name: 'Surat Keterangan Usaha' },
  { code: 'SKCK', name: 'Surat Pengantar SKCK' },
  { code: 'SKTM', name: 'Surat Keterangan Tidak Mampu' },
  { code: 'SKL', name: 'Surat Keterangan Kelahiran' },
  { code: 'SKM', name: 'Surat Keterangan Kematian' },
];

const DEFAULT_LETTER_TEMPLATE = `Yang bertanda tangan di bawah ini, Kepala {{nama_desa}}, menerangkan bahwa:

Nama        : {{nama_pemohon}}
NIK         : {{nik}}
Alamat      : {{alamat_pemohon}}

Keperluan   : {{keperluan}}

Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.`;

const DEV_DEFAULT_ADMIN_EMAIL = 'admin@demo-desa.id';
const DEV_DEFAULT_ADMIN_PASSWORD = 'Admin123!';

function resolveAdminSeedCredentials(): {
  email: string;
  password: string | null;
  usingDevFallback: boolean;
} {
  const email = process.env.SEED_ADMIN_EMAIL ?? DEV_DEFAULT_ADMIN_EMAIL;
  const explicitPassword = process.env.SEED_ADMIN_PASSWORD;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (explicitPassword) {
    return { email, password: explicitPassword, usingDevFallback: false };
  }

  if (nodeEnv === 'production') {
    return { email, password: null, usingDevFallback: false };
  }

  console.warn(
    '[seed] WARN: SEED_ADMIN_PASSWORD is not set. Using development-only default credentials.',
    'DO NOT use this in staging or production. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD instead.',
  );
  return { email, password: DEV_DEFAULT_ADMIN_PASSWORD, usingDevFallback: true };
}

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
  const desaAdminPermIds = allPermissions
    .filter((p) => p.code !== 'tenants.regency_overview')
    .map((p) => p.id);

  const regencyTenant = await prisma.tenant.upsert({
    where: { code: 'demo-kabupaten' },
    update: { level: 'kabupaten', parentId: null },
    create: {
      name: 'Kabupaten Demo',
      code: 'demo-kabupaten',
      level: 'kabupaten',
      status: 'active',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { code: 'demo-desa' },
    update: { parentId: regencyTenant.id, level: 'desa' },
    create: {
      name: 'Desa Demo',
      code: 'demo-desa',
      level: 'desa',
      parentId: regencyTenant.id,
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

  const hamlet = await prisma.hamlet.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'KRJ' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Dusun Krajan',
      code: 'KRJ',
    },
  });

  for (const unit of [
    { rt: '01', rw: '01' },
    { rt: '02', rw: '01' },
  ]) {
    await prisma.neighborhoodUnit.upsert({
      where: {
        tenantId_hamletId_rt_rw: {
          tenantId: tenant.id,
          hamletId: hamlet.id,
          rt: unit.rt,
          rw: unit.rw,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        hamletId: hamlet.id,
        rt: unit.rt,
        rw: unit.rw,
      },
    });
  }

  const roles = [
    { code: 'superadmin_system', name: 'Superadmin Sistem', scope: 'system', tenantId: null },
    {
      code: 'admin_kabupaten',
      name: 'Admin Kabupaten',
      scope: 'regency',
      tenantId: regencyTenant.id,
    },
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
      roleData.code === 'superadmin_system'
        ? permIds
        : roleData.code === 'admin_desa'
        ? desaAdminPermIds
        : roleData.code === 'admin_kabupaten'
          ? allPermissions
              .filter((p) =>
                [
                  'tenants.regency_overview',
                  'reports.read',
                  'reports.population',
                  'reports.letters',
                  'reports.finance',
                  'audit.read',
                ].includes(p.code),
              )
              .map((p) => p.id)
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

  const { email: adminEmail, password: adminPassword, usingDevFallback } =
    resolveAdminSeedCredentials();

  if (!adminPassword) {
    console.warn(
      '[seed] WARN: Skipping admin user seed. Set SEED_ADMIN_PASSWORD before running seed in staging/production.',
    );
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: {
        email: adminEmail,
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

    if (usingDevFallback) {
      console.log(`[seed] Dev admin ready: ${adminEmail} (development-only — see warning above)`);
    } else {
      console.log(`[seed] Admin user seeded: ${adminEmail}`);
    }

    const regencyAdminRole = await prisma.role.findFirst({
      where: { code: 'admin_kabupaten', tenantId: regencyTenant.id },
    });

    if (regencyAdminRole) {
      const regencyAdminEmail = process.env.SEED_REGENCY_ADMIN_EMAIL ?? 'admin.kab@demo-kabupaten.id';
      const regencyAdminUser = await prisma.user.upsert({
        where: { email: regencyAdminEmail },
        update: { passwordHash },
        create: {
          email: regencyAdminEmail,
          name: 'Admin Kabupaten Demo',
          passwordHash,
          tenantId: regencyTenant.id,
          status: 'active',
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: regencyAdminUser.id, roleId: regencyAdminRole.id } },
        update: {},
        create: { userId: regencyAdminUser.id, roleId: regencyAdminRole.id },
      });

      console.log(`[seed] Regency admin ready: ${regencyAdminEmail}`);
    }
  }

  for (const lt of LETTER_TYPES) {
    const letterType = await prisma.letterType.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: lt.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: lt.code,
        name: lt.name,
        isActive: true,
      },
    });

    const existingTemplate = await prisma.letterTemplate.findFirst({
      where: { tenantId: tenant.id, letterTypeId: letterType.id, isActive: true },
    });
    if (!existingTemplate) {
      await prisma.letterTemplate.create({
        data: {
          tenantId: tenant.id,
          letterTypeId: letterType.id,
          name: `Template ${lt.name}`,
          content: DEFAULT_LETTER_TEMPLATE,
          isActive: true,
        },
      });
    }
  }

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'letters.signatory' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'letters.signatory',
      value: { name: 'Kepala Desa Demo', title: 'Kepala Desa' },
    },
  });

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'letters.pdf' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'letters.pdf',
      value: { maskNik: true },
    },
  });

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'letters.header' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'letters.header',
      value: { useCustom: false },
    },
  });

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'app.theme' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'app.theme',
      value: { primary: 'emerald', name: 'Emerald Government' },
    },
  });

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'village.contact' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'village.contact',
      value: { phone: '(0298) 123456', email: 'info@demo-desa.go.id' },
    },
  });

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'security.require_2fa_admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'security.require_2fa_admin',
      value: { enabled: false },
    },
  });

  const agendaSeeds = [
    {
      title: 'Rapat Koordinasi BPD',
      description: 'Rapat koordinasi Badan Permusyawaratan Desa perihal RKPDes.',
      location: 'Balai Desa',
      startAt: new Date('2026-06-20T09:00:00'),
    },
    {
      title: 'Posyandu Balita',
      description: 'Pemeriksaan kesehatan balita dan imunisasi rutin.',
      location: 'Posyandu Melati',
      startAt: new Date('2026-06-22T08:00:00'),
    },
  ];

  for (const item of agendaSeeds) {
    const existing = await prisma.agenda.findFirst({
      where: { tenantId: tenant.id, title: item.title },
    });
    if (!existing) {
      await prisma.agenda.create({
        data: {
          tenantId: tenant.id,
          title: item.title,
          description: item.description,
          location: item.location,
          startAt: item.startAt,
          status: 'scheduled',
        },
      });
    }
  }

  const residentCount = await prisma.resident.count({ where: { tenantId: tenant.id } });
  if (residentCount === 0) {
    const demoResidents = [
      {
        nik: '7301010101010001',
        fullName: 'Ahmad Wijaya',
        gender: 'male',
        birthPlace: 'Makassar',
        birthDate: new Date('1990-05-15'),
      },
      {
        nik: '7301010101010002',
        fullName: 'Siti Rahmawati',
        gender: 'female',
        birthPlace: 'Makassar',
        birthDate: new Date('1992-08-20'),
      },
    ];

    for (const resident of demoResidents) {
      await prisma.resident.create({
        data: {
          tenantId: tenant.id,
          ...resident,
          residentStatus: 'permanent',
        },
      });
    }

    const head = await prisma.resident.findFirst({
      where: { tenantId: tenant.id, nik: '7301010101010001' },
    });
    if (head) {
      const family = await prisma.family.create({
        data: {
          tenantId: tenant.id,
          kkNumber: '7301010101010001',
          headResidentId: head.id,
        },
      });
      await prisma.resident.update({
        where: { id: head.id },
        data: { familyId: family.id },
      });
      await prisma.familyMember.create({
        data: {
          tenantId: tenant.id,
          familyId: family.id,
          residentId: head.id,
          relationship: 'Kepala Keluarga',
          isHead: true,
        },
      });
    }
  }

  const postCount = await prisma.post.count({ where: { tenantId: tenant.id } });
  if (postCount === 0) {
    await prisma.post.create({
      data: {
        tenantId: tenant.id,
        title: 'Desa Demo Luncurkan Portal Layanan Digital',
        slug: 'desa-demo-luncurkan-portal',
        excerpt: 'Pemerintah desa resmi meluncurkan portal layanan digital SIDPRO.',
        content:
          'Pemerintah Desa Demo Makmur meluncurkan portal layanan digital untuk mempercepat pelayanan administrasi warga.',
        category: 'Pengumuman',
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  const galleryCount = await prisma.galleryItem.count({ where: { tenantId: tenant.id } });
  if (galleryCount === 0) {
    await prisma.galleryItem.createMany({
      data: [
        {
          tenantId: tenant.id,
          title: 'Gotong Royong Bersih Desa',
          description: 'Kegiatan bersih-bersih lingkungan bersama warga.',
          type: 'image',
        },
        {
          tenantId: tenant.id,
          title: 'Rapat Koordinasi BPD',
          description: 'Rapat perencanaan pembangunan desa.',
          type: 'image',
        },
      ],
    });
  }

  const budgetYear = await prisma.budgetYear.upsert({
    where: { tenantId_year: { tenantId: tenant.id, year: 2026 } },
    update: {},
    create: {
      tenantId: tenant.id,
      year: 2026,
      totalBudget: 500000000,
      status: 'active',
    },
  });

  const budgetItemCount = await prisma.budgetItem.count({
    where: { budgetYearId: budgetYear.id },
  });
  if (budgetItemCount === 0) {
    await prisma.budgetItem.createMany({
      data: [
        {
          budgetYearId: budgetYear.id,
          category: 'Pembangunan',
          name: 'Infrastruktur Jalan Desa',
          planned: 150000000,
          realized: 95000000,
        },
        {
          budgetYearId: budgetYear.id,
          category: 'Pemberdayaan',
          name: 'Bantuan UMKM Desa',
          planned: 75000000,
          realized: 45000000,
        },
        {
          budgetYearId: budgetYear.id,
          category: 'Pelayanan',
          name: 'Operasional Kantor Desa',
          planned: 50000000,
          realized: 32000000,
        },
      ],
    });
  }

  const docCount = await prisma.financeDocument.count({
    where: { tenantId: tenant.id, isPublic: true },
  });
  if (docCount === 0) {
    await prisma.financeDocument.create({
      data: {
        tenantId: tenant.id,
        title: 'Laporan Realisasi APBDes 2026 (Semester I)',
        type: 'laporan',
        year: 2026,
        isPublic: true,
      },
    });
  }

  const projectCount = await prisma.developmentProject.count({ where: { tenantId: tenant.id } });
  if (projectCount === 0) {
    await prisma.developmentProject.create({
      data: {
        tenantId: tenant.id,
        code: 'PBG-001',
        name: 'Peningkatan Jalan Lingkungan RT 01',
        location: 'Dusun Krajan',
        budget: 120000000,
        progress: 65,
        status: 'ongoing',
      },
    });
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
