-- CreateEnum
CREATE TYPE "QrCodeStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- DropIndex
DROP INDEX "qr_codes_product_id_key";

-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "best_before" TIMESTAMP(3),
ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "harvest_season" TEXT,
ADD COLUMN     "hold_reason" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "origin" TEXT,
ALTER COLUMN "status" SET DEFAULT 'VERIFIED';

-- AlterTable
ALTER TABLE "packagings" ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "packaging_line" TEXT,
ADD COLUMN     "units_planned" INTEGER,
-- Les emballages existants n'ont pas d'horodatage de modification :
-- on les initialise a leur date de creation plutot qu'a "maintenant",
-- pour ne pas les faire passer pour recemment modifies.
ADD COLUMN     "updated_at" TIMESTAMP(3);
UPDATE "packagings" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "packagings" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "net_weight_g" INTEGER,
ADD COLUMN     "shelf_life" TEXT,
ADD COLUMN     "storage_instructions" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "qr_codes" ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "generation_id" TEXT,
ADD COLUMN     "serial_number" TEXT,
ADD COLUMN     "status" "QrCodeStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "packaging_units" (
    "id" TEXT NOT NULL,
    "packaging_id" TEXT NOT NULL,
    "unit_code" TEXT NOT NULL,
    "unit_size" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "packaging_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" "PackagingStatus" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_documents" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_generations" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "product_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "qr_type" TEXT NOT NULL,
    "qr_format" TEXT NOT NULL,
    "destination_url" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packaging_units_unit_code_key" ON "packaging_units"("unit_code");

-- CreateIndex
CREATE INDEX "packaging_units_packaging_id_idx" ON "packaging_units"("packaging_id");

-- CreateIndex
CREATE INDEX "product_documents_product_id_idx" ON "product_documents"("product_id");

-- CreateIndex
CREATE INDEX "qr_generations_batch_id_idx" ON "qr_generations"("batch_id");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE INDEX "qr_codes_product_id_idx" ON "qr_codes"("product_id");

-- CreateIndex
CREATE INDEX "qr_codes_batch_id_idx" ON "qr_codes"("batch_id");

-- CreateIndex
CREATE INDEX "qr_codes_status_idx" ON "qr_codes"("status");

-- AddForeignKey
ALTER TABLE "packaging_units" ADD CONSTRAINT "packaging_units_packaging_id_fkey" FOREIGN KEY ("packaging_id") REFERENCES "packagings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "qr_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_generations" ADD CONSTRAINT "qr_generations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_generations" ADD CONSTRAINT "qr_generations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
