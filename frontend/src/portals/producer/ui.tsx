import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headset,
  Loader2,
  MoreVertical,
  Search,
  X,
} from 'lucide-react';
import type { DateRange, RangePreset, Tone } from './utils';
import { endOfDay, formatDate, presetRange, toInputDate } from './utils';

// Jetons visuels du portail producteur (template "Kounouz Alafiya Producer").
export const NAVY = 'text-[#14215B]';
const BORDER = 'border-[#E6E8E3]';

const TONE_BADGE: Record<Tone, string> = {
  green: 'bg-[#E7F4EC] text-[#17693F]',
  gold: 'bg-[#FDF1DC] text-[#94600D]',
  blue: 'bg-[#E6F0FB] text-[#1F5F9C]',
  red: 'bg-[#FDE8E8] text-[#B42323]',
  gray: 'bg-[#EFF1EE] text-[#4B5563]',
};

const TONE_CARD: Record<Tone, { card: string; icon: string }> = {
  green: { card: 'bg-[#F1F8F3] border-[#DCEDE2]', icon: 'bg-[#DDEFE3] text-[#17693F]' },
  gold: { card: 'bg-[#FEF8EC] border-[#F6E6C4]', icon: 'bg-[#FBE9C5] text-[#A56A0B]' },
  blue: { card: 'bg-[#F1F6FC] border-[#DCE8F6]', icon: 'bg-[#DDE9F8] text-[#1F5F9C]' },
  red: { card: 'bg-[#FDF2F2] border-[#F6DADA]', icon: 'bg-[#F9DCDC] text-[#B42323]' },
  gray: { card: 'bg-white border-[#E6E8E3]', icon: 'bg-[#EFF1EE] text-[#4B5563]' },
};

// ---------------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------------

export interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumb: React.FC<{ items: Crumb[]; className?: string }> = ({ items, className = '' }) => (
  <nav className={`flex flex-wrap items-center gap-1.5 text-xs text-gray-500 ${className}`} aria-label="breadcrumb">
    {items.map((item, idx) => (
      <React.Fragment key={`${item.label}-${idx}`}>
        {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 rtl:rotate-180" />}
        {item.to ? (
          <Link to={item.to} className="hover:text-[#14215B]">
            {item.label}
          </Link>
        ) : (
          <span className={`font-bold ${NAVY}`}>{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  breadcrumb?: Crumb[];
  breadcrumbPosition?: 'top' | 'side';
  actions?: React.ReactNode;
}> = ({ title, subtitle, breadcrumb, breadcrumbPosition = 'side', actions }) => (
  <div className="mb-6">
    {breadcrumb && breadcrumbPosition === 'top' && <Breadcrumb items={breadcrumb} className="mb-2" />}
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className={`text-2xl sm:text-[32px] leading-tight font-extrabold ${NAVY}`}>{title}</h1>
        {subtitle && <p className="text-sm sm:text-base text-[#27315F] mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
        {breadcrumb && breadcrumbPosition === 'side' && <Breadcrumb items={breadcrumb} />}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  </div>
);

export const Panel: React.FC<{
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, action, className = '', bodyClassName = 'p-4 sm:p-5', children }) => (
  <section className={`min-w-0 bg-white rounded-xl border ${BORDER} shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
    {(title || action) && (
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5">
        <div className="flex items-start gap-2.5 min-w-[150px] flex-1">
          {icon && <span className="text-[#0B4A2F] mt-0.5 shrink-0">{icon}</span>}
          <div className="min-w-0">
            {title && <h2 className={`text-base sm:text-lg font-bold ${NAVY}`}>{title}</h2>}
            {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const ViewAllLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link to={to} className={`inline-flex items-center gap-1.5 text-sm font-bold ${NAVY} hover:underline`}>
    {label}
    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
  </Link>
);

// ---------------------------------------------------------------------------
// Indicateurs
// ---------------------------------------------------------------------------

export const ToneBadge: React.FC<{ tone: Tone; children: React.ReactNode; className?: string; icon?: React.ReactNode }> = ({
  tone,
  children,
  className = '',
  icon,
}) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${TONE_BADGE[tone]} ${className}`}
  >
    {icon}
    {children}
  </span>
);

export interface Delta {
  // Valeur signée : > 0 hausse, < 0 baisse, null = non calculable.
  direction: 'up' | 'down' | 'flat';
  label: string;
}

export const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone: Tone;
  delta?: Delta;
  hint?: React.ReactNode;
  decoration?: React.ReactNode;
}> = ({ icon, label, value, unit, tone, delta, hint, decoration }) => (
  <div className={`relative rounded-xl border p-4 sm:p-5 ${TONE_CARD[tone].card}`}>
    <div className="flex items-start gap-3">
      <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${TONE_CARD[tone].icon}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#27315F]">{label}</p>
        <p className={`text-2xl sm:text-[28px] font-extrabold leading-tight ${NAVY}`}>
          {value}
          {unit && <span className="text-base font-bold ms-1">{unit}</span>}
        </p>
        {delta && (
          <p
            className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${
              delta.direction === 'down' ? 'text-rose-600' : delta.direction === 'up' ? 'text-[#17693F]' : 'text-gray-500'
            }`}
          >
            {delta.direction === 'up' && <ArrowUp className="w-3.5 h-3.5" />}
            {delta.direction === 'down' && <ArrowDown className="w-3.5 h-3.5" />}
            {delta.label}
          </p>
        )}
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
      {decoration && <div className="hidden xl:block absolute bottom-4 end-4">{decoration}</div>}
    </div>
  </div>
);

// Petites barres décoratives des cartes KPI (template) — purement visuelles.
export const MiniBars: React.FC<{ color: string }> = ({ color }) => (
  <div className="flex items-end gap-1 h-8" aria-hidden>
    {[0.35, 0.55, 0.75, 1].map((h, i) => (
      <span key={i} className="w-1.5 rounded-t-sm" style={{ height: `${h * 100}%`, backgroundColor: color, opacity: 0.35 + i * 0.2 }} />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

type BtnVariant = 'primary' | 'gold' | 'outline' | 'light' | 'ghost' | 'danger';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-[#0B4A2F] text-white hover:bg-[#0E5C3A] shadow-sm',
  gold: 'bg-[#F4B63F] text-[#1F1A0E] hover:bg-[#E9A92C] shadow-sm',
  outline: 'bg-white text-[#14215B] border border-[#CBD2CC] hover:bg-[#F6F7F5]',
  light: 'bg-[#E9EDF5] text-[#14215B] hover:bg-[#DDE3EF]',
  ghost: 'bg-transparent text-[#14215B] hover:bg-[#F2F4F1]',
  danger: 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50',
};

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; loading?: boolean }
> = ({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...props }) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
      size === 'sm' ? 'text-xs sm:text-sm px-3 py-2 min-h-[36px]' : 'text-sm px-4 sm:px-5 py-2.5 min-h-[42px]'
    } ${BTN_VARIANT[variant]} ${className}`}
    {...props}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

export const BtnLink: React.FC<{ to: string; variant?: BtnVariant; size?: 'sm' | 'md'; className?: string; children: React.ReactNode }> = ({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}) => (
  <Link
    to={to}
    className={`inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-colors ${
      size === 'sm' ? 'text-xs sm:text-sm px-3 py-2 min-h-[36px]' : 'text-sm px-4 sm:px-5 py-2.5 min-h-[42px]'
    } ${BTN_VARIANT[variant]} ${className}`}
  >
    {children}
  </Link>
);

// ---------------------------------------------------------------------------
// Champs de formulaire
// ---------------------------------------------------------------------------

const INPUT_BASE =
  'w-full bg-white border border-[#D5DAD4] rounded-lg px-3 py-2.5 text-sm text-[#1F2937] outline-none transition-colors focus:border-[#0B4A2F] focus:ring-2 focus:ring-[#0B4A2F]/15 placeholder:text-gray-400 disabled:bg-[#F3F4F2] disabled:text-gray-500';

export const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, error, className = '', children }) => (
  <div className={className}>
    <label className="block text-sm font-semibold text-[#27315F] mb-1.5">
      {label}
      {required && <span className="text-rose-600 ms-0.5">*</span>}
    </label>
    {children}
    {error ? (
      <p className="text-xs font-semibold text-rose-600 mt-1">{error}</p>
    ) : (
      hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>
    )}
  </div>
);

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { leading?: React.ReactNode; trailing?: React.ReactNode }
>(({ leading, trailing, className = '', ...props }, ref) => (
  <div className="relative">
    {leading && <span className="absolute inset-y-0 start-3 flex items-center text-gray-500 pointer-events-none">{leading}</span>}
    <input ref={ref} className={`${INPUT_BASE} ${leading ? 'ps-10' : ''} ${trailing ? 'pe-10' : ''} ${className}`} {...props} />
    {trailing && <span className="absolute inset-y-0 end-3 flex items-center text-gray-500">{trailing}</span>}
  </div>
));
TextInput.displayName = 'TextInput';

export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { leading?: React.ReactNode }> = ({
  leading,
  className = '',
  children,
  ...props
}) => (
  <div className="relative">
    {leading && <span className="absolute inset-y-0 start-3 flex items-center text-gray-500 pointer-events-none">{leading}</span>}
    <select className={`${INPUT_BASE} appearance-none pe-9 ${leading ? 'ps-10' : ''} ${className}`} {...props}>
      {children}
    </select>
    <ChevronDown className="w-4 h-4 absolute top-1/2 -translate-y-1/2 end-3 text-gray-500 pointer-events-none" />
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { maxLength?: number }> = ({
  maxLength,
  value,
  className = '',
  ...props
}) => (
  <div className="relative">
    <textarea
      value={value}
      maxLength={maxLength}
      rows={3}
      className={`${INPUT_BASE} resize-none ${maxLength ? 'pb-6' : ''} ${className}`}
      {...props}
    />
    {maxLength && (
      <span className="absolute bottom-2 end-3 text-[11px] text-gray-400">
        {String(value ?? '').length}/{maxLength}
      </span>
    )}
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string }> = ({
  checked,
  onChange,
  disabled,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${checked ? 'bg-[#0B6B3E]' : 'bg-gray-300'}`}
  >
    <span
      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`}
    />
  </button>
);

export const SearchBox: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string; className?: string }> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-gray-500 pointer-events-none" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${INPUT_BASE} ps-9`}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded text-gray-400 hover:text-gray-600"
        aria-label="clear"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Tableaux
// ---------------------------------------------------------------------------

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full text-sm text-start border-collapse">{children}</table>
  </div>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <th
    className={`bg-[#F1F4F8] text-[#27315F] font-semibold text-xs px-3 py-3 text-start whitespace-nowrap first:rounded-s-lg last:rounded-e-lg ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <td className={`px-3 py-3 border-b border-[#EEF0EC] text-[#374151] align-middle ${className}`} {...props}>
    {children}
  </td>
);

export const EmptyRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-gray-500">
      {message}
    </td>
  </tr>
);

export const Pagination: React.FC<{
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  summary?: (from: number, to: number, total: number) => string;
}> = ({ page, pageSize, total, onChange, summary }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2,
  );
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      {summary && <p className="text-sm text-gray-600">{summary(from, to, total)}</p>}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F1F3F0] text-gray-600 disabled:opacity-40"
          aria-label="previous"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        {pages.map((p, idx) => (
          <React.Fragment key={p}>
            {idx > 0 && p - pages[idx - 1] > 1 && <span className="text-gray-400 px-1">…</span>}
            <button
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-full text-sm font-bold ${
                p === page ? 'bg-[#0B4A2F] text-white' : 'text-[#14215B] hover:bg-[#F1F3F0]'
              }`}
            >
              {p}
            </button>
          </React.Fragment>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F1F3F0] text-gray-600 disabled:opacity-40"
          aria-label="next"
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Navigation interne
// ---------------------------------------------------------------------------

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: React.ReactNode;
}

export function Tabs<K extends string>({ tabs, active, onChange }: { tabs: TabItem<K>[]; active: K; onChange: (key: K) => void }) {
  return (
    <div className={`bg-white rounded-xl border ${BORDER} overflow-x-auto`}>
      <div className="flex min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap ${
              tab.key === active ? 'border-[#0B4A2F] text-[#14215B]' : 'border-transparent text-gray-600 hover:text-[#14215B]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const Stepper: React.FC<{ steps: string[]; current: number }> = ({ steps, current }) => (
  <ol className="flex items-start w-full">
    {steps.map((label, idx) => {
      const done = idx < current;
      const active = idx === current;
      return (
        <li key={label} className="flex-1 flex flex-col items-center relative min-w-0">
          {idx > 0 && (
            <span
              className={`absolute top-4 h-0.5 end-1/2 w-full -z-0 ${idx <= current ? 'bg-[#0B4A2F]' : 'bg-[#D9DED8]'}`}
              aria-hidden
            />
          )}
          <span
            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              done
                ? 'bg-[#0B4A2F] border-[#0B4A2F] text-white'
                : active
                  ? 'bg-[#0B4A2F] border-[#0B4A2F] text-white ring-4 ring-[#0B4A2F]/15'
                  : 'bg-[#E9EDF5] border-[#E9EDF5] text-[#14215B]'
            }`}
          >
            {done ? <Check className="w-4 h-4" strokeWidth={3} /> : idx + 1}
          </span>
          <span
            className={`mt-2 text-[11px] sm:text-sm text-center px-1 ${active ? `font-bold ${NAVY}` : 'text-[#27315F]'}`}
          >
            {label}
          </span>
        </li>
      );
    })}
  </ol>
);

// ---------------------------------------------------------------------------
// Encarts
// ---------------------------------------------------------------------------

const INFO_TONE: Record<'blue' | 'gold' | 'green' | 'red', string> = {
  blue: 'bg-[#EEF4FC] border-[#DCE7F7]',
  gold: 'bg-[#FFF8EA] border-[#F5E5C2]',
  green: 'bg-[#F0F8F2] border-[#D9ECDF]',
  red: 'bg-[#FDF2F2] border-[#F4D6D6]',
};

export const InfoCard: React.FC<{
  tone?: 'blue' | 'gold' | 'green' | 'red';
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'blue', icon, title, children, className = '' }) => (
  <div className={`rounded-xl border p-4 ${INFO_TONE[tone]} ${className}`}>
    <div className="flex items-start gap-3">
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div className="min-w-0 text-sm text-[#374151]">
        {title && <p className={`font-bold mb-1 ${NAVY}`}>{title}</p>}
        {children}
      </div>
    </div>
  </div>
);

export const ImageBanner: React.FC<{ image: string; title: string; className?: string; imagePosition?: string }> = ({
  image,
  title,
  className = '',
  imagePosition = 'left center',
}) => (
  <div className={`relative overflow-hidden rounded-xl min-h-[120px] ${className}`}>
    <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: imagePosition }} />
    <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent via-[#06301E]/40 to-[#06301E]/95" />
    <div className="relative h-full flex items-center justify-end p-4 sm:p-5">
      <div className="max-w-[62%] min-w-0">
        <p className="text-white font-bold text-sm sm:text-base leading-snug whitespace-pre-line break-words hyphens-auto">{title}</p>
        <span className="block w-10 h-0.5 bg-[#F4B63F] mt-2" />
      </div>
    </div>
  </div>
);

