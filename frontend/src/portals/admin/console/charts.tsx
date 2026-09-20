import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCompact, formatNumber } from './format';
import { OTHER_COLOR } from './ui';

// Graphiques SVG sans dépendance. Règles : une seule échelle par graphique,
// traits fins, grille discrète en traits pleins, légende dès deux séries,
// survol systématique (repère vertical sur les courbes, info-bulle par barre).

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

const Tooltip: React.FC<{ x: number; width: number; title: string; rows: { color?: string; label: string; value: string }[] }> = ({
  x,
  width,
  title,
  rows,
}) => {
  const flip = x > width - 170;
  return (
    <div
      className="absolute top-1 z-10 pointer-events-none bg-white border border-[#EAE1D2] rounded-lg shadow-md px-2.5 py-2 text-xs min-w-[130px]"
      style={flip ? { right: width - x + 10 } : { left: x + 10 }}
    >
      <p className="font-bold text-[#0C261B] mb-1 whitespace-nowrap">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-1.5 whitespace-nowrap text-[#3F4A44]">
          {row.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />}
          <span className="flex-1">{row.label}</span>
          <span className="font-bold text-[#0C261B] tabular-nums ms-2">{row.value}</span>
        </p>
      ))}
    </div>
  );
};

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export const Legend: React.FC<{ items: { label: string; color: string; value?: string }[]; className?: string }> = ({ items, className = '' }) => (
  <ul className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
    {items.map((item) => (
      <li key={item.label} className="flex items-center gap-1.5 text-xs text-[#3F4A44]">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        {item.label}
        {item.value && <span className="font-bold text-[#0C261B] tabular-nums">{item.value}</span>}
      </li>
    ))}
  </ul>
);

export const LineChart: React.FC<{
  labels: string[];
  series: Series[];
  height?: number;
  area?: boolean;
  formatValue?: (value: number) => string;
  emptyLabel: string;
  showLegend?: boolean;
}> = ({ labels, series, height = 220, area = false, formatValue, emptyLabel, showLegend = true }) => {
  const { i18n } = useTranslation();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = formatValue ?? ((v: number) => formatNumber(v, i18n.language));

  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const isEmpty = series.every((s) => s.values.every((v) => v === 0));
  const pad = { top: 10, right: 12, bottom: 24, left: 40 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const stepX = labels.length > 1 ? plotW / (labels.length - 1) : 0;
  const x = (i: number) => pad.left + (labels.length > 1 ? i * stepX : plotW / 2);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const labelEvery = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(plotW / 64))));

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    // La zone de survol déborde d'un demi-pas de chaque côté du tracé.
    const index = labels.length > 1 ? Math.round((offset - stepX / 2) / stepX) : 0;
    setHover(Math.max(0, Math.min(labels.length - 1, index)));
  };

  return (
    <div>
      {showLegend && series.length > 1 && <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} className="mb-2" />}
      <div ref={ref} className="relative" dir="ltr">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(', ')}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#EEF0EC" />
                <text x={pad.left - 8} y={y(tick) + 3.5} textAnchor="end" fontSize={10} fill="#8C978F">
                  {formatCompact(tick, i18n.language)}
                </text>
              </g>
            ))}
            {labels.map((label, i) =>
              i % labelEvery === 0 || i === labels.length - 1 ? (
                <text key={`${label}-${i}`} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="#8C978F">
                  {label}
                </text>
              ) : null,
            )}
            {!isEmpty &&
              series.map((s) => {
                const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
                return (
                  <g key={s.key}>
                    {area && (
                      <polygon
                        points={`${x(0)},${y(0)} ${points} ${x(s.values.length - 1)},${y(0)}`}
                        fill={s.color}
                        opacity={0.08}
                      />
                    )}
                    <polyline points={points} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    {labels.length <= 31 &&
                      s.values.map((v, i) => (
                        <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 4 : 2.5} fill="#fff" stroke={s.color} strokeWidth={2} />
                      ))}
                  </g>
                );
              })}
            {hover !== null && !isEmpty && (
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke="#C6CFC8" />
            )}
            <rect
              x={pad.left - (stepX / 2 || 0)}
              y={pad.top}
              width={plotW + (stepX || 0)}
              height={plotH}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            />
          </svg>
        )}
        {isEmpty && <p className="absolute inset-0 grid place-items-center text-sm text-gray-400">{emptyLabel}</p>}
        {hover !== null && !isEmpty && (
          <Tooltip
            x={x(hover)}
            width={width}
            title={labels[hover]}
            rows={series.map((s) => ({ color: s.color, label: s.label, value: fmt(s.values[hover] ?? 0) }))}
          />
        )}
      </div>
    </div>
  );
};

