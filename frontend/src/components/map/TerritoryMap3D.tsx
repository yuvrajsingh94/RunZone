import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TerritoryGeoJSONCollection } from '../../types';
import { getMapTilerKey } from '../../utils/mapConfig';

interface TerritoryMap3DProps {
  center: { lat: number; lng: number };
  zoom: number;
  userCoords: { lat: number; lng: number } | null;
  territoriesData: TerritoryGeoJSONCollection;
  activePolyline: number[][]; // [[lon, lat], ...]
  onZoneSelect?: (zone: any) => void;
  onMoveEnd?: (lat: number, lng: number, zoom: number) => void;
  onError?: (errMessage: string) => void;
}

export const TerritoryMap3D: React.FC<TerritoryMap3DProps> = ({
  center,
  zoom,
  userCoords,
  territoriesData,
  activePolyline,
  onZoneSelect,
  onMoveEnd,
  onError,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Helper to safely attach custom 3D vector layers
  const attach3DLayers = (map: maplibregl.Map) => {
    try {
      // 1. Territories GeoJSON Source
      if (!map.getSource('territories-3d-source')) {
        map.addSource('territories-3d-source', {
          type: 'geojson',
          data: territoriesData as any,
        });
      }

      // 2. Translucent 3D Fill Layer for Territories
      if (!map.getLayer('territories-3d-fill')) {
        map.addLayer({
          id: 'territories-3d-fill',
          type: 'fill',
          source: 'territories-3d-source',
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['get', 'is_user_owned'], false],
              '#B8492E',
              '#3E8E7E',
            ],
            'fill-opacity': 0.38,
          },
        });
      }

      // 3. Glowing Outer Border for Territories
      if (!map.getLayer('territories-3d-border')) {
        map.addLayer({
          id: 'territories-3d-border',
          type: 'line',
          source: 'territories-3d-source',
          paint: {
            'line-color': [
              'case',
              ['<', ['coalesce', ['get', 'defense_points'], 50], 40],
              '#C98A2E',
              ['case', ['boolean', ['get', 'is_user_owned'], false], '#E05A3B', '#4EA896'],
            ],
            'line-width': 2.8,
            'line-opacity': 0.95,
          },
        });
      }

      // 4. Active Running Polyline Corridor Source
      if (!map.getSource('active-run-3d-source')) {
        map.addSource('active-run-3d-source', {
          type: 'geojson',
          data:
            activePolyline && activePolyline.length >= 2
              ? {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: activePolyline,
                  },
                }
              : {
                  type: 'FeatureCollection',
                  features: [],
                },
        });
      }

      // 40m Buffered Glow Path
      if (!map.getLayer('active-run-3d-glow')) {
        map.addLayer({
          id: 'active-run-3d-glow',
          type: 'line',
          source: 'active-run-3d-source',
          paint: {
            'line-color': '#B8492E',
            'line-width': 18,
            'line-opacity': 0.35,
            'line-blur': 4,
          },
        });
      }

      // Solid Core Vector Path
      if (!map.getLayer('active-run-3d-core')) {
        map.addLayer({
          id: 'active-run-3d-core',
          type: 'line',
          source: 'active-run-3d-source',
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 3.5,
            'line-opacity': 0.95,
          },
        });
      }

      // Interactive Click on Territory Polygons
      map.on('click', 'territories-3d-fill', (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const props = feature.properties as any;
          if (onZoneSelect) onZoneSelect(props);

          new maplibregl.Popup({ closeButton: true, offset: 12 })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', sans-serif; color: #EDEEE7; padding: 4px; min-width: 180px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-family: 'Archivo', sans-serif; font-size: 13px; color: #EDEEE7;">
                    ${props.zone_name || 'Sector Zone'}
                  </strong>
                  <span style="font-size: 10px; padding: 2px 6px; background: ${
                    props.is_user_owned ? '#B8492E30' : '#3E8E7E30'
                  }; border: 1px solid ${props.is_user_owned ? '#B8492E' : '#3E8E7E'}; color: #EDEEE7;">
                    ${props.owner_username || 'Athlete'}
                  </span>
                </div>
                <div style="font-size: 11px; color: #9BA1A6; line-height: 1.6; border-top: 1px solid rgba(237,238,231,0.1); padding-top: 4px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Area:</span>
                    <strong style="color: #EDEEE7; font-family: 'Archivo';">${Number(props.area_km2 || 0.85).toFixed(3)} km²</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Defense:</span>
                    <strong style="color: #EDEEE7; font-family: 'Archivo';">${props.defense_points || 88}/100</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                    <span>Status:</span>
                    <span style="color: ${props.is_user_owned ? '#E05A3B' : '#4EA896'}; font-weight: 600;">
                      ${props.is_user_owned ? 'Your Territory' : 'Rival Sector'}
                    </span>
                  </div>
                </div>
              </div>
            `)
            .addTo(map);
        }
      });

      map.on('mouseenter', 'territories-3d-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'territories-3d-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    } catch (err) {
      console.warn('[RunZone 3D Map] Layer setup notice:', err);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!mapContainerRef.current || mapRef.current) return;

    // Check WebGL availability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      if (onError) onError('WebGL hardware acceleration is not supported on this device.');
      return;
    }

    const key = getMapTilerKey();

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-raster': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
            'maptiler-terrain': {
              type: 'raster-dem',
              url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${key}`,
              tileSize: 256,
            },
          },
          layers: [
            {
              id: 'osm-raster-layer',
              type: 'raster',
              source: 'osm-raster',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
          terrain: {
            source: 'maptiler-terrain',
            exaggeration: 1.5,
          },
          sky: {
            'sky-color': '#0F172A',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#1E293B',
            'horizon-fog-blend': 0.8,
            'fog-color': '#0F172A',
            'fog-ground-blend': 0.7,
          },
        },
        center: [center.lng, center.lat],
        zoom: zoom,
        pitch: 58, // 3D tactical perspective
        bearing: -18, // 3D tactical rotation
        maxPitch: 85,
        attributionControl: false,
      });

      // Add 3D Navigation Control (Compass with pitch visualizer)
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

      map.on('load', () => {
        if (!isMountedRef.current) return;

        // Add 3D runner pin marker
        const pinCoords = userCoords ? [userCoords.lng, userCoords.lat] : [center.lng, center.lat];
        const el = document.createElement('div');
        el.className = 'w-6 h-6 rounded-full bg-cinder border-2 border-white flex items-center justify-center shadow-2xl animate-pulse';
        el.innerHTML = '<span class="w-2 h-2 rounded-full bg-white"></span>';
        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(pinCoords as [number, number])
          .addTo(map);

        attach3DLayers(map);

        map.resize();
        setTimeout(() => {
          if (mapRef.current) mapRef.current.resize();
        }, 150);
      });

      map.on('moveend', () => {
        if (!onMoveEnd || !mapRef.current) return;
        const c = mapRef.current.getCenter();
        onMoveEnd(c.lat, c.lng, mapRef.current.getZoom());
      });

      map.on('error', (e) => {
        console.warn('[RunZone 3D Map Notice]:', e);
      });

      mapRef.current = map;

      const handleResize = () => {
        if (mapRef.current) mapRef.current.resize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        isMountedRef.current = false;
        window.removeEventListener('resize', handleResize);
        map.remove();
        mapRef.current = null;
      };
    } catch (err: any) {
      console.error('[RunZone 3D Init Failure]', err);
      if (onError) onError(err.message || 'Could not initialize 3D WebGL engine.');
    }
  }, []);

  // Update dynamic layers when territories data changes
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('territories-3d-source') as maplibregl.GeoJSONSource;
    if (source && territoriesData) {
      source.setData(territoriesData as any);
    }
  }, [territoriesData]);

  // Update active polyline when track changes
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('active-run-3d-source') as maplibregl.GeoJSONSource;
    if (source) {
      if (activePolyline && activePolyline.length >= 2) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: activePolyline,
          },
        });
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, [activePolyline]);

  // Update runner pin position when userCoords changes
  useEffect(() => {
    if (userCoords && userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]);
    }
  }, [userCoords]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};
