import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { resolveFileUrl } from '../../../lib/api';
import { daysBefore, formatDate, formatNumber, initials, toIsoDate } from './format';

// Kit visuel de la console d'administration : mêmes encres que le site
// (vert Kounouz, or, crème), en version dense de back-office.

export const INK = '#0C261B';
export const GOLD = '#D49B37';
export const LINE = '#EAE1D2';

/** Palette catégorielle validée (ordre fixe, jamais recyclée). */
export const SERIES = ['#1F7A4D', '#D49B37', '#2A78D6', '#C7452F', '#7C5BD1', '#E87BA4'] as const;
export const OTHER_COLOR = '#9AA69F';

/** Couleurs d'état : toujours accompagnées d'un libellé ou d'une icône. */
export const STATUS_COLOR = {
  good: '#17693F',
  warning: '#D49B37',
  critical: '#C7452F',
  info: '#2A78D6',
  neutral: '#9AA69F',
} as const;

export type Tone = 'neutral' | 'amber' | 'blue' | 'green' | 'red' | 'violet' | 'gold';

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-[#F1F3F0] text-[#3F4A44] border-[#DCE1DB]',
  amber: 'bg-[#FDF6E7] text-[#8A5B12] border-[#EFD9A8]',
  gold: 'bg-[#FBF1DE] text-[#8A5B12] border-[#EBD3A3]',
  blue: 'bg-[#EAF1FB] text-[#1D4E89] border-[#C3D8F0]',
  green: 'bg-[#E8F5EC] text-[#17693F] border-[#BFE0CB]',
  red: 'bg-[#FDF2F2] text-[#B42323] border-[#F3CFCF]',
  violet: 'bg-[#F1EDFB] text-[#5B3FA8] border-[#D8CCF2]',
};

const TONE_ICON_BG: Record<Tone, string> = {
  neutral: 'bg-[#EEF1ED] text-[#3F4A44]',
  amber: 'bg-[#FDF1DA] text-[#B7791F]',
  gold: 'bg-[#FBEFD8] text-[#B7791F]',
  blue: 'bg-[#E4EEFB] text-[#2A78D6]',
  green: 'bg-[#E3F2E8] text-[#17693F]',
  red: 'bg-[#FCE9E9] text-[#C7452F]',
  violet: 'bg-[#EEE9FB] text-[#6A4FC4]',
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: '#9AA69F',
  amber: '#D49B37',
  gold: '#D49B37',
  blue: '#2A78D6',
  green: '#17693F',
  red: '#C7452F',
  violet: '#7C5BD1',
};

// --- Structure -------------------------------------------------------------

export const PageTitle: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
}) => (
  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-5">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0C261B] leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-[#5B6B62] mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Card: React.FC<{
  title?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, icon, actions, className = '', bodyClassName = 'p-4', children }) => (
  <section className={`bg-white border border-[#EAE1D2] rounded-2xl shadow-[0_1px_2px_rgba(12,38,27,0.04)] min-w-0 ${className}`}>
    {(title || actions) && (
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0C261B] min-w-0">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const LinkAction: React.FC<{ onClick?: () => void; href?: string; children: React.ReactNode }> = ({ onClick, children }) => (
  <button onClick={onClick} className="text-xs font-bold text-[#17693F] hover:text-[#0C261B] inline-flex items-center gap-1">
    {children}
    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
  </button>
);

// --- Indicateurs -------------------------------------------------------------

export const Delta: React.FC<{
  value: number | null | undefined;
  /** Une baisse est une bonne nouvelle (alertes, fraude, délais). */
  invert?: boolean;
  suffix?: string;
  label?: string;
  className?: string;
}> = ({ value, invert, suffix = '%', label, className = '' }) => {
  const { i18n } = useTranslation();
  if (value === null || value === undefined) {
    return <span className={`text-xs text-gray-400 ${className}`}>{label ? `— ${label}` : '—'}</span>;
  }
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${className}`}>
      <span className={`inline-flex items-center gap-0.5 font-bold tabular-nums ${good ? 'text-[#17693F]' : bad ? 'text-[#C7452F]' : 'text-gray-500'}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {value > 0 ? '+' : ''}
        {formatNumber(value, i18n.language, 1)}
        {suffix}
      </span>
      {label && <span className="text-gray-400">{label}</span>}
    </span>
  );
};

