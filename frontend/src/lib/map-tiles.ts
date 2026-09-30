import L from 'leaflet';

/**
 * Fonds de carte de toute l'application (portail Agent terrain, console
 * d'administration).
 *
 * Par défaut : OpenStreetMap, gratuit et sans clé. Pour la production, un
 * fournisseur avec clé se branche sans toucher au code, dans l'environnement
 * du build (Vercel, .env) :
 *
 *   VITE_MAP_TILE_URL="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=VOTRE_CLE"
 *   VITE_MAP_TILE_ATTRIBUTION="© MapTiler © OpenStreetMap"
 *
 * Si le fond choisi ne répond pas (quota atteint, panne, réseau filtrant), la
 * carte bascule d'elle-même sur le suivant de la liste : elle ne reste jamais
 * grise.
 *
 * Historique : les cartes de la console utilisaient les tuiles CARTO, qui
 * exigent désormais une clé et renvoient sinon une image filigranée.
 */

interface TileProvider {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

const OPENSTREETMAP: TileProvider = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap',
  maxZoom: 19,
};

const ESRI_STREETS: TileProvider = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attribution: '&copy; Esri &copy; OpenStreetMap',
  maxZoom: 19,
};

function configuredProvider(): TileProvider | null {
  const url = import.meta.env.VITE_MAP_TILE_URL?.trim();
  if (!url) return null;
  return {
    url,
    attribution: import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() || '&copy; OpenStreetMap',
    maxZoom: Number(import.meta.env.VITE_MAP_TILE_MAX_ZOOM) || 19,
    subdomains: import.meta.env.VITE_MAP_TILE_SUBDOMAINS?.trim() || undefined,
  };
}

const PROVIDERS: TileProvider[] = [configuredProvider(), OPENSTREETMAP, ESRI_STREETS].filter(
  (p, i, all): p is TileProvider => !!p && all.findIndex((q) => q?.url === p.url) === i,
);

// Au-delà de ce nombre de tuiles en échec sans une seule réussie, le
// fournisseur est considéré comme indisponible.
const FAILURES_BEFORE_FALLBACK = 4;

/**
 * Pose le fond de carte sur `map`. `muted` : fond désaturé et éclairci, pour
 * que des données (bulles, tracés) ressortent par-dessus.
 */
export function addBaseLayer(map: L.Map, options: { muted?: boolean; maxZoom?: number } = {}) {
  let index = 0;

  const mount = () => {
    const provider = PROVIDERS[index];
    let loaded = 0;
    let failed = 0;
    const layer = L.tileLayer(provider.url, {
      maxZoom: Math.min(provider.maxZoom, options.maxZoom ?? provider.maxZoom),
      attribution: provider.attribution,
      ...(provider.subdomains ? { subdomains: provider.subdomains } : {}),
      className: options.muted ? 'kz-tiles-muted' : '',
    });
    layer.on('tileload', () => {
      loaded += 1;
    });
    layer.on('tileerror', () => {
      failed += 1;
      if (loaded === 0 && failed >= FAILURES_BEFORE_FALLBACK && index < PROVIDERS.length - 1) {
        map.removeLayer(layer);
        index += 1;
        mount();
      }
    });
    layer.addTo(map);
  };

  mount();
}