export const NeedHelpCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation('producer');
  return (
    <Panel className={className}>
      <div className="flex items-start gap-3">
        <Headset className="w-6 h-6 text-[#14215B] shrink-0" />
        <div>
          <p className={`font-bold ${NAVY}`}>{t('help.title')}</p>
          <p className="text-sm text-gray-600 mt-1">{t('help.body')}</p>
        </div>
      </div>
      <BtnLink to="/producteur/aide?tab=contact" variant="outline" className="w-full mt-4 border-[#0B4A2F]">
        {t('help.cta')}
      </BtnLink>
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// États
// ---------------------------------------------------------------------------

export const LoadingBlock: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-gray-500 ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin" />
      {t('status.loading')}
    </div>
  );
};

export const ErrorBlock: React.FC<{ message?: string; className?: string }> = ({ message, className = '' }) => {
  const { t } = useTranslation('common');
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 ${className}`}>
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message ?? t('status.error')}
    </div>
  );
};

export const Notice: React.FC<{ tone: 'success' | 'error'; children: React.ReactNode; onClose?: () => void; className?: string }> = ({
  tone,
  children,
  onClose,
  className = '',
}) => (
  <div
    className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
      tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'
    } ${className}`}
  >
    {tone === 'success' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
    <span className="flex-1">{children}</span>
    {onClose && (
      <button onClick={onClose} className="p-0.5 opacity-60 hover:opacity-100" aria-label="close">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Menus déroulants
// ---------------------------------------------------------------------------

export function useClickOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

export interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export const ActionMenu: React.FC<{ actions: MenuAction[]; label?: string }> = ({ actions, label = 'actions' }) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-md border border-[#E1E5DF] bg-white flex items-center justify-center text-gray-600 hover:bg-[#F6F7F5]"
        aria-label={label}
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-52 bg-white border border-[#E6E8E3] rounded-lg shadow-lg z-30 py-1">
          {actions.map((action) => (
            <button
              key={action.label}
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-start disabled:opacity-40 ${
                action.danger ? 'text-rose-700 hover:bg-rose-50' : 'text-[#1F2937] hover:bg-[#F6F7F5]'
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

type FixedPreset = Exclude<RangePreset, 'CUSTOM'>;
const DEFAULT_PRESETS: FixedPreset[] = ['THIS_MONTH', 'LAST_MONTH', 'LAST_30_DAYS', 'LAST_3_MONTHS', 'THIS_YEAR', 'ALL_TIME'];

// Sélecteur de période : préréglages + dates personnalisées.
export const DateRangePicker: React.FC<{
  preset: RangePreset;
  range: DateRange;
  onChange: (preset: RangePreset, range: DateRange) => void;
  presets?: FixedPreset[];
}> = ({ preset, range, onChange, presets = DEFAULT_PRESETS }) => {
  const { t, i18n } = useTranslation('producer');
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(toInputDate(range.from));
  const [to, setTo] = useState(toInputDate(range.to));
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    setFrom(toInputDate(range.from));
    setTo(toInputDate(range.to));
  }, [range]);

  const label =
    preset === 'ALL_TIME'
      ? t('range.ALL_TIME')
      : `${formatDate(range.from, i18n.language)} – ${formatDate(range.to, i18n.language)}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-white border border-[#D5DAD4] rounded-lg px-3 py-2.5 text-sm font-semibold text-[#14215B] hover:bg-[#F6F7F5] min-h-[42px]"
        aria-expanded={open}
      >
        <CalendarDays className="w-4 h-4" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-72 bg-white border border-[#E6E8E3] rounded-xl shadow-lg z-30 p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => {
                  onChange(p, presetRange(p));
                  setOpen(false);
                }}
                className={`px-2 py-2 rounded-md text-xs font-bold text-start ${
                  preset === p ? 'bg-[#0B4A2F] text-white' : 'bg-[#F4F6F3] text-[#14215B] hover:bg-[#E9EDE8]'
                }`}
              >
                {t(`range.${p}`)}
              </button>
            ))}
          </div>
          <div className="border-t border-[#EEF0EC] mt-3 pt-3 space-y-2">
            <p className="text-xs font-bold text-[#27315F]">{t('range.CUSTOM')}</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT_BASE} aria-label={t('range.from')} />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT_BASE} aria-label={t('range.to')} />
            </div>
            <Btn
              size="sm"
              className="w-full"
              disabled={!from || !to || from > to}
              onClick={() => {
                const [fy, fm, fd] = from.split('-').map(Number);
                const [ty, tm, td] = to.split('-').map(Number);
                onChange('CUSTOM', { from: new Date(fy, fm - 1, fd), to: endOfDay(new Date(ty, tm - 1, td)) });
                setOpen(false);
              }}
            >
              {t('range.apply')}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductThumb: React.FC<{ src?: string; alt: string; size?: number }> = ({ src, alt, size = 40 }) => (
  <span
    className="inline-flex items-center justify-center rounded-md bg-[#FBF3E2] overflow-hidden shrink-0"
    style={{ width: size, height: size }}
  >
    {src ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : <span className="text-[#D08C1A] text-lg">🍯</span>}
  </span>
);
