-- BUMDes foundation (Post-MVP Wave 23)
CREATE TABLE "bumdes_units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "business_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bumdes_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bumdes_units_tenant_id_code_key" ON "bumdes_units"("tenant_id", "code");
CREATE INDEX "bumdes_units_tenant_id_status_idx" ON "bumdes_units"("tenant_id", "status");

ALTER TABLE "bumdes_units" ADD CONSTRAINT "bumdes_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
