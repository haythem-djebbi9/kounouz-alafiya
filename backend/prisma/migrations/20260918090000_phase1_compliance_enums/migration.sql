-- Conformité Phase 1 : nouvelles valeurs d'énumérations.
-- Isolées dans leur propre migration : Postgres n'autorise pas l'usage d'une
-- valeur d'enum ajoutée dans la même transaction.

-- AlterEnum
ALTER TYPE "CounterfeitAlertStatus" ADD VALUE 'CONFIRMED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WORKFLOW_TASK';

-- AlterEnum
ALTER TYPE "ProductStatus" ADD VALUE 'ARCHIVE';
