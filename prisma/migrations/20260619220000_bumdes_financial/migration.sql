-- CreateTable
CREATE TABLE "bumdes_financial_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "record_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bumdes_financial_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bumdes_financial_records_tenant_id_unit_id_record_date_idx" ON "bumdes_financial_records"("tenant_id", "unit_id", "record_date");

-- AddForeignKey
ALTER TABLE "bumdes_financial_records" ADD CONSTRAINT "bumdes_financial_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bumdes_financial_records" ADD CONSTRAINT "bumdes_financial_records_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "bumdes_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
