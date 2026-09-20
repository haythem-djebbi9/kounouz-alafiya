import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Cartes à bulles sur fond cartographique réel : la position des gouvernorats
// et des pays est exacte, la surface de chaque bulle suit la valeur.

export const GOVERNORATE_CENTERS: Record<string, [number, number]> = {
  Tunis: [36.8065, 10.1815],
  Ariana: [36.8625, 10.1956],
  'Ben Arous': [36.7531, 10.2189],
  'La Manouba': [36.8101, 10.0956],
  Manouba: [36.8101, 10.0956],
  Nabeul: [36.4561, 10.7376],
  Zaghouan: [36.4029, 10.1429],
  Bizerte: [37.2744, 9.8739],
  Béja: [36.7256, 9.1817],
  Jendouba: [36.5011, 8.7802],
  'Le Kef': [36.1742, 8.7049],
  Siliana: [36.0849, 9.3708],
  Sousse: [35.8256, 10.6084],
  Monastir: [35.7643, 10.8113],
  Mahdia: [35.5047, 11.0622],
  Sfax: [34.7406, 10.7603],
  Kairouan: [35.6781, 10.0963],
  Kasserine: [35.1676, 8.8365],
  'Sidi Bouzid': [35.0382, 9.4849],
  Gabès: [33.8815, 10.0982],
  Médenine: [33.3549, 10.5055],
  Tataouine: [32.9297, 10.4518],
  Gafsa: [34.425, 8.7842],
  Tozeur: [33.9197, 8.1335],
  Kébili: [33.7044, 8.969],
};

export interface Bubble {
  key: string;
  lat: number;
  lng: number;
  value: number;
  color: string;
  tooltip: string;
}

const VIEWS = {
  tunisia: { bounds: L.latLngBounds([30.3, 7.4], [37.5, 11.7]), minZoom: 5 },
  world: { bounds: L.latLngBounds([-45, -125], [65, 140]), minZoom: 1 },
} as const;

export const BubbleMap: React.FC<{
  bubbles: Bubble[];
  view: keyof typeof VIEWS;
  height?: number;
  maxRadius?: number;
  className?: string;
  ariaLabel: string;
}> = ({ bubbles, view, height = 240, maxRadius = 22, className = '', ariaLabel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
      worldCopyJump: view === 'world',
      minZoom: VIEWS[view].minZoom,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 10,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.fitBounds(VIEWS[view].bounds, { padding: [8, 8] });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      map.fitBounds(VIEWS[view].bounds, { padding: [8, 8] });
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const max = Math.max(...bubbles.map((b) => b.value), 1);
    // Plus grandes bulles d'abord : les petites restent visibles et survolables.
    [...bubbles]
      .sort((a, b) => b.value - a.value)
      .forEach((bubble) => {
        if (bubble.value <= 0) return;
        const radius = Math.max(4, Math.sqrt(bubble.value / max) * maxRadius);
        L.circleMarker([bubble.lat, bubble.lng], {
          radius,
          color: '#FFFFFF',
          weight: 2,
          fillColor: bubble.color,
          fillOpacity: 0.78,
        })
          .bindTooltip(bubble.tooltip, { direction: 'top', offset: [0, -radius] })
          .addTo(layer);
      });
  }, [bubbles, maxRadius]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="img"
      aria-label={ariaLabel}
      className={`relative isolate rounded-xl overflow-hidden bg-[#F2F4F1] ${className}`}
      style={{ height }}
    />
  );
};
