/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Fond de carte (voir src/lib/map-tiles.ts) ; OpenStreetMap si absent. */
  readonly VITE_MAP_TILE_URL?: string;
  readonly VITE_MAP_TILE_ATTRIBUTION?: string;
  readonly VITE_MAP_TILE_MAX_ZOOM?: string;
  readonly VITE_MAP_TILE_SUBDOMAINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
