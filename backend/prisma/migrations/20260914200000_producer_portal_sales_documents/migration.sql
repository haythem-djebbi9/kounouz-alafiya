-- CreateEnum
CREATE TYPE "ProducerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CollectionMethod" AS ENUM ('KOUNOUZ_VISIT', 'PRODUCER_DELIVERY');

-- CreateEnum
CREATE TYPE "ProducerDocumentType" AS ENUM ('NATIONAL_ID', 'FARM_REGISTRATION', 'BEEKEEPING_LICENSE', 'TAX_ID', 'PROOF_OF_ADDRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ProducerDocumentStatus" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('ONLINE_STORE', 'MARKETPLACE', 'RETAIL_PARTNER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_REVIEWED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_ORDER';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_PAID';

-- AlterEnum
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "producers" ADD COLUMN     "activity_type" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "annual_production_kg" DECIMAL(10,2),
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "farm_address" TEXT,
ADD COLUMN     "farm_delegation" TEXT,
ADD COLUMN     "farm_governorate" TEXT,
ADD COLUMN     "farm_photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "governorate" TEXT,
ADD COLUMN     "hives_count" INTEGER,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "main_flora" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "national_id" TEXT,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "production_end_month" INTEGER,
ADD COLUMN     "production_start_month" INTEGER,
ADD COLUMN     "registration_number" TEXT,
ADD COLUMN     "registration_status" TEXT,
ADD COLUMN     "status" "ProducerStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_changed_at" TIMESTAMP(3),
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_secret" TEXT;

-- AlterTable
ALTER TABLE "verification_requests" ADD COLUMN     "beekeeping_method" TEXT,
ADD COLUMN     "delegation" TEXT,
ADD COLUMN     "farm_size" TEXT,
ADD COLUMN     "floral_category" TEXT,
ADD COLUMN     "floral_origin" TEXT,
ADD COLUMN     "governorate" TEXT,
ADD COLUMN     "harvest_end_date" TIMESTAMP(3),
ADD COLUMN     "harvest_start_date" TIMESTAMP(3),
ADD COLUMN     "hive_type" TEXT,
ADD COLUMN     "hives_count" INTEGER,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "preferred_collection_method" "CollectionMethod",
ADD COLUMN     "production_season" TEXT,
ADD COLUMN     "request_code" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "producer_documents" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "type" "ProducerDocumentType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "ProducerDocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "review_note" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "shipping_address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL DEFAULT 'ONLINE_STORE',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shipping_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "package_size" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,
    "commission_rate" DECIMAL(5,4) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "order_count" INTEGER NOT NULL,
    "items_sold" INTEGER NOT NULL,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "paid_by" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "producer_documents_producer_id_idx" ON "producer_documents"("producer_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_producer_id_idx" ON "order_items"("producer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_producer_id_period_key" ON "payouts"("producer_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "verification_requests_request_code_key" ON "verification_requests"("request_code");

-- AddForeignKey
ALTER TABLE "producer_documents" ADD CONSTRAINT "producer_documents_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producer_documents" ADD CONSTRAINT "producer_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Données existantes : les producteurs déjà vérifiés sont actifs, et les
-- demandes déjà soumises reçoivent leur identifiant lisible (VR-AAAA-NNN).
UPDATE "producers" SET "status" = 'ACTIVE' WHERE "is_verified" = true;

UPDATE "verification_requests" vr
SET "request_code" = numbered.code,
    "submitted_at" = vr."created_at"
FROM (
  SELECT "id",
         'VR-' || EXTRACT(YEAR FROM "created_at")::int || '-' ||
         LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "created_at") ORDER BY "created_at")::text, 3, '0') AS code
  FROM "verification_requests"
) AS numbered
WHERE vr."id" = numbered."id";
