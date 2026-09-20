import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Search, X } from 'lucide-react';

// Langage visuel du portail vérificateur : mêmes encres que le reste du site
// (vert Kounouz, or, crème) appliquées à une interface dense de back-office.

export const INK = '#0C261B';
export const GOLD = '#D49B37';
export const LINE = '#EAE1D2';
export const CREAM = '#FAF6EE';

export type Tone = 'neutral' | 'amber' | 'blue' | 'green' | 'red' | 'violet';

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-[#F1F3F0] text-[#0C261B] border-[#D5DAD4]',
  amber: 'bg-[#FDF6E7] text-[#96661A] border-[#EFD9A8]',
  blue: 'bg-[#EAF1FB] text-[#1D4E89] border-[#C3D8F0]',
  green: 'bg-[#E8F5EC] text-[#17693F] border-[#BFE0CB]',
  red: 'bg-[#FDF2F2] text-[#B42323] border-[#F3CFCF]',
  violet: 'bg-[#F1EDFB] text-[#5B3FA8] border-[#D8CCF2]',
};

export const TONE_DOTS: Record<Tone, string> = {
  neutral: '#9AA69F',
  amber: '#D49B37',
  blue: '#3B7DD8',
  green: '#17693F',
  red: '#C7452F',
  violet: '#7C5BD1',
};

// --- Structure de page ---------------------------------------------------

export interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumb: React.FC<{ items: Crumb[] }> = ({ items }) => (
  <nav className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mb-2">
    {items.map((item, index) => (
      <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
        {index > 0 && <span aria-hidden className="text-[#C6CFC8]">›</span>}
        {item.to ? (
          <Link to={item.to} className="hover:text-[#0C261B] hover:underline">
            {item.label}
          </Link>
        ) : (
          <span className="text-[#0C261B] font-semibold">{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
    <div className="min-w-0">
      <h1 className="text-2xl font-extrabold text-[#0C261B]">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Panel: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, icon, actions, className = '', bodyClassName = '', children }) => (
  <section className={`bg-white border border-[#EAE1D2] rounded-xl ${className}`}>
    {(title || actions) && (
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#EAE1D2]">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#0C261B]">
          {icon}
          {title}
        </h2>
        {actions}
      </header>
    )}
    <div className={`p-4 ${bodyClassName}`}>{children}</div>
  </section>
);

// --- Boutons -------------------------------------------------------------

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-[#0C261B] text-white hover:bg-[#123626] border-transparent',
  secondary: 'bg-white text-[#0C261B] border-[#EAE1D2] hover:border-[#D49B37]',
  ghost: 'bg-transparent text-[#0C261B] border-transparent hover:bg-[#FAF6EE]',
  danger: 'bg-white text-[#B42323] border-[#F3CFCF] hover:bg-[#FDF2F2]',
  success: 'bg-[#17693F] text-white hover:bg-[#125633] border-transparent',
};

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant;
    size?: 'sm' | 'md';
    isLoading?: boolean;
  }
> = ({ variant = 'primary', size = 'md', isLoading, className = '', children, disabled, ...props }) => (
  <button
    {...props}
    disabled={disabled || isLoading}
    className={`inline-flex items-center justify-center gap-2 rounded-lg border font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      size === 'sm' ? 'text-xs px-3 py-1.5 min-h-[34px]' : 'text-sm px-4 py-2 min-h-[40px]'
    } ${BTN_VARIANTS[variant]} ${className}`}
  >
    {isLoading && (
      <span
        aria-hidden
        className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
      />
    )}
    {children}
  </button>
);

// --- Indicateurs ---------------------------------------------------------

export const KpiCard: React.FC<{
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  tone?: Tone;
  /** Variation en %. `null` = non calculable (mois de référence vide). */
  delta?: number | null;
  deltaLabel?: string;
  noDeltaLabel?: string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, value, icon, tone = 'neutral', delta, deltaLabel, noDeltaLabel, hint, active, onClick }) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className={`text-start bg-white border rounded-xl p-4 w-full transition-colors ${
        active ? 'border-[#D49B37] ring-1 ring-[#D49B37]/30' : 'border-[#EAE1D2]'
      } ${onClick ? 'hover:border-[#D49B37] cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        {icon && (
          <span className={`w-8 h-8 rounded-lg grid place-items-center border ${TONE_CLASSES[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-[#0C261B] mt-2 tabular-nums">{value}</p>
      {delta !== undefined && (
        <p className="text-xs mt-1">
          {delta === null ? (
            <span className="text-gray-400">{noDeltaLabel}</span>
          ) : (
            <>
              <span
                className={`font-bold tabular-nums ${delta > 0 ? 'text-[#17693F]' : delta < 0 ? 'text-[#B42323]' : 'text-gray-500'}`}
              >
                {delta > 0 ? '+' : ''}
                {delta}%
              </span>{' '}
              <span className="text-gray-400">{deltaLabel}</span>
            </>
          )}
        </p>
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </Wrapper>
  );
};

export const StatusPill: React.FC<{ tone: Tone; label: string; className?: string }> = ({
  tone,
  label,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
  >
    <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TONE_DOTS[tone] }} />
    {label}
  </span>
);

// --- Étapes --------------------------------------------------------------

export type StepState = 'DONE' | 'CURRENT' | 'TODO';

export const Stepper: React.FC<{
  steps: { label: string; state: StepState; hint?: string }[];
  currentLabel?: string;
}> = ({ steps, currentLabel }) => (
  <ol className="flex items-start gap-1 overflow-x-auto pb-1">
    {steps.map((step, index) => (
      <li key={step.label} className="flex items-start gap-1 min-w-0 shrink-0">
        <div className="flex flex-col items-center gap-1.5 w-28 text-center">
          <span
            className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold border-2 ${
              step.state === 'DONE'
                ? 'bg-[#17693F] border-[#17693F] text-white'
                : step.state === 'CURRENT'
                  ? 'bg-white border-[#D49B37] text-[#D49B37]'
                  : 'bg-white border-[#DCE3DD] text-[#9AA69F]'
            }`}
          >
            {step.state === 'DONE' ? <Check className="w-3.5 h-3.5" /> : index + 1}
          </span>
          <span
            className={`text-[11px] leading-tight ${
              step.state === 'TODO' ? 'text-gray-400' : 'text-[#0C261B] font-semibold'
            }`}
          >
            {step.label}
          </span>
          {step.hint && <span className="text-[10px] text-gray-400 leading-tight">{step.hint}</span>}
          {step.state === 'CURRENT' && currentLabel && (
            <span className="text-[10px] font-bold text-[#D49B37]">{currentLabel}</span>
          )}
        </div>
        {index < steps.length - 1 && (
          <span
            aria-hidden
            className={`h-0.5 w-6 mt-3.5 rounded-full ${step.state === 'DONE' ? 'bg-[#17693F]' : 'bg-[#DCE3DD]'}`}
          />
        )}
      </li>
    ))}
  </ol>
);

// --- Onglets -------------------------------------------------------------

export interface TabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
  tone?: Tone;
}

export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
  variant = 'pill',
}: {
  tabs: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  variant?: 'pill' | 'underline';
}) {
  if (variant === 'underline') {
    return (
      <div className="flex gap-1 overflow-x-auto border-b border-[#EAE1D2]" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-3.5 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active === tab.key
                ? 'border-[#D49B37] text-[#0C261B]'
                : 'border-transparent text-gray-500 hover:text-[#0C261B]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ms-1.5 tabular-nums text-xs">({tab.count})</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors min-h-[38px] ${
            active === tab.key
              ? 'bg-[#0C261B] text-white border-[#0C261B]'
              : 'bg-white text-[#0C261B] border-[#EAE1D2] hover:border-[#D49B37]'
          }`}
        >
          {tab.tone && active !== tab.key && (
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: TONE_DOTS[tab.tone] }}
            />
          )}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`tabular-nums text-xs rounded px-1.5 py-0.5 ${
                active === tab.key ? 'bg-white/15' : 'bg-[#F1F3F0]'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// --- Tableaux ------------------------------------------------------------

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full text-sm border-collapse">{children}</table>
  </div>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <th
    {...props}
    className={`text-start text-[11px] font-bold uppercase tracking-wide text-[#9AA69F] px-3 py-2.5 border-b border-[#EAE1D2] whitespace-nowrap ${className}`}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <td {...props} className={`px-3 py-2.5 border-b border-[#F1EDE3] align-middle ${className}`}>
    {children}
  </td>
);

export const EmptyRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-gray-400">
      {message}
    </td>
  </tr>
);

export const Pagination: React.FC<{
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  summary: (from: number, to: number, total: number) => string;
}> = ({ page, pageCount, total, pageSize, onChange, summary }) => {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Fenêtre glissante de 5 pages autour de la page courante, avec ellipse vers
  // la dernière page pour rester lisible sur de gros volumes.
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3">
      <p className="text-xs text-gray-500">{summary(from, to, total)}</p>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </PageBtn>
        {start > 1 && (
          <>
            <PageBtn onClick={() => onChange(1)}>1</PageBtn>
            {start > 2 && <span className="px-1 text-gray-400">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageBtn key={p} active={p === page} onClick={() => onChange(p)}>
            {p}
          </PageBtn>
        ))}
        {end < pageCount && (
          <>
            {end < pageCount - 1 && <span className="px-1 text-gray-400">…</span>}
            <PageBtn onClick={() => onChange(pageCount)}>{pageCount}</PageBtn>
          </>
        )}
        <PageBtn disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </PageBtn>
      </div>
    </div>
  );
};

const PageBtn: React.FC<{
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ children, active, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      active
        ? 'bg-[#0C261B] text-white border-[#0C261B]'
        : 'bg-white text-[#0C261B] border-[#EAE1D2] hover:border-[#D49B37]'
    }`}
  >
    {children}
  </button>
);

// --- Saisie --------------------------------------------------------------

export const SearchBox: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`relative ${className}`}>
    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full ps-9 pe-9 py-2 min-h-[40px] rounded-lg border border-[#EAE1D2] bg-white text-sm text-[#0C261B] placeholder:text-gray-400 focus:outline-none focus:border-[#D49B37]"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        aria-label="clear"
        className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-[#0C261B]"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, required, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-bold text-[#0C261B] mb-1">
      {label}
      {required && <span className="text-[#B42323] ms-0.5">*</span>}
    </span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
  </label>
);

const CONTROL =
  'w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#EAE1D2] bg-white text-sm text-[#0C261B] placeholder:text-gray-400 focus:outline-none focus:border-[#D49B37] disabled:bg-[#F6F7F5] disabled:text-gray-400';

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => <input {...props} className={`${CONTROL} ${className}`} />;

export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <select {...props} className={`${CONTROL} ${className}`}>
    {children}
  </select>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  ...props
}) => <textarea {...props} className={`${CONTROL} min-h-[90px] py-2 ${className}`} />;

// --- États ---------------------------------------------------------------

export const LoadingBlock: React.FC<{ label: string; className?: string }> = ({
  label,
  className = '',
}) => (
  <div className={`py-10 text-center text-sm text-gray-400 ${className}`} role="status">
    {label}
  </div>
);

export const EmptyBlock: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <div className="py-12 text-center">
    {icon && <div className="mx-auto mb-3 w-10 h-10 grid place-items-center text-[#C6CFC8]">{icon}</div>}
    <p className="text-sm font-bold text-[#0C261B]">{title}</p>
    {description && <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const InlineError: React.FC<{ message: string }> = ({ message }) => (
  <p className="text-xs font-semibold text-[#B42323] bg-[#FDF2F2] border border-[#F3CFCF] rounded-lg px-3 py-2">
    {message}
  </p>
);

// --- Graphiques ----------------------------------------------------------

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/**
 * Courbe multi-séries en SVG, sans dépendance — même parti pris que les
 * graphiques du portail producteur : une seule échelle, grille discrète,
 * légende dès deux séries, repère au survol.
 */
export const LineChart: React.FC<{
  labels: string[];
  series: LineSeries[];
  height?: number;
  emptyLabel: string;
}> = ({ labels, series, height = 240, emptyLabel }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const isEmpty = series.every((s) => s.values.every((v) => v === 0));
  const padding = { top: 12, right: 12, bottom: 28, left: 36 };
  const plotW = Math.max(0, width - padding.left - padding.right);
  const plotH = height - padding.top - padding.bottom;
  const stepX = labels.length > 1 ? plotW / (labels.length - 1) : 0;

  const x = (i: number) => padding.left + i * stepX;
  const y = (v: number) => padding.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <div>
      <div ref={ref} className="relative" dir="ltr">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(', ')}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="#EEF0EC"
                  strokeWidth={1}
                />
                <text x={padding.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
                  {tick}
                </text>
              </g>
            ))}

            {!isEmpty &&
              series.map((s) => (
                <polyline
                  key={s.key}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                />
              ))}

            {!isEmpty &&
              series.map((s) =>
                s.values.map((v, i) => (
                  <circle
                    key={`${s.key}-${i}`}
                    cx={x(i)}
                    cy={y(v)}
                    r={hover === i ? 4 : 2.5}
                    fill="#FFFFFF"
                    stroke={s.color}
                    strokeWidth={2}
                  />
                )),
              )}

            {labels.map((label, i) => (
              <g key={label}>
                <text x={x(i)} y={height - 8} textAnchor="middle" className="fill-gray-400 text-[10px]">
                  {label}
                </text>
                {/* Bande de survol invisible : le repère suit le mois le plus proche. */}
                <rect
                  x={x(i) - stepX / 2}
                  y={padding.top}
                  width={stepX || plotW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            ))}

            {hover !== null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={padding.top}
                y2={padding.top + plotH}
                stroke="#C6CFC8"
                strokeDasharray="3 3"
              />
            )}
          </svg>
        )}

        {isEmpty && (
          <p className="absolute inset-0 grid place-items-center text-sm text-gray-400">{emptyLabel}</p>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
        {series.map((s, index) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
            {hover !== null && (
              <span className="font-bold text-[#0C261B] tabular-nums">{series[index].values[hover]}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Répartition géographique des dossiers.
 *
 * Volontairement présentée en classement proportionnel plutôt qu'en carte
 * choroplèthe : une carte approximative des gouvernorats induirait en erreur
 * sur des données de traçabilité, là où la barre proportionnelle se lit sans
 * ambiguïté et reste exacte.
 */
export const RegionBreakdown: React.FC<{
  rows: { governorate: string; count: number }[];
  emptyLabel: string;
  max?: number;
}> = ({ rows, emptyLabel, max = 8 }) => {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyLabel}</p>;
  }
  const top = rows.slice(0, max);
  const highest = Math.max(...top.map((r) => r.count), 1);

  return (
    <ul className="space-y-2">
      {top.map((row) => (
        <li key={row.governorate} className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#0C261B] truncate">{row.governorate}</span>
            </div>
            <div className="h-1.5 mt-1 rounded-full bg-[#F1F3F0] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D49B37]"
                style={{ width: `${(row.count / highest) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-bold text-[#0C261B] tabular-nums w-8 text-end">{row.count}</span>
        </li>
      ))}
    </ul>
  );
};