export const StatTile: React.FC<{
  icon: React.ReactNode;
  tone?: Tone;
  label: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ icon, tone = 'green', label, value, footer, active, onClick, className = '' }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className={`text-start bg-white border rounded-2xl p-4 flex items-start gap-3 min-w-0 transition-colors ${
        active ? 'border-[#D49B37] ring-1 ring-[#D49B37]/40' : 'border-[#EAE1D2]'
      } ${onClick ? 'hover:border-[#D49B37]' : ''} ${className}`}
    >
      <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${TONE_ICON_BG[tone]}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-[#5B6B62] truncate">{label}</span>
        <span className="block text-[22px] leading-tight font-extrabold text-[#0C261B] tabular-nums mt-0.5 truncate">{value}</span>
        {footer && <span className="block mt-1">{footer}</span>}
      </span>
    </Tag>
  );
};

export const Pill: React.FC<{ tone: Tone; children: React.ReactNode; icon?: React.ReactNode; dot?: boolean; className?: string }> = ({
  tone,
  children,
  icon,
  dot = true,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
  >
    {icon ?? (dot && <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TONE_DOT[tone] }} />)}
    {children}
  </span>
);

export const Chip: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-md bg-[#F4F1EA] border border-[#EAE1D2] px-1.5 py-0.5 text-[11px] font-semibold text-[#3F4A44] whitespace-nowrap ${className}`}>
    {children}
  </span>
);

export const ProgressBar: React.FC<{ value: number; color?: string; className?: string }> = ({
  value,
  color = STATUS_COLOR.good,
  className = '',
}) => (
  <div className={`h-1.5 rounded-full bg-[#EEF1ED] overflow-hidden ${className}`}>
    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
  </div>
);

// --- Identité ----------------------------------------------------------------

const AVATAR_TONES = ['#0C261B', '#17693F', '#8A5B12', '#1D4E89', '#5B3FA8', '#B42323'];

