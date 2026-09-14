import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

type AlertTone = 'success' | 'error' | 'info' | 'warning';

const TONE_CONFIG: Record<AlertTone, { classes: string; icon: React.ReactNode }> = {
  success: { classes: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-5 h-5 shrink-0" /> },
  error: { classes: 'bg-rose-50 text-rose-800 border-rose-200', icon: <XCircle className="w-5 h-5 shrink-0" /> },
  info: { classes: 'bg-sky-50 text-sky-800 border-sky-200', icon: <Info className="w-5 h-5 shrink-0" /> },
  warning: { classes: 'bg-amber-50 text-amber-800 border-amber-200', icon: <AlertTriangle className="w-5 h-5 shrink-0" /> },
};

export const Alert: React.FC<{ tone: AlertTone; children: React.ReactNode; className?: string }> = ({
  tone,
  children,
  className = '',
}) => {
  const config = TONE_CONFIG[tone];
  return (
    <div className={`flex items-start gap-2.5 border rounded-lg px-4 py-3 text-sm font-semibold ${config.classes} ${className}`}>
      {config.icon}
      <span>{children}</span>
    </div>
  );
};
