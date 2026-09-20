-- Cycle de vie de l'échantillon de référence (ERD : status, condition) et
-- auteur de la mise en conservation.

-- CreateEnum
CREATE TYPE "ReferenceSampleStatus" AS ENUM ('STORED', 'USED_FOR_RETEST', 'DISPOSED');

-- AlterTable
ALTER TABLE "reference_samples" ADD COLUMN     "condition" TEXT,
ADD COLUMN     "status" "ReferenceSampleStatus" NOT NULL DEFAULT 'STORED',
ADD COLUMN     "stored_by" TEXT;

-- AddForeignKey
ALTER TABLE "reference_samples" ADD CONSTRAINT "reference_samples_stored_by_fkey" FOREIGN KEY ("stored_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

