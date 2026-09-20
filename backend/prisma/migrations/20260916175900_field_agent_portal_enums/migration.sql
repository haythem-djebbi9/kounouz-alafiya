-- Ajout des valeurs d'enumeration, isole dans sa propre migration :
-- PostgreSQL refuse d'utiliser une valeur d'enum ajoutee dans la meme
-- transaction.
ALTER TYPE "NotificationType" ADD VALUE 'COLLECTION_ASSIGNED';
ALTER TYPE "SampleEventType" ADD VALUE 'RELEASED_FOR_TRANSPORT';
ALTER TYPE "SampleEventType" ADD VALUE 'LOCATION_UPDATE';
