import { TerritoryGeoJSONCollection } from '../types';

/**
 * Centralized Map Configuration & Fallback Engine for RunZone
 */

export function getMapTilerKey(): string {
  return (
    import.meta.env.VITE_MAPTILER_API_KEY ||
    import.meta.env.VITE_MAPTILER_KEY ||
    ''
  );
}

export function getMapTilerTileUrl(): string {
  const key = getMapTilerKey();
  if (!key) {
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  }
  return `https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${key}`;
}

/**
 * Standard attribution string for MapTiler & OpenStreetMap
 */
export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';


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