export const Avatar: React.FC<{ name: string | null | undefined; src?: string | null; size?: number; className?: string }> = ({
  name,
  src,
  size = 32,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const color = AVATAR_TONES[(name ?? '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  if (src && !failed) {
    return (
      <img
        src={resolveFileUrl(src)}
        alt=""
        onError={() => setFailed(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`rounded-full grid place-items-center text-white font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
};

export const Flag: React.FC<{ code: string | null | undefined; className?: string }> = ({ code, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (!code) return null;
  if (failed) {
    return (
      <span className={`inline-grid place-items-center w-5 h-3.5 rounded-sm bg-[#EEF1ED] text-[8px] font-bold text-[#3F4A44] ${className}`}>
        {code.toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code.toUpperCase()}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`inline-block w-5 h-3.5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.06)] shrink-0 ${className}`}
    />
  );
};

export const ProductThumb: React.FC<{ src?: string | null; size?: number }> = ({ src, size = 36 }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-grid place-items-center rounded-lg bg-[#FBF3E2] overflow-hidden shrink-0" style={{ width: size, height: size }}>
      {src && !failed ? (
        <img src={resolveFileUrl(src)} alt="" onError={() => setFailed(true)} className="w-full h-full object-cover" />
      ) : (
        <span aria-hidden className="text-base">🍯</span>
      )}
    </span>
  );
};

// --- Contrôles ------------------------------------------------------------------

const CONTROL =
  'w-full min-h-[40px] rounded-xl border border-[#E4DED2] bg-white px-3 text-sm text-[#0C261B] placeholder:text-gray-400 focus:outline-none focus:border-[#D49B37] focus:ring-2 focus:ring-[#D49B37]/15 disabled:bg-[#F6F7F5] disabled:text-gray-400';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({
  className = '',
  label,
  children,
  ...props
}) => (
  <div className={`relative ${className}`}>
    <select {...props} aria-label={label ?? props['aria-label']} className={`${CONTROL} appearance-none pe-9 font-semibold`}>
      {children}
    </select>
    <ChevronDown className="w-4 h-4 text-gray-400 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input {...props} className={`${CONTROL} ${className}`} />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea {...props} className={`${CONTROL} py-2 min-h-[90px] ${className}`} />
);

export const Field: React.FC<{ label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode; className?: string }> = ({
  label,
  required,
  hint,
  error,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-bold text-[#0C261B] mb-1">
      {label}
      {required && <span className="text-[#B42323] ms-0.5">*</span>}
    </span>
    {children}
    {error ? (
      <span className="block text-[11px] text-[#B42323] mt-1">{error}</span>
    ) : (
      hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>
    )}
  </label>
);

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

const BTN: Record<BtnVariant, string> = {
  primary: 'bg-[#0C261B] text-white border-transparent hover:bg-[#17392A]',
  secondary: 'bg-white text-[#0C261B] border-[#E4DED2] hover:border-[#D49B37]',
  ghost: 'bg-transparent text-[#0C261B] border-transparent hover:bg-[#F4F1EA]',
  danger: 'bg-white text-[#B42323] border-[#F3CFCF] hover:bg-[#FDF2F2]',
  gold: 'bg-[#D49B37] text-[#0C261B] border-transparent hover:bg-[#C68C2A]',
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; loading?: boolean; icon?: React.ReactNode }
> = ({ variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, type = 'button', ...props }) => (
  <button
    {...props}
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
      size === 'sm' ? 'text-xs px-3 min-h-[34px]' : 'text-sm px-4 min-h-[40px]'
    } ${BTN[variant]} ${className}`}
  >
    {loading ? <span aria-hidden className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
    {children}
  </button>
);

export function useClickOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

export const RowMenu: React.FC<{ items: MenuItem[]; label: string }> = ({ items, label }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const visible = items.filter((item) => !item.hidden);

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl';
      const width = 208;
      const left = rtl ? rect.left : rect.right - width;
      const top = rect.bottom + 4 + visible.length * 38 > window.innerHeight ? rect.top - 4 - visible.length * 38 - 8 : rect.bottom + 4;
      setPosition({ top, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="w-8 h-8 rounded-lg grid place-items-center text-[#5B6B62] hover:bg-[#F4F1EA] hover:text-[#0C261B]"
        aria-label={label}
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[70] w-52 bg-white border border-[#EAE1D2] rounded-xl shadow-lg py-1"
            style={{ top: position.top, left: position.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {visible.map((item) => (
              <button
                key={item.label}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-start disabled:opacity-40 ${
                  item.danger ? 'text-[#B42323] hover:bg-[#FDF2F2]' : 'text-[#0C261B] hover:bg-[#FAF6EE]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

// --- Période ---------------------------------------------------------------------

export interface DateRange {
  from: string;
  to: string;
}

export const RANGE_PRESETS = ['7', '30', '90', '180', '365'] as const;

export function defaultRange(days = 30): DateRange {
  return { from: toIsoDate(daysBefore(days - 1)), to: toIsoDate(new Date()) };
}

export const DateRangePicker: React.FC<{ value: DateRange; onChange: (range: DateRange) => void }> = ({ value, onChange }) => {
  const { t, i18n } = useTranslation('console');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  useEffect(() => setDraft(value), [value]);

  const label = `${formatDate(value.from, i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })} → ${formatDate(value.to, i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 bg-white border border-[#E4DED2] rounded-xl px-3 min-h-[40px] text-sm font-semibold text-[#0C261B] hover:border-[#D49B37]"
      >
        <CalendarDays className="w-4 h-4 text-[#17693F]" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-72 bg-white border border-[#EAE1D2] rounded-xl shadow-lg z-40 p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {RANGE_PRESETS.map((days) => (
              <button
                key={days}
                onClick={() => {
                  onChange(defaultRange(Number(days)));
                  setOpen(false);
                }}
                className="px-2 py-2 rounded-lg text-xs font-bold text-start bg-[#F4F1EA] text-[#0C261B] hover:bg-[#EDE6D8]"
              >
                {t('range.lastDays', { days })}
              </button>
            ))}
            <button
              onClick={() => {
                const now = new Date();
                onChange({ from: `${now.getFullYear()}-01-01`, to: toIsoDate(now) });
                setOpen(false);
              }}
              className="px-2 py-2 rounded-lg text-xs font-bold text-start bg-[#F4F1EA] text-[#0C261B] hover:bg-[#EDE6D8]"
            >
              {t('range.thisYear')}
            </button>
          </div>
          <div className="border-t border-[#EEF0EC] mt-3 pt-3 space-y-2">
            <p className="text-xs font-bold text-[#0C261B]">{t('range.custom')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={draft.from} max={draft.to} onChange={(e) => setDraft({ ...draft, from: e.target.value })} aria-label={t('range.from')} />
              <Input type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-label={t('range.to')} />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!draft.from || !draft.to || draft.from > draft.to}
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              {t('range.apply')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Tableaux ----------------------------------------------------------------------

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <th
    {...props}
    className={`text-start text-[11px] font-bold uppercase tracking-wide text-[#7C8A82] px-3 py-2.5 bg-[#FBF9F4] border-y border-[#EFE9DD] whitespace-nowrap ${className}`}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <td {...props} className={`px-3 py-2.5 border-b border-[#F3EEE4] align-middle text-[13px] text-[#1F2A24] ${className}`}>
    {children}
  </td>
);

export const TableShell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full border-collapse">{children}</table>
  </div>
);

export const EmptyRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-12 text-center text-sm text-gray-400">
      {message}
    </td>
  </tr>
);

export const Pager: React.FC<{
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  sizes?: number[];
}> = ({ page, pageSize, total, onPage, onPageSize, sizes = [10, 15, 25, 50] }) => {
  const { t, i18n } = useTranslation('console');
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const lang = i18n.language;

  const pageButton = (p: number, children?: React.ReactNode, disabled?: boolean) => (
    <button
      key={children ? `nav-${p}-${String(disabled)}` : p}
      onClick={() => onPage(p)}
      disabled={disabled}
      aria-current={p === page && !children ? 'page' : undefined}
      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 ${
        p === page && !children ? 'bg-[#0C261B] text-white border-[#0C261B]' : 'bg-white text-[#0C261B] border-[#E4DED2] hover:border-[#D49B37]'
      }`}
    >
      {children ?? formatNumber(p, lang)}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3">
      <p className="text-xs text-[#5B6B62]">
        {t('table.showing', { from: formatNumber(from, lang), to: formatNumber(to, lang), total: formatNumber(total, lang) })}
      </p>
      <div className="flex items-center gap-1">
        {pageButton(page - 1, <ChevronLeft className="w-4 h-4 rtl:rotate-180" />, page <= 1)}
        {start > 1 && (
          <>
            {pageButton(1)}
            {start > 2 && <span className="px-1 text-gray-400">…</span>}
          </>
        )}
        {pages.map((p) => pageButton(p))}
        {end < pageCount && (
          <>
            {end < pageCount - 1 && <span className="px-1 text-gray-400">…</span>}
            {pageButton(pageCount)}
          </>
        )}
        {pageButton(page + 1, <ChevronRight className="w-4 h-4 rtl:rotate-180" />, page >= pageCount)}
      </div>
      {onPageSize && (
        <Select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="w-36" label={t('table.perPage')}>
          {sizes.map((size) => (
            <option key={size} value={size}>
              {t('table.perPageOption', { n: size })}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
};

export const UnderlineTabs = <K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: K; label: string; count?: number }[];
  active: K;
  onChange: (key: K) => void;
}) => {
  const { i18n } = useTranslation();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[#EAE1D2] scrollbar-thin" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3.5 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
            active === tab.key ? 'border-[#17693F] text-[#0C261B]' : 'border-transparent text-[#6B7A71] hover:text-[#0C261B]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ms-1.5 text-[11px] rounded-full px-1.5 py-0.5 tabular-nums ${active === tab.key ? 'bg-[#E3F2E8] text-[#17693F]' : 'bg-[#F1F3F0] text-[#5B6B62]'}`}>
              {formatNumber(tab.count, i18n.language)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// --- Panneaux --------------------------------------------------------------------------

export const SidePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, children, footer, width = 'sm:max-w-[440px]' }) => {
  const { t } = useTranslation('console');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-[#0C261B]/25" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute inset-y-0 end-0 w-full ${width} bg-white shadow-2xl flex flex-col animate-[slideIn_.18s_ease-out]`}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#EAE1D2]">
          <h2 className="text-base font-bold text-[#0C261B] min-w-0 truncate">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-[#F4F1EA]" aria-label={t('actions.close')}>
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="border-t border-[#EAE1D2] px-5 py-3 bg-[#FBF9F4]">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
};

export const Dialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ open, onClose, title, children, footer, size = 'md' }) => {
  const { t } = useTranslation('console');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-[#0C261B]/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-white w-full ${size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl'} rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#EAE1D2]">
          <h2 className="font-bold text-[#0C261B]">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-[#F4F1EA]" aria-label={t('actions.close')}>
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-[#EAE1D2]">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
};

export const InfoRow: React.FC<{ icon?: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="grid grid-cols-[18px_minmax(96px,120px)_1fr] items-start gap-2 py-1.5 text-[13px]">
    <span className="text-[#7C8A82] mt-0.5">{icon}</span>
    <span className="text-[#6B7A71]">{label}</span>
    <span className="text-[#0C261B] font-semibold min-w-0 break-words">{children}</span>
  </div>
);

// --- États ----------------------------------------------------------------------------

export const LoadingState: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation('console');
  return (
    <div className={`py-12 grid place-items-center text-sm text-gray-400 ${className}`} role="status">
      <span className="w-6 h-6 rounded-full border-2 border-[#D49B37] border-t-transparent animate-spin mb-2" aria-hidden />
      {t('states.loading')}
    </div>
  );
};

export const ErrorState: React.FC<{ onRetry?: () => void; className?: string }> = ({ onRetry, className = '' }) => {
  const { t } = useTranslation('console');
  return (
    <div className={`py-10 text-center ${className}`} role="alert">
      <AlertTriangle className="w-6 h-6 text-[#C7452F] mx-auto mb-2" />
      <p className="text-sm font-bold text-[#0C261B]">{t('states.error')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      )}
    </div>
  );
};

export const EmptyState: React.FC<{ message: string; icon?: React.ReactNode }> = ({ message, icon }) => (
  <div className="py-10 text-center text-sm text-gray-400">
    {icon && <div className="w-8 h-8 mx-auto mb-2 grid place-items-center text-[#C6CFC8]">{icon}</div>}
    {message}
  </div>
);

export const Toast: React.FC<{ message: string | null; tone?: 'success' | 'error'; onClose: () => void }> = ({ message, tone = 'success', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return createPortal(
    <div
      role="status"
      className={`fixed bottom-5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-[90] flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg text-sm font-semibold ${
        tone === 'success' ? 'bg-[#0C261B] text-white' : 'bg-[#B42323] text-white'
      }`}
    >
      {tone === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#D49B37]" /> : <AlertTriangle className="w-4 h-4" />}
      {message}
    </div>,
    document.body,
  );
};

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  return {
    toast,
    success: (message: string) => setToast({ message, tone: 'success' }),
    error: (message: string) => setToast({ message, tone: 'error' }),
    clear: () => setToast(null),
  };
}

/** Message d'erreur API lisible, ou libellé générique. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    const message = (error as { message: string }).message;
    return message && message !== 'Network error' ? message : fallback;
  }
  return fallback;
}
