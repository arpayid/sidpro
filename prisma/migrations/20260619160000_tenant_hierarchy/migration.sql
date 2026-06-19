-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'desa';
ALTER TABLE "tenants" ADD COLUMN "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "tenants_parent_id_level_idx" ON "tenants"("parent_id", "level");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
