/**
 * Noms d'événements métier canoniques (§3 Architecture événementielle).
 *
 * Convention ENTITY.ACTION : un événement est un fait accompli, jamais une
 * intention. Il n'est publié qu'après la réussite de l'écriture qui l'a
 * produit (EV-01).
 */
export const EventType = {
  VERIFICATION_REQUEST_SUBMITTED: 'verification_request.submitted',
  VERIFICATION_REQUEST_APPROVED: 'verification_request.approved',
  VERIFICATION_REQUEST_MORE_INFO: 'verification_request.more_information_requested',
  VERIFICATION_REQUEST_INFO_PROVIDED: 'verification_request.information_provided',
  VERIFICATION_REQUEST_REJECTED: 'verification_request.rejected',
  COLLECTION_SCHEDULED: 'collection.scheduled',
  SAMPLE_COLLECTED: 'sample.collected',
  SAMPLE_SEALED: 'sample.sealed',
  CHAIN_OF_CUSTODY_UPDATED: 'chain_of_custody.updated',
  LABORATORY_ANALYSIS_RECEIVED: 'laboratory.analysis_received',
  REFERENCE_SAMPLE_REGISTERED: 'reference_sample.registered',
  VERIFICATION_COMPLETED: 'verification.completed',
  BATCH_CREATED: 'batch.created',
  BATCH_SUSPENDED: 'batch.suspended',
  BATCH_RECALLED: 'batch.recalled',
  BATCH_RESTORED: 'batch.restored',
  PACKAGING_COMPLETED: 'packaging.completed',
  PRODUCT_CREATED: 'product.created',
  PRODUCT_SUSPENDED: 'product.suspended',
  QR_ACTIVATED: 'qr.activated',
  QR_SUSPENDED: 'qr.suspended',
  QR_SCANNED: 'qr.scanned',
  COUNTERFEIT_ALERT_RAISED: 'anti_counterfeit.alert_raised',
  ORDER_CREATED: 'order.created',
  SETTLEMENT_GENERATED: 'settlement.generated',
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];

/** Version du schéma de charge utile, incrémentée à chaque rupture de format. */
export const EVENT_SCHEMA_VERSION = 1;
