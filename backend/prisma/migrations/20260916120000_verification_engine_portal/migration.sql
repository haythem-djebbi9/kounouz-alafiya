-- CreateEnum
CREATE TYPE "SampleEventType" AS ENUM ('REGISTERED', 'COLLECTED', 'SEALED', 'IN_TRANSIT', 'RECEIVED', 'SENT_TO_LAB', 'IN_LABORATORY', 'ANALYSIS_COMPLETED', 'RESULT_ADDED', 'ISSUE');

-- CreateEnum
CREATE TYPE "LabWorkflowStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "LabTestStatus" AS ENUM ('WITHIN_RANGE', 'OUT_OF_RANGE', 'NOT_DETECTED', 'DETECTED', 'NOT_APPLICABLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SampleStatus" ADD VALUE 'RECEIVED';
ALTER TYPE "SampleStatus" ADD VALUE 'ISSUE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VerificationRequestStatus" ADD VALUE 'INFO_REQUESTED';
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'COLLECTION_SCHEDULED';
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'SAMPLE_COLLECTED';
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'UNDER_ANALYSIS';
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'VERIFICATION_PENDING';
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'NOT_VERIFIED';

-- AlterEnum
ALTER TYPE "VerificationStatus" ADD VALUE 'ADDITIONAL_ANALYSIS';

-- AlterTable
ALTER TABLE "laboratory_analyses" ADD COLUMN     "analysis_code" TEXT,
ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "assignment_date" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "conclusion" TEXT,
ADD COLUMN     "expected_completion" TIMESTAMP(3),
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "report_number" TEXT,
ADD COLUMN     "workflow_status" "LabWorkflowStatus" NOT NULL DEFAULT 'ASSIGNED';

-- AlterTable
ALTER TABLE "samples" ADD COLUMN     "collection_method" "CollectionMethod",
ADD COLUMN     "issue_reason" TEXT,
ADD COLUMN     "sample_code" TEXT;

-- AlterTable
ALTER TABLE "verification_requests" ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "batch_number" TEXT,
ADD COLUMN     "info_requested" TEXT,
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reviewed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "evaluation" JSONB,
ADD COLUMN     "is_draft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verification_code" TEXT;

-- CreateTable
CREATE TABLE "request_comments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_documents" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_events" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "type" "SampleEventType" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "note" TEXT,
    "evidence_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_results" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "parameter_key" TEXT NOT NULL,
    "value" TEXT,
    "unit" TEXT,
    "reference_min" DECIMAL(10,3),
    "reference_max" DECIMAL(10,3),
    "reference_text" TEXT,
    "status" "LabTestStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "details" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lab_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_analysis_files" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_analysis_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_honeys" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "honey_type" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "harvest_season" TEXT NOT NULL,
    "collection_date" TIMESTAMP(3),
    "color" TEXT,
    "texture" TEXT,
    "floral_source" TEXT,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "analysis_results" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_honeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_comments_request_id_idx" ON "request_comments"("request_id");

-- CreateIndex
CREATE INDEX "request_documents_request_id_idx" ON "request_documents"("request_id");

-- CreateIndex
CREATE INDEX "sample_events_sample_id_occurred_at_idx" ON "sample_events"("sample_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_results_analysis_id_parameter_key_key" ON "lab_test_results"("analysis_id", "parameter_key");

-- CreateIndex
CREATE INDEX "lab_analysis_files_analysis_id_idx" ON "lab_analysis_files"("analysis_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_honeys_code_key" ON "reference_honeys"("code");

-- CreateIndex
CREATE INDEX "reference_honeys_honey_type_idx" ON "reference_honeys"("honey_type");

-- CreateIndex
CREATE INDEX "reference_honeys_region_idx" ON "reference_honeys"("region");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_analyses_analysis_code_key" ON "laboratory_analyses"("analysis_code");

-- CreateIndex
CREATE INDEX "laboratory_analyses_sample_id_idx" ON "laboratory_analyses"("sample_id");

-- CreateIndex
CREATE UNIQUE INDEX "samples_sample_code_key" ON "samples"("sample_code");

-- CreateIndex
CREATE INDEX "samples_status_idx" ON "samples"("status");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_verification_code_key" ON "verifications"("verification_code");

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_events" ADD CONSTRAINT "sample_events_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_events" ADD CONSTRAINT "sample_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_analyses" ADD CONSTRAINT "laboratory_analyses_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_results" ADD CONSTRAINT "lab_test_results_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "laboratory_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_analysis_files" ADD CONSTRAINT "lab_analysis_files_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "laboratory_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_analysis_files" ADD CONSTRAINT "lab_analysis_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_honeys" ADD CONSTRAINT "reference_honeys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

