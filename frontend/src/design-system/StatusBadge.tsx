import React from 'react';
import { Clock, CheckCircle2, XCircle, Truck, FlaskConical, ShieldCheck, PauseCircle, PackageCheck } from 'lucide-react';
import { Badge } from './Badge';

type StatusKind = 'request' | 'sample' | 'verification' | 'batch' | 'product';

interface StatusConfig {
  label: string;
  tone: 'green' | 'gold' | 'gray' | 'red' | 'blue';
  icon: React.ReactNode;
}

const ICON_CLASS = 'w-3.5 h-3.5';

const REQUEST_MAP: Record<string, StatusConfig> = {
  NEW: { label: 'قيد الإرسال', tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  IN_REVIEW: { label: 'قيد المراجعة', tone: 'blue', icon: <Clock className={ICON_CLASS} /> },
  ACCEPTED: { label: 'مقبولة', tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
  REJECTED: { label: 'مرفوضة', tone: 'red', icon: <XCircle className={ICON_CLASS} /> },
};

const SAMPLE_MAP: Record<string, StatusConfig> = {
  COLLECTED: { label: 'تم أخذ العينة', tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  SEALED: { label: 'مختومة', tone: 'blue', icon: <ShieldCheck className={ICON_CLASS} /> },
  IN_TRANSIT: { label: 'في الطريق للمخبر', tone: 'blue', icon: <Truck className={ICON_CLASS} /> },
  RECEIVED_AT_LAB: { label: 'وصلت المخبر', tone: 'gold', icon: <FlaskConical className={ICON_CLASS} /> },
  ANALYZED: { label: 'تم التحليل', tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
};

const VERIFICATION_MAP: Record<string, StatusConfig> = {
  PENDING: { label: 'قيد التحقق', tone: 'gold', icon: <Clock className={ICON_CLASS} /> },
  VERIFIED: { label: 'تم التحقق ✅', tone: 'green', icon: <ShieldCheck className={ICON_CLASS} /> },
  NOT_VERIFIED: { label: 'غير مطابق', tone: 'red', icon: <XCircle className={ICON_CLASS} /> },
};

const BATCH_MAP: Record<string, StatusConfig> = {
  CREATED: { label: 'تم إنشاء الدفعة', tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  PACKAGED: { label: 'قيد التعبئة', tone: 'gold', icon: <PackageCheck className={ICON_CLASS} /> },
  READY: { label: 'جاهزة', tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
};

const PRODUCT_MAP: Record<string, StatusConfig> = {
  BROUILLON: { label: 'مسودة', tone: 'gray', icon: <Clock className={ICON_CLASS} /> },
  PUBLIE: { label: 'منشور', tone: 'green', icon: <CheckCircle2 className={ICON_CLASS} /> },
  RUPTURE: { label: 'نفدت الكمية', tone: 'gold', icon: <PauseCircle className={ICON_CLASS} /> },
  SUSPENDU: { label: 'موقوف مؤقتاً', tone: 'red', icon: <PauseCircle className={ICON_CLASS} /> },
};

const MAPS: Record<StatusKind, Record<string, StatusConfig>> = {
  request: REQUEST_MAP,
  sample: SAMPLE_MAP,
  verification: VERIFICATION_MAP,
  batch: BATCH_MAP,
  product: PRODUCT_MAP,
};

interface StatusBadgeProps {
  kind: StatusKind;
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ kind, status, className }) => {
  const config = MAPS[kind][status] ?? { label: status, tone: 'gray' as const, icon: null };
  return (
    <Badge tone={config.tone} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
};
