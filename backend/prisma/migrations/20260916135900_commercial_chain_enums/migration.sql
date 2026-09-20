-- Ajout des valeurs d'enumeration, isole dans sa propre migration :
-- PostgreSQL refuse d'utiliser une valeur d'enum ajoutee dans la meme
-- transaction (defauts de colonne de la migration suivante).
ALTER TYPE "BatchStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "BatchStatus" ADD VALUE 'READY_FOR_PACKAGING';
ALTER TYPE "BatchStatus" ADD VALUE 'IN_PACKAGING';
ALTER TYPE "BatchStatus" ADD VALUE 'CONVERTED_TO_PRODUCT';
ALTER TYPE "BatchStatus" ADD VALUE 'PUBLISHED';
ALTER TYPE "BatchStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "BatchStatus" ADD VALUE 'RECALLED';
ALTER TYPE "PackagingStatus" ADD VALUE 'PLANNED';
