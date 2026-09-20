-- CreateEnum
CREATE TYPE "CollectionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CollectionAssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');


-- AlterTable
ALTER TABLE "sample_events" ADD COLUMN     "handler_name" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "samples" ADD COLUMN     "gps_accuracy" DOUBLE PRECISION,
ADD COLUMN     "harvest_source" TEXT,
ADD COLUMN     "honey_type" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "number_of_samples" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "weather" JSONB;

-- AlterTable
ALTER TABLE "seals" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "photo_url" TEXT;

-- CreateTable
CREATE TABLE "collection_assignments" (
    "id" TEXT NOT NULL,
    "assignment_code" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "created_by" TEXT,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "time_window_start" TEXT,
    "time_window_end" TEXT,
    "priority" "CollectionPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "CollectionAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "expected_quantity_grams" INTEGER NOT NULL DEFAULT 500,
    "number_of_samples" INTEGER NOT NULL DEFAULT 1,
    "harvest_source" TEXT,
    "special_instructions" TEXT,
    "notes" TEXT,
    "required_equipment" TEXT[] DEFAULT ARRAY['SAMPLING_KIT', 'STERILE_CONTAINERS', 'SECURE_SEALS', 'LABELS_QR', 'CAMERA', 'GPS']::TEXT[],
    "checked_equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "reschedule_reason" TEXT,
    "producer_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sample_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collection_assignments_assignment_code_key" ON "collection_assignments"("assignment_code");

-- CreateIndex
CREATE UNIQUE INDEX "collection_assignments_sample_id_key" ON "collection_assignments"("sample_id");

-- CreateIndex
CREATE INDEX "collection_assignments_agent_id_scheduled_date_idx" ON "collection_assignments"("agent_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "collection_assignments_status_idx" ON "collection_assignments"("status");

-- AddForeignKey
ALTER TABLE "collection_assignments" ADD CONSTRAINT "collection_assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_assignments" ADD CONSTRAINT "collection_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_assignments" ADD CONSTRAINT "collection_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_assignments" ADD CONSTRAINT "collection_assignments_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