export const BarChart: React.FC<{
  labels: string[];
  values: number[];
  color: string;
  label: string;
  height?: number;
  highlightLast?: boolean;
  formatValue?: (value: number) => string;
  emptyLabel: string;
  tooltipTitles?: string[];
}> = ({ labels, values, color, label, height = 220, highlightLast = false, formatValue, emptyLabel, tooltipTitles }) => {
  const { i18n } = useTranslation();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = formatValue ?? ((v: number) => formatNumber(v, i18n.language));

  const max = niceMax(Math.max(0, ...values));
  const isEmpty = values.every((v) => v === 0);
  const pad = { top: 10, right: 8, bottom: 24, left: 40 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const slot = values.length ? plotW / values.length : 0;
  const barW = Math.max(4, Math.min(34, slot * 0.62));
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const labelEvery = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(plotW / 44))));

  return (
    <div ref={ref} className="relative" dir="ltr">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#EEF0EC" />
              <text x={pad.left - 8} y={y(tick) + 3.5} textAnchor="end" fontSize={10} fill="#8C978F">
                {formatCompact(tick, i18n.language)}
              </text>
            </g>
          ))}
          {values.map((v, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const h = Math.max(v > 0 ? 2 : 0, pad.top + plotH - y(v));
            const top = pad.top + plotH - h;
            const r = Math.min(4, barW / 2, h);
            const faded = highlightLast && i !== values.length - 1 && hover !== i;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={cx - slot / 2} y={pad.top} width={slot} height={plotH} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M${cx - barW / 2},${pad.top + plotH} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${pad.top + plotH} Z`}
                    fill={color}
                    opacity={faded ? 0.55 : 1}
                  />
                )}
                {(i % labelEvery === 0 || i === values.length - 1) && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize={10} fill="#8C978F">
                    {labels[i]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {isEmpty && <p className="absolute inset-0 grid place-items-center text-sm text-gray-400">{emptyLabel}</p>}
      {hover !== null && !isEmpty && (
        <Tooltip
          x={pad.left + slot * hover + slot / 2}
          width={width}
          title={tooltipTitles?.[hover] ?? labels[hover]}
          rows={[{ color, label, value: fmt(values[hover]) }]}
        />
      )}
    </div>
  );
};

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  emptyLabel: string;
  layout?: 'side' | 'stacked';
  valueFormat?: (value: number) => string;
}> = ({ slices, centerValue, centerLabel, size = 168, emptyLabel, layout = 'side', valueFormat }) => {
  const { i18n } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = valueFormat ?? ((v: number) => formatNumber(v, i18n.language));
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2;
  const thickness = size * 0.17;
  const inner = radius - thickness;
  // Espace de 2 px entre segments, converti en angle sur le rayon moyen.
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 2 / (radius - thickness / 2) : 0;

  let angle = -Math.PI / 2;
  const arcs = slices.map((slice) => {
    const sweep = total > 0 ? (slice.value / total) * Math.PI * 2 : 0;
    const start = angle;
    angle += sweep;
    return { ...slice, start: start + (sweep > gap ? gap / 2 : 0), end: angle - (sweep > gap ? gap / 2 : 0), sweep };
  });

  const arcPath = (start: number, end: number, outer: number, innerR: number): string => {
    if (end - start >= Math.PI * 2 - 0.0001) {
      const mid = start + Math.PI;
      return `${arcPath(start, mid, outer, innerR)} ${arcPath(mid, end, outer, innerR)}`;
    }
    const large = end - start > Math.PI ? 1 : 0;
    const p = (r: number, a: number) => `${radius + r * Math.cos(a)},${radius + r * Math.sin(a)}`;
    return `M${p(outer, start)} A${outer},${outer} 0 ${large} 1 ${p(outer, end)} L${p(innerR, end)} A${innerR},${innerR} 0 ${large} 0 ${p(innerR, start)} Z`;
  };

  return (
    <div className={`flex ${layout === 'side' ? 'flex-col sm:flex-row items-center' : 'flex-col items-center'} gap-5`}>
      <div className="relative shrink-0" style={{ width: size, height: size }} dir="ltr">
        <svg width={size} height={size} role="img" aria-label={slices.map((s) => `${s.label} ${fmt(s.value)}`).join(', ')}>
          {total === 0 ? (
            <circle cx={radius} cy={radius} r={radius - thickness / 2} fill="none" stroke="#EEF0EC" strokeWidth={thickness} />
          ) : (
            arcs.map((arc, i) =>
              arc.sweep > 0 ? (
                <path
                  key={arc.key}
                  d={arcPath(arc.start, arc.end, hover === i ? radius : radius - 3, inner)}
                  fill={arc.color}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              ) : null,
            )
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-7">
          <span className="text-xl font-extrabold text-[#0C261B] leading-none tabular-nums">
            {hover !== null ? fmt(slices[hover].value) : centerValue}
          </span>
          <span className="text-[11px] text-[#6B7A71] mt-1 leading-tight">{hover !== null ? slices[hover].label : centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 min-w-0">
        {total === 0 && <li className="text-sm text-gray-400 text-center">{emptyLabel}</li>}
        {total > 0 &&
          slices.map((slice, i) => (
            <li
              key={slice.key}
              className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 text-[13px] rounded-md px-1 py-0.5 ${hover === i ? 'bg-[#F6F4EE]' : ''}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="text-[#1F2A24] truncate">{slice.label}</span>
              <span className="font-bold text-[#0C261B] tabular-nums">{fmt(slice.value)}</span>
              <span className="text-[#6B7A71] tabular-nums w-12 text-end">
                {formatNumber((slice.value / total) * 100, i18n.language, 1)}%
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
};

/** Classement horizontal : une seule série, une seule couleur, valeurs visibles. */
export const RankBars: React.FC<{
  rows: { key: string; label: React.ReactNode; value: number; leading?: React.ReactNode; trailing?: React.ReactNode }[];
  color?: string;
  formatValue?: (value: number) => string;
  emptyLabel: string;
  max?: number;
}> = ({ rows, color = '#1F7A4D', formatValue, emptyLabel, max }) => {
  const { i18n } = useTranslation();
  const fmt = formatValue ?? ((v: number) => formatNumber(v, i18n.language));
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">{emptyLabel}</p>;
  const highest = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-2.5 min-w-0">
          {row.leading}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-[#1F2A24] truncate">{row.label}</span>
              <span className="text-[13px] font-bold text-[#0C261B] tabular-nums shrink-0">{fmt(row.value)}</span>
            </div>
            <div className="h-1.5 mt-1 rounded-full bg-[#EEF1ED] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(row.value / highest) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
          {row.trailing}
        </li>
      ))}
    </ul>
  );
};

/** Entonnoir : barres centrées de longueur proportionnelle, une seule teinte. */
export const Funnel: React.FC<{ stages: { key: string; label: string; count: number; share: number }[]; color?: string }> = ({
  stages,
  color = '#1F7A4D',
}) => {
  const { i18n } = useTranslation();
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <ul className="space-y-2">
      {stages.map((stage) => (
        <li key={stage.key} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-3">
          <div className="h-8 flex items-center justify-center" dir="ltr">
            <div
              className="h-full rounded-md grid place-items-center text-[11px] font-bold text-white tabular-nums"
              style={{ width: `${Math.max(12, (stage.count / max) * 100)}%`, backgroundColor: color }}
            >
              {formatNumber(stage.share, i18n.language, 1)}%
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-[#1F2A24] truncate">{stage.label}</p>
            <p className="text-xs font-bold text-[#0C261B] tabular-nums">{formatNumber(stage.count, i18n.language)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Mini histogramme d'accompagnement d'un indicateur. */
export const MiniBars: React.FC<{ values: number[]; color?: string; height?: number; labels?: string[] }> = ({
  values,
  color = '#1F7A4D',
  height = 48,
  labels,
}) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }} dir="ltr">
      {values.map((v, i) => (
        <div
          key={i}
          title={labels ? `${labels[i]} : ${v}` : String(v)}
          className="flex-1 rounded-t-[3px] min-w-[6px]"
          style={{ height: `${Math.max(6, (v / max) * 100)}%`, backgroundColor: color, opacity: i === values.length - 1 ? 1 : 0.7 }}
        />
      ))}
    </div>
  );
};

export { OTHER_COLOR };
