-- Conformité Phase 1 : ruchers (Farm), déclinaisons SKU (ProductVariant),
-- outbox d'événements, idempotence, paramètres d'exploitation et champs
-- d'audit structurés — puis reprise des données existantes.

-- CreateEnum
CREATE TYPE "ProductVariantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DomainEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'DEAD_LETTER');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_role" TEXT,
ADD COLUMN     "correlation_id" TEXT,
ADD COLUMN     "is_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "new_status" TEXT,
ADD COLUMN     "previous_status" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "product_code" TEXT;

-- AlterTable
ALTER TABLE "qr_codes" ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "verification_requests" ADD COLUMN     "farm_id" TEXT;

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "farm_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "governorate" TEXT,
    "delegation" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "hives_count" INTEGER,
    "main_flora" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "beekeeping_method" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "package_size" TEXT NOT NULL,
    "net_weight_g" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductVariantStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "idempotency_key" TEXT,
    "status" "DomainEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),

CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_event_handlings" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "handler" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "domain_event_handlings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT '',
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "farms_farm_code_key" ON "farms"("farm_code");

-- CreateIndex
CREATE INDEX "farms_producer_id_idx" ON "farms"("producer_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "domain_events_idempotency_key_key" ON "domain_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "domain_events_status_next_attempt_at_idx" ON "domain_events"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "domain_events_event_type_idx" ON "domain_events"("event_type");

-- CreateIndex
CREATE INDEX "domain_events_correlation_id_idx" ON "domain_events"("correlation_id");

-- CreateIndex
CREATE INDEX "domain_events_occurred_at_idx" ON "domain_events"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "domain_event_handlings_event_id_handler_key" ON "domain_event_handlings"("event_id", "handler");

-- CreateIndex
CREATE INDEX "idempotency_records_created_at_idx" ON "idempotency_records"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_key_user_id_key" ON "idempotency_records"("key", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");

-- CreateIndex
CREATE INDEX "audit_logs_is_override_idx" ON "audit_logs"("is_override");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- CreateIndex
CREATE INDEX "verification_requests_farm_id_idx" ON "verification_requests"("farm_id");

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_event_handlings" ADD CONSTRAINT "domain_event_handlings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "domain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Reprise des données existantes
-- ===========================================================================

-- 1) Un rucher principal par producteur, copié des champs d'exploitation.
INSERT INTO "farms" (
  "id", "producer_id", "farm_code", "name", "governorate", "delegation", "address",
  "latitude", "longitude", "hives_count", "main_flora", "is_primary", "is_active",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  p."id",
  'FRM-' || to_char(now(), 'YYYY') || '-' || lpad(row_number() OVER (ORDER BY p."created_at", p."id")::text, 3, '0'),
  COALESCE(NULLIF(p."farm_name", ''), p."name"),
  COALESCE(p."farm_governorate", p."governorate"),
  p."farm_delegation",
  p."farm_address",
  p."latitude",
  p."longitude",
  p."hives_count",
  p."main_flora",
  true,
  true,
  now(),
  now()
FROM "producers" p;

-- 2) Les demandes existantes pointent vers le rucher principal de leur producteur.
UPDATE "verification_requests" vr
SET "farm_id" = f."id"
FROM "farms" f
WHERE f."producer_id" = vr."producer_id" AND f."is_primary" = true AND vr."farm_id" IS NULL;

-- 3) Identifiant produit lisible, numéroté par année de création.
UPDATE "products" pr
SET "product_code" = x.code
FROM (
  SELECT "id",
         'KZ-PRD-' || to_char("created_at", 'YYYY') || '-' ||
         lpad(row_number() OVER (PARTITION BY to_char("created_at", 'YYYY') ORDER BY "created_at", "id")::text, 3, '0') AS code
  FROM "products"
) x
WHERE pr."id" = x."id" AND pr."product_code" IS NULL;

-- 4) Une déclinaison (SKU) par défaut par produit, reprenant son prix et son stock.
INSERT INTO "product_variants" (
  "id", "product_id", "sku", "package_size", "net_weight_g", "unit", "price", "stock",
  "status", "is_default", "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  pr."id",
  pr."product_code" || '-' || COALESCE(pr."net_weight_g"::text || 'G', 'STD'),
  CASE
    WHEN pr."net_weight_g" IS NULL THEN COALESCE(pk."size", 'Standard')
    WHEN pr."net_weight_g" >= 1000 AND pr."net_weight_g" % 1000 = 0 THEN (pr."net_weight_g" / 1000)::text || ' kg'
    ELSE pr."net_weight_g"::text || ' g'
  END,
  pr."net_weight_g",
  'g',
  pr."prix",
  pr."stock",
  'ACTIVE',
  true,
  now(),
  now()
FROM "products" pr
LEFT JOIN "packagings" pk ON pk."id" = pr."packaging_id";

-- 5) Les lignes de commande existantes sont rattachées au SKU par défaut.
UPDATE "order_items" oi
SET "variant_id" = v."id", "sku" = v."sku"
FROM "product_variants" v
WHERE v."product_id" = oi."product_id" AND v."is_default" = true AND oi."variant_id" IS NULL;
