export interface Tenant {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Village {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string | null;
  province?: string | null;
  regency?: string | null;
  district?: string | null;
  postalCode?: string | null;
  vision?: string | null;
  mission?: string | null;
  description?: string | null;
}
