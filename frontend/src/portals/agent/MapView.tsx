import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from './types';

export type MarkerKind = 'numbered' | 'home' | 'pin' | 'truck' | 'done' | 'destination' | 'dot';

export interface MapMarker {
  position: LatLng;
  kind: MarkerKind;
  label?: string | number;
  title?: string;
  onClick?: () => void;
}

export interface MapPath {
  points: LatLng[];
  color?: string;
  dashed?: boolean;
  /** Suit le réseau routier (OSRM) quand le service répond, sinon trace des segments droits. */
  followRoads?: boolean;
}

const INK = '#0C261B';
const GOLD = '#D49B37';

const ICON_SVG: Record<'home' | 'truck' | 'check' | 'flag', string> = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" fill="currentColor"/>',
  truck:
    '<path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z" fill="currentColor"/><circle cx="6" cy="17" r="2" fill="currentColor"/><circle cx="17" cy="17" r="2" fill="currentColor"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H7v9z" fill="currentColor"/>',
};

function svg(name: keyof typeof ICON_SVG, size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="color:#fff">${ICON_SVG[name]}</svg>`;
}

function iconFor(marker: MapMarker): L.DivIcon {
  const circle = (bg: string, inner: string, size = 28) =>
    L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;font:700 12px/1 Cairo,sans-serif">${inner}</div>`,
    });

  switch (marker.kind) {
    case 'numbered':
      return circle(INK, String(marker.label ?? ''));
    case 'done':
      return circle('#17693F', svg('check'));
    case 'home':
      return circle(GOLD, svg('home'), 30);
    case 'truck':
      return L.divIcon({
        className: '',
        iconSize: [34, 26],
        iconAnchor: [17, 13],
        html: `<div style="width:34px;height:26px;border-radius:8px;background:${INK};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:grid;place-items:center">${svg('truck', 16)}</div>`,
      });
    case 'destination':
      return circle('#C7452F', svg('flag'), 30);
    case 'dot':
      return circle(GOLD, '', 14);
    case 'pin':
    default:
      return L.divIcon({
        className: '',
        iconSize: [30, 40],
        iconAnchor: [15, 38],
        html: `<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.4 15 39 15 39s14-13.6 14-24.1C29 7.2 22.7 1 15 1z" fill="${INK}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>`,
      });
  }
}

const routeCache = new Map<string, LatLng[]>();

async function fetchRoadRoute(points: LatLng[], signal: AbortSignal): Promise<LatLng[]> {
  const key = points.map((p) => `${p.longitude.toFixed(5)},${p.latitude.toFixed(5)}`).join(';');
  const cached = routeCache.get(key);
  if (cached) return cached;
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=full&geometries=geojson`, {
    signal,
  });
  if (!res.ok) throw new Error('route');
  const data = await res.json();
  const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates ?? [];
  if (coords.length === 0) throw new Error('route');
  const route = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  routeCache.set(key, route);
  return route;
}

export const MapView: React.FC<{
  markers?: MapMarker[];
  paths?: MapPath[];
  className?: string;
  /** Zoom utilisé quand un seul point est affiché. */
  singleZoom?: number;
  interactive?: boolean;
  emptyLabel?: string;
}> = ({ markers = [], paths = [], className = 'h-64', singleZoom = 12, interactive = true, emptyLabel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [roadRoutes, setRoadRoutes] = useState<Record<number, LatLng[]>>({});

  const hasContent = markers.length > 0 || paths.some((p) => p.points.length > 0);

  // Création unique de la carte.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: interactive,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
    }).setView([36.6, 10.4], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Tracés routiers, calculés en arrière-plan.
  const pathsKey = JSON.stringify(paths.map((p) => [p.followRoads, p.points]));
  useEffect(() => {
    const controller = new AbortController();
    setRoadRoutes({});
    paths.forEach((path, index) => {
      if (!path.followRoads || path.points.length < 2) return;
      fetchRoadRoute(path.points, controller.signal)
        .then((route) => setRoadRoutes((prev) => ({ ...prev, [index]: route })))
        .catch(() => undefined);
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  // Dessin des marqueurs et tracés.
  const markersKey = JSON.stringify(markers.map((m) => [m.kind, m.label, m.position, m.title]));
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds = L.latLngBounds([]);
    paths.forEach((path, index) => {
      const points = roadRoutes[index] ?? path.points;
      if (points.length < 2) return;
      const latlngs = points.map((p) => L.latLng(p.latitude, p.longitude));
      L.polyline(latlngs, {
        color: path.color ?? '#2F6FDB',
        weight: 4,
        opacity: 0.85,
        dashArray: path.dashed ? '6 8' : undefined,
      }).addTo(layer);
      latlngs.forEach((ll) => bounds.extend(ll));
    });

    markers.forEach((marker) => {
      const ll = L.latLng(marker.position.latitude, marker.position.longitude);
      const m = L.marker(ll, { icon: iconFor(marker), title: marker.title, keyboard: !!marker.onClick });
      if (marker.title) m.bindTooltip(marker.title, { direction: 'top', offset: [0, -14] });
      if (marker.onClick) m.on('click', marker.onClick);
      m.addTo(layer);
      bounds.extend(ll);
    });

    if (bounds.isValid()) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      if (ne.equals(sw)) {
        map.setView(ne, singleZoom);
      } else {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, pathsKey, roadRoutes, singleZoom]);

  return (
    <div className={`relative rounded-lg overflow-hidden border border-[#EAE1D2] z-0 ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!hasContent && emptyLabel && (
        <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs text-gray-500 z-[500] px-4 text-center">
          {emptyLabel}
        </div>
      )}
    </div>
  );
};
