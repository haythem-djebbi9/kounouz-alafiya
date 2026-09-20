import React from 'react';
import type { TFunction } from 'i18next';
import {
  CheckCircle2,
  Download,
  FilePlus2,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  QrCode,
  Server,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  ActionType,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AuditLogEntry,
  AuditStatus,
  LaboratoryStatus,
  ProducerStatus,
  ScanResult,
} from './api';
import type { Role } from '../../../lib/api-types';
import { SERIES, type Tone } from './ui';

// Correspondances statut -> ton visuel, partagées par tous les écrans.

export const ROLE_TONE: Record<Role, Tone> = {
  ADMIN: 'red',
  VERIFICATION_TEAM: 'violet',
  FIELD_AGENT: 'blue',
  PRODUCER: 'green',
  CONSUMER: 'gold',
};

export const PRODUCER_STATUS_TONE: Record<ProducerStatus, Tone> = {
  ACTIVE: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
  REJECTED: 'neutral',
};

export const LAB_STATUS_TONE: Record<LaboratoryStatus, Tone> = {
  ACTIVE: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
};

export const ALERT_STATUS_TONE: Record<AlertStatus, Tone> = {
  OPEN: 'red',
  INVESTIGATING: 'amber',
  CONFIRMED: 'red',
  RESOLVED: 'green',
  DISMISSED: 'neutral',
};

export const SEVERITY_TONE: Record<AlertSeverity, Tone> = {
  HIGH: 'red',
  MEDIUM: 'amber',
  LOW: 'blue',
};

export const SCAN_RESULT_TONE: Record<ScanResult, Tone> = {
  VALID: 'green',
  SUSPICIOUS: 'amber',
  INVALID: 'red',
};

export const AUDIT_STATUS_TONE: Record<AuditStatus, Tone> = {
  SUCCESS: 'green',
  FAILED: 'red',
  WARNING: 'amber',
};

/** Couleur catégorielle fixe par type d'alerte (ordre de la palette validée). */
export const ALERT_TYPE_COLOR: Record<AlertType, string> = {
  SUSPECTED_DUPLICATE: SERIES[3],
  UNUSUAL_LOCATION: SERIES[1],
  INVALID_QR: SERIES[2],
  TAMPERED_LABEL: SERIES[4],
  BULK_SCAN: SERIES[0],
};

export const ACTION_TYPE_STYLE: Record<ActionType, { tone: Tone; icon: React.ComponentType<{ className?: string }> }> = {
  SYSTEM: { tone: 'neutral', icon: Server },
  LOGIN: { tone: 'green', icon: LogIn },
  LOGOUT: { tone: 'neutral', icon: LogOut },
  FAILED_LOGIN: { tone: 'red', icon: KeyRound },
  GENERATE: { tone: 'violet', icon: QrCode },
  REJECT: { tone: 'red', icon: XCircle },
  VERIFY: { tone: 'green', icon: CheckCircle2 },
  DELETE: { tone: 'red', icon: Trash2 },
  CREATE: { tone: 'blue', icon: FilePlus2 },
  UPDATE: { tone: 'amber', icon: Pencil },
};

export const EXPORT_ICON = Download;
export const SECURITY_ICON = ShieldAlert;

/** Code d'action lisible quand aucune traduction dédiée n'existe. */
export function humanizeCode(code: string): string {
  const text = code.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function describeAction(t: TFunction, log: Pick<AuditLogEntry, 'action'>): string {
  return t(`console:logActions.${log.action}`, { defaultValue: humanizeCode(log.action) });
}

export function moduleLabel(t: TFunction, module: string | null): string {
  if (!module) return '—';
  return t(`console:enums.module.${module}`, { defaultValue: humanizeCode(module) });
}

/** Lien vers l'écran de l'entité journalisée, quand il existe. */
export function entityLink(entite: string, entiteId: string): string | null {
  if (!entiteId || entiteId === '-') return null;
  switch (entite) {
    case 'Producer':
      return `/admin/producteurs/${entiteId}`;
    case 'User':
      return `/admin/utilisateurs?user=${entiteId}`;
    case 'VerificationRequest':
      return `/admin/demandes/${entiteId}`;
    case 'Sample':
      return `/admin/echantillons/${entiteId}`;
    case 'Batch':
      return `/verificateur/lots/${entiteId}`;
    case 'Product':
      return `/admin/produits/${entiteId}`;
    case 'Laboratory':
      return `/admin/laboratoires?lab=${entiteId}`;
    case 'CounterfeitAlert':
      return `/admin/analyses/alertes?alert=${entiteId}`;
    default:
      return null;
  }
}

export function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, v]) => `${key}: ${v === null || v === undefined ? '—' : String(v)}`)
      .join('\n');
  }
  return String(value);
}
