# SIDPRO RBAC Matrix

RBAC SIDPRO memakai kombinasi role, permission, tenant scope, dan optional wilayah scope.

## Roles

- superadmin_system
- admin_desa
- kepala_desa
- sekretaris_desa
- kaur_umum
- kaur_keuangan
- kasi_pemerintahan
- kasi_kesejahteraan
- operator_desa
- rt_rw
- warga
- auditor
- admin_kabupaten

## Core Permissions

```txt
users.read
users.create
users.update
users.disable
users.delete
roles.read
roles.create
roles.update
roles.assign_permissions
permissions.read
settings.manage
audit.read
```

## Domain Permissions

```txt
population.read
population.create
population.update
population.delete
population.import
population.export
population.view_sensitive
families.read
families.create
families.update
families.delete
letters.read
letters.create
letters.verify
letters.approve
letters.reject
letters.sign
letters.generate
letters.download
letters.manage
complaints.read
complaints.create
complaints.assign
complaints.respond
complaints.close
finance.read
finance.manage
assets.read
assets.manage
aid.read
aid.manage
development.read
development.manage
cms.read
cms.manage
reports.read
reports.export
```

## Access Matrix Summary

| Role | Main Access |
|---|---|
| superadmin_system | all system and tenant management |
| admin_desa | all village operations in assigned tenant |
| kepala_desa | dashboard, approval, reports, letters, development |
| sekretaris_desa | administration, letters, reports, validation |
| kaur_umum | letters, files, public services, archives |
| kaur_keuangan | finance and finance reports |
| kasi_pemerintahan | population, families, civil events |
| kasi_kesejahteraan | aid, social programs, development |
| operator_desa | operational input based on assigned permissions |
| rt_rw | limited verification for assigned wilayah |
| warga | own profile, own requests, own complaints |
| auditor | read-only reports and audit scope |
| admin_kabupaten | cross-village monitoring based on assigned tenants |

## Permission Matrix Core

| Permission | Superadmin | Admin Desa | Kepala Desa | Sekdes | Operator | Warga |
|---|---|---|---|---|---|---|
| users.read | yes | yes | no | no | no | no |
| users.create | yes | yes | no | no | no | no |
| users.update | yes | yes | no | no | no | no |
| users.disable | yes | yes | no | no | no | no |
| roles.read | yes | yes | no | no | no | no |
| roles.assign_permissions | yes | yes | no | no | no | no |
| roles.update | yes | yes | no | no | no | no |
| population.read | yes | yes | yes | yes | yes | no |
| population.create | yes | yes | no | yes | yes | no |
| population.update | yes | yes | no | yes | yes | no |
| population.delete | yes | yes | no | no | no | no |
| letters.create | yes | yes | yes | yes | yes | yes |
| letters.verify | yes | yes | no | yes | yes | no |
| letters.approve | yes | yes | yes | yes | no | no |
| complaints.create | yes | yes | yes | yes | yes | yes |
| complaints.respond | yes | yes | yes | yes | yes | no |
| reports.export | yes | yes | yes | yes | limited | no |
| audit.read | yes | yes | limited | limited | no | no |

## Tenant and Scope Rules

- User belongs to one or more tenants.
- Normal village users access only their tenant.
- Admin kabupaten can access assigned tenants only.
- RT/RW users can be restricted by hamlet, RT, or RW.
- Warga can access only their own requests and complaints.

## Implementation Notes

- Use permission guard for protected API.
- Use tenant resolver on every tenant-owned query.
- Use audit log for role, permission, export, and sensitive data actions.
