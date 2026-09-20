import React, { useEffect, useRef, useState } from 'react';

// Graphiques légers en SVG (pas de dépendance) suivant les règles du skill
// dataviz : un seul axe, barres fines (<= 24 px) à coin arrondi côté valeur,
// 2 px d'espace entre barres adjacentes, grille discrète, légende dès 2 séries,
// infobulle au survol, textes en encre neutre (jamais la couleur de la série).

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

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
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// Colonne à coin supérieur arrondi (4 px), base carrée sur la ligne de base.
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

export const BarChart: React.FC<{
  labels: string[];
  series: BarSeries[];
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
  height?: number;
  showValueLabels?: boolean;
  emptyLabel?: string;
}> = ({ labels, series, formatValue, formatAxis = formatValue, height = 240, showValueLabels = false, emptyLabel }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const isEmpty = series.every((s) => s.values.every((v) => v === 0));
  const padding = { top: showValueLabels ? 22 : 12, right: 8, bottom: 28, left: 48 };
  const plotW = Math.max(0, width - padding.left - padding.right);
  const plotH = height - padding.top - padding.bottom;
  const band = labels.length > 0 ? plotW / labels.length : 0;
  const gap = 2;
  const barW = Math.max(4, Math.min(24, (band * 0.7 - gap * (series.length - 1)) / Math.max(1, series.length)));
  const groupW = barW * series.length + gap * (series.length - 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <div className="w-full" dir="ltr">
      {series.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2 text-xs text-[#374151]">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(', ')}>
            {ticks.map((tick) => {
              const y = padding.top + plotH - (tick / max) * plotH;
              return (
                <g key={tick}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#EEF0EC" strokeWidth={1} />
                  <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#6B7280">
                    {formatAxis(tick)}
                  </text>
                </g>
              );
            })}
            {labels.map((label, i) => {
              const groupX = padding.left + band * i + (band - groupW) / 2;
              return (
                <g key={`${label}-${i}`}>
                  {hover === i && (
                    <rect x={padding.left + band * i} y={padding.top} width={band} height={plotH} fill="#F4F6F3" />
                  )}
                  {series.map((s, si) => {
                    const value = s.values[i] ?? 0;
                    const h = (value / max) * plotH;
                    const x = groupX + si * (barW + gap);
                    const y = padding.top + plotH - h;
                    return (
                      <g key={s.key}>
                        <path d={columnPath(x, y, barW, h)} fill={s.color} />
                        {showValueLabels && value > 0 && (
                          <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#374151">
                            {formatAxis(value)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text x={padding.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="#6B7280">
                    {label}
                  </text>
                  {/* Zone de survol plus large que les barres */}
                  <rect
                    x={padding.left + band * i}
                    y={0}
                    width={band}
                    height={height}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              );
            })}
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + plotH}
              y2={padding.top + plotH}
              stroke="#D5DAD4"
            />
          </svg>
        )}
        {isEmpty && emptyLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white/90 px-3 py-1.5 rounded-md text-xs text-gray-500">{emptyLabel}</span>
          </div>
        )}
        {hover !== null && width > 0 && (
          <div
            className="absolute z-10 pointer-events-none bg-white border border-[#E6E8E3] rounded-lg shadow-md px-3 py-2 text-xs"
            style={{
              top: 4,
              left: Math.min(Math.max(padding.left + band * hover + band / 2 - 80, 0), Math.max(0, width - 160)),
              width: 160,
            }}
          >
            <p className="font-bold text-[#14215B] mb-1">{labels[hover]}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-2 text-[#374151]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold">{formatValue(s.values[hover] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  data: DonutSlice[];
  centerValue: string;
  centerLabel?: string;
  formatValue: (value: number) => string;
  formatPercent: (value: number) => string;
  size?: number;
  emptyLabel: string;
  layout?: 'side' | 'stacked';
}> = ({ data, centerValue, centerLabel, formatValue, formatPercent, size = 170, emptyLabel, layout = 'side' }) => {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const thickness = size * 0.2;
  const inner = radius - thickness;

  let angle = -Math.PI / 2;
  const arcs = data.map((slice) => {
    const sweep = total > 0 ? (slice.value / total) * Math.PI * 2 : 0;
    const start = angle;
    angle += sweep;
    return { ...slice, start, end: angle, sweep };
  });

  const arcPath = (start: number, end: number, outer: number, innerR: number) => {
    // Un arc plein (100 %) est dessiné en deux moitiés.
    if (end - start >= Math.PI * 2 - 0.0001) {
      const mid = start + Math.PI;
      return `${arcPath(start, mid, outer, innerR)} ${arcPath(mid, end, outer, innerR)}`;
    }
    const large = end - start > Math.PI ? 1 : 0;
    const p = (r: number, a: number) => `${radius + r * Math.cos(a)},${radius + r * Math.sin(a)}`;
    return `M${p(outer, start)} A${outer},${outer} 0 ${large} 1 ${p(outer, end)} L${p(innerR, end)} A${innerR},${innerR} 0 ${large} 0 ${p(innerR, start)} Z`;
  };

  return (
    <div className={`flex ${layout === 'side' ? 'flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center' : 'flex-col items-center'} gap-5`}>
      <div className="relative shrink-0" style={{ width: size, height: size }} dir="ltr">
        <svg width={size} height={size} role="img" aria-label={data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')}>
          {total === 0 ? (
            <circle cx={radius} cy={radius} r={radius - thickness / 2} fill="none" stroke="#EEF0EC" strokeWidth={thickness} />
          ) : (
            arcs.map((arc, i) =>
              arc.sweep > 0 ? (
                <path
                  key={arc.label}
                  d={arcPath(arc.start, arc.end, hover === i ? radius : radius - 3, inner)}
                  fill={arc.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              ) : null,
            )
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
          <span className="text-xl sm:text-2xl font-extrabold text-[#14215B] leading-none">
            {hover !== null ? formatValue(data[hover].value) : centerValue}
          </span>
          <span className="text-xs text-gray-500 mt-1">{hover !== null ? data[hover].label : centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5 min-w-0">
        {total === 0 && <li className="text-sm text-gray-500 text-center">{emptyLabel}</li>}
        {total > 0 &&
          data.map((slice, i) => (
            <li
              key={slice.label}
              className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 text-sm rounded-md px-1 ${hover === i ? 'bg-[#F4F6F3]' : ''}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="text-[#1F2937] truncate">{slice.label}</span>
              <span className="font-semibold text-[#1F2937] tabular-nums">{formatValue(slice.value)}</span>
              <span className="text-gray-500 tabular-nums w-10 text-end">{formatPercent(slice.value / total)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
};
