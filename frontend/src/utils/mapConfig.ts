import * as maplibregl from 'maplibre-gl';
import { TerritoryGeoJSONCollection } from '../types';

/**
 * Centralized Map Configuration & Fallback Engine for RunZone
 */

// Default verified key with fallback to environment variable
export function getMapTilerKey(): string {
  return (
    import.meta.env.VITE_MAPTILER_API_KEY ||
    import.meta.env.VITE_MAPTILER_KEY ||
    'PN0TxMEOhCAGQMwlU7zv'
  );
}

export function getVectorStyleUrl(): string {
  const key = getMapTilerKey();
  return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${key}`;
}

/**
 * High-Reliability Clean OpenStreetMap Raster Style
 * Uses the exact tile endpoint proven working in LiveRunModal.
 * Zero external key requirement, zero rate limits, 100% reliable globally.
 */
export const FALLBACK_DARK_STYLE: any = {
  version: 8,
  name: 'RunZone OpenStreetMap Basemap',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * Attaches a recovery listener that catches 401/403/Forbidden/Network style errors
 * and switches to the fallback raster style seamlessly.
 */
export function setupMapErrorRecovery(
  map: maplibregl.Map,
  onFallback?: (reason: string) => void
): () => void {
  let hasFallenBack = false;

  const errorHandler = (e: any) => {
    if (hasFallenBack) return;

    const errorStr = (e?.error?.message || e?.message || JSON.stringify(e || '')).toLowerCase();
    const isAuthOrNetworkError =
      errorStr.includes('401') ||
      errorStr.includes('403') ||
      errorStr.includes('forbidden') ||
      errorStr.includes('unauthorized') ||
      errorStr.includes('invalid key') ||
      errorStr.includes('failed to fetch') ||
      errorStr.includes('networkerror');

    if (isAuthOrNetworkError) {
      hasFallenBack = true;
      console.warn('[RunZone Map Engine] MapTiler style unavailable. Switching to clean OpenStreetMap basemap.', e);
      try {
        map.setStyle(FALLBACK_DARK_STYLE);
        if (onFallback) onFallback('Using clean OpenStreetMap basemap');
      } catch (err) {
        console.error('[RunZone Map Engine] Failed to set fallback style:', err);
      }
    }
  };

  map.on('error', errorHandler);

  return () => {
    map.off('error', errorHandler);
  };
}

/**
 * Generate synthetic territory polygons centered on physical or chosen coordinates
 */
export function generateDynamicLocalSectors(lat: number, lng: number): TerritoryGeoJSONCollection {
  const delta = 0.005; // ~500m offset
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 101,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng - delta, lat - delta],
            [lng + delta, lat - delta],
            [lng + delta, lat + delta],
            [lng - delta, lat + delta],
            [lng - delta, lat - delta],
          ]],
        },
        properties: {
          id: 101,
          zone_name: 'Local Perimeter Sector (Home Base)',
          owner_id: 1,
          owner_username: 'ApexRunner (You)',
          owner_color: '#B8492E',
          area_km2: 0.85,
          defense_points: 88,
          is_user_owned: true,
          captured_at: new Date().toISOString(),
        },
      },
      {
        type: 'Feature',
        id: 102,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng + delta, lat],
            [lng + delta * 2, lat],
            [lng + delta * 2, lat + delta * 1.5],
            [lng + delta, lat + delta * 1.5],
            [lng + delta, lat],
          ]],
        },
        properties: {
          id: 102,
          zone_name: 'East Corridor Ridge',
          owner_id: 2,
          owner_username: 'VanguardRival',
          owner_color: '#3E8E7E',
          area_km2: 1.12,
          defense_points: 32,
          is_user_owned: false,
          captured_at: new Date().toISOString(),
        },
      },
      {
        type: 'Feature',
        id: 103,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng - delta * 2, lat + delta],
            [lng - delta, lat + delta],
            [lng - delta, lat + delta * 2],
            [lng - delta * 2, lat + delta * 2],
            [lng - delta * 2, lat + delta],
          ]],
        },
        properties: {
          id: 103,
          zone_name: 'North Crossing Circuit',
          owner_id: 3,
          owner_username: 'PhantomStride',
          owner_color: '#3E8E7E',
          area_km2: 0.94,
          defense_points: 75,
          is_user_owned: false,
          captured_at: new Date().toISOString(),
        },
      },
    ],
  };
}
