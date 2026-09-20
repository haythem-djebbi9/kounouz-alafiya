-- CreateEnum
CREATE TYPE "LaboratoryStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('VALID', 'SUSPICIOUS', 'INVALID');

-- CreateEnum
CREATE TYPE "CounterfeitAlertType" AS ENUM ('SUSPECTED_DUPLICATE', 'UNUSUAL_LOCATION', 'INVALID_QR', 'TAMPERED_LABEL', 'BULK_SCAN');

-- CreateEnum
CREATE TYPE "CounterfeitAlertStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILED', 'WARNING');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "details" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "module" TEXT,
ADD COLUMN     "status" "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "laboratories" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "LaboratoryStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "website" TEXT;

-- Les lignes existantes ont reçu la date de migration ; la valeur est ensuite
-- gérée par Prisma (@updatedAt).
ALTER TABLE "laboratories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "qr_scans" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country_code" TEXT,
ADD COLUMN     "device_type" TEXT,
ADD COLUMN     "governorate" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "result" "ScanResult" NOT NULL DEFAULT 'VALID',
ADD COLUMN     "scanned_identifier" TEXT,
ADD COLUMN     "visitor_id" TEXT,
ALTER COLUMN "qr_code_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "laboratory_accreditations" (
    "id" TEXT NOT NULL,
    "lab_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuing_body" TEXT,
    "certificate_number" TEXT,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratory_accreditations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterfeit_alerts" (
    "id" TEXT NOT NULL,
    "alert_code" TEXT NOT NULL,
    "type" "CounterfeitAlertType" NOT NULL,
    "status" "CounterfeitAlertStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "qr_code_id" TEXT,
    "scanned_identifier" TEXT,
    "product_id" TEXT,
    "batch_id" TEXT,
    "scan_id" TEXT,
    "location" TEXT,
    "country" TEXT,
    "country_code" TEXT,
    "device_info" TEXT,
    "device_type" TEXT,
    "ip_address" TEXT,
    "scan_count" INTEGER NOT NULL DEFAULT 1,
    "details" TEXT,
    "resolution_note" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counterfeit_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "laboratory_accreditations_lab_id_idx" ON "laboratory_accreditations"("lab_id");

-- CreateIndex
CREATE UNIQUE INDEX "counterfeit_alerts_alert_code_key" ON "counterfeit_alerts"("alert_code");

-- CreateIndex
CREATE INDEX "counterfeit_alerts_type_idx" ON "counterfeit_alerts"("type");

-- CreateIndex
CREATE INDEX "counterfeit_alerts_status_idx" ON "counterfeit_alerts"("status");

-- CreateIndex
CREATE INDEX "counterfeit_alerts_created_at_idx" ON "counterfeit_alerts"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entite_id_idx" ON "audit_logs"("entite_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "qr_scans_scanned_at_idx" ON "qr_scans"("scanned_at");

-- CreateIndex
CREATE INDEX "qr_scans_qr_code_id_idx" ON "qr_scans"("qr_code_id");

-- CreateIndex
CREATE INDEX "qr_scans_visitor_id_idx" ON "qr_scans"("visitor_id");

-- AddForeignKey
ALTER TABLE "laboratory_accreditations" ADD CONSTRAINT "laboratory_accreditations_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterfeit_alerts" ADD CONSTRAINT "counterfeit_alerts_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterfeit_alerts" ADD CONSTRAINT "counterfeit_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterfeit_alerts" ADD CONSTRAINT "counterfeit_alerts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterfeit_alerts" ADD CONSTRAINT "counterfeit_alerts_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "qr_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterfeit_alerts" ADD CONSTRAINT "counterfeit_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

