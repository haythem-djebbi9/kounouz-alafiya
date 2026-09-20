import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, XCircle, Truck, FlaskConical, ShieldCheck, PauseCircle, PackageCheck } from 'lucide-react';
import { Badge } from './Badge';

type StatusKind = 'request' | 'sample' | 'verification' | 'batch' | 'product' | 'labAnalysis' | 'packaging' | 'supportTicket';

interface StatusVisual {
  tone: 'green' | 'gold' | 'gray' | 'red' | 'blue';
  icon: React.ReactNode;
}

const ICON_CLASS = 'w-3.5 h-3.5';

const REQUEST_MAP: Record<string, StatusVisual> = {
  NEW: { tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  IN_REVIEW: { tone: 'blue', icon: <Clock className={ICON_CLASS} /> },
  ACCEPTED: { tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
  REJECTED: { tone: 'red', icon: <XCircle className={ICON_CLASS} /> },
};

const SAMPLE_MAP: Record<string, StatusVisual> = {
  COLLECTED: { tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  SEALED: { tone: 'blue', icon: <ShieldCheck className={ICON_CLASS} /> },
  IN_TRANSIT: { tone: 'blue', icon: <Truck className={ICON_CLASS} /> },
  RECEIVED_AT_LAB: { tone: 'gold', icon: <FlaskConical className={ICON_CLASS} /> },
  ANALYZED: { tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
};

const VERIFICATION_MAP: Record<string, StatusVisual> = {
  PENDING: { tone: 'gold', icon: <Clock className={ICON_CLASS} /> },
  VERIFIED: { tone: 'green', icon: <ShieldCheck className={ICON_CLASS} /> },
  NOT_VERIFIED: { tone: 'red', icon: <XCircle className={ICON_CLASS} /> },
};

const BATCH_MAP: Record<string, StatusVisual> = {
  CREATED: { tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  PACKAGED: { tone: 'gold', icon: <PackageCheck className={ICON_CLASS} /> },
  READY: { tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
};

const PRODUCT_MAP: Record<string, StatusVisual> = {
  BROUILLON: { tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  PUBLIE: { tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
  RUPTURE: { tone: 'gold', icon: <PauseCircle className={ICON_CLASS} /> },
  SUSPENDU: { tone: 'red', icon: <PauseCircle className={ICON_CLASS} /> },
  ARCHIVE: { tone: 'gray', icon: <PauseCircle className={ICON_CLASS} /> },
};

const LAB_ANALYSIS_MAP: Record<string, StatusVisual> = {
  PENDING: { tone: 'gold', icon: <Clock className={ICON_CLASS} /> },
  COMPLIANT: { tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
  NON_COMPLIANT: { tone: 'red', icon: <XCircle className={ICON_CLASS} /> },
};

const PACKAGING_MAP: Record<string, StatusVisual> = {
  IN_PROGRESS: { tone: 'gold', icon: <Clock className={ICON_CLASS} /> },
  COMPLETED: { tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
};

const SUPPORT_TICKET_MAP: Record<string, StatusVisual> = {
  OPEN: { tone: 'blue', icon: <Clock className={ICON_CLASS} /> },
  IN_PROGRESS: { tone: 'gold', icon: <Clock className={ICON_CLASS} /> },
  RESOLVED: { tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
  CLOSED: { tone: 'gray', icon: <XCircle className={ICON_CLASS} /> },
};

const MAPS: Record<StatusKind, Record<string, StatusVisual>> = {
  request: REQUEST_MAP,
  sample: SAMPLE_MAP,
  verification: VERIFICATION_MAP,
  batch: BATCH_MAP,
  product: PRODUCT_MAP,
  labAnalysis: LAB_ANALYSIS_MAP,
  packaging: PACKAGING_MAP,
  supportTicket: SUPPORT_TICKET_MAP,
};

interface StatusBadgeProps {
  kind: StatusKind;
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ kind, status, className }) => {
  const { t } = useTranslation('status');
  const visual = MAPS[kind][status] ?? { tone: 'gray' as const, icon: null };
  const label = t(`${kind}.${status}`, { defaultValue: status });
  return (
    <Badge tone={visual.tone} icon={visual.icon} className={className}>
      {label}
    </Badge>
  );
};
