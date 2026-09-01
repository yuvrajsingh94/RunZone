import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TerritoryGeoJSONCollection } from '../../types';
import { Compass, Maximize2, Crosshair, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { acquireLiveLocation, isSecureContext } from '../../utils/geoService';
import {
  getVectorStyleUrl,
  setupMapErrorRecovery,
  generateDynamicLocalSectors,
  FALLBACK_DARK_STYLE,
} from '../../utils/mapConfig';

interface TerritoryMapProps {
  territories: TerritoryGeoJSONCollection | null;
  activePolyline?: number[][]; // [[lon, lat], ...]
  center?: [number, number]; // [lat, lon]
  zoom?: number;
  height?: string;
  onZoneSelect?: (zone: any) => void;
  fullBleed?: boolean;
  enable3D?: boolean;
  onLocationFound?: (lat: number, lng: number) => void;
}

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territories,
  activePolyline,
  center = [28.5209, 77.2806], // Default [lat, lon] - New Delhi
  zoom = 14.5,
  height = '540px',
  onZoneSelect,
  fullBleed = false,
  onLocationFound,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Helper to safely attach territory and track layers once a style loads
  const setupLayers = (map: maplibregl.Map, initLat: number, initLng: number) => {
    try {
      // Determine starting territory dataset
      let initialData: any = territories;
      if (!initialData || !initialData.features || initialData.features.length === 0) {
        initialData = generateDynamicLocalSectors(initLat, initLng);
      }

      // 1. Add Source for Territory Polygons
      if (!map.getSource('territories-source')) {
        map.addSource('territories-source', {
          type: 'geojson',
          data: initialData,
        });
      }

      // 2. Translucent Fill Layer for Territories
      if (!map.getLayer('territories-fill')) {
        map.addLayer({
          id: 'territories-fill',
          type: 'fill',
          source: 'territories-source',
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['get', 'is_user_owned'], false],
              '#B8492E',
              '#3E8E7E',
            ],
            'fill-opacity': 0.4,
          },
        });
      }

      // 3. Glowing Outer Border for Territories
      if (!map.getLayer('territories-border')) {
        map.addLayer({
          id: 'territories-border',
          type: 'line',
          source: 'territories-source',
          paint: {
            'line-color': [
              'case',
              ['<', ['coalesce', ['get', 'defense_points'], 50], 40],
              '#C98A2E',
              ['case', ['boolean', ['get', 'is_user_owned'], false], '#E05A3B', '#4EA896'],
            ],
            'line-width': 2.5,
            'line-opacity': 0.95,
          },
        });
      }

      // 4. Source & Layer for Active Running Polyline Corridor
      if (!map.getSource('active-run-source')) {
        map.addSource('active-run-source', {
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
      if (!map.getLayer('active-run-glow')) {
        map.addLayer({
          id: 'active-run-glow',
          type: 'line',
          source: 'active-run-source',
          paint: {
            'line-color': '#B8492E',
            'line-width': 18,
            'line-opacity': 0.35,
            'line-blur': 4,
          },
        });
      }

      // Solid Core Vector Path
      if (!map.getLayer('active-run-core')) {
        map.addLayer({
          id: 'active-run-core',
          type: 'line',
          source: 'active-run-source',
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 3.5,
            'line-opacity': 0.95,
          },
        });
      }

      // Interactive Click on Territory Polygons
      map.on('click', 'territories-fill', (e) => {
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
                    ${props.zone_name}
                  </strong>
                  <span style="font-size: 10px; padding: 2px 6px; background: ${props.is_user_owned ? '#B8492E30' : '#3E8E7E30'}; border: 1px solid ${props.is_user_owned ? '#B8492E' : '#3E8E7E'}; color: #EDEEE7;">
                    ${props.owner_username}
                  </span>
                </div>
                <div style="font-size: 11px; color: #9BA1A6; line-height: 1.6; border-top: 1px solid rgba(237,238,231,0.1); padding-top: 4px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Area:</span>
                    <strong style="color: #EDEEE7; font-family: 'Archivo';">${Number(props.area_km2).toFixed(3)} km²</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Defense:</span>
                    <strong style="color: #EDEEE7; font-family: 'Archivo';">${props.defense_points}/100</strong>
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

      // Cursor hover feedback
      map.on('mouseenter', 'territories-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'territories-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    } catch (err) {
      console.warn('[RunZone Map Engine] Layer setup notice:', err);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!mapContainerRef.current || mapRef.current) return;

    // Check if user has a previously stored location
    let initialLng = center[1];
    let initialLat = center[0];
    try {
      const savedLoc = JSON.parse(localStorage.getItem('runzone_last_location') || '{}');
      if (savedLoc.lat && savedLoc.lng) {
        initialLat = savedLoc.lat;
        initialLng = savedLoc.lng;
        setUserCoords({ lat: initialLat, lng: initialLng });
      }
    } catch (e) {}

    // MapLibre uses [lng, lat] coordinate order
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getVectorStyleUrl(),
      center: [initialLng, initialLat],
      zoom: zoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    // Add navigation controls (zoom, pitch, compass)
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    // Attach automatic fallback recovery if MapTiler key fails
    const cleanupErrorRecovery = setupMapErrorRecovery(map, (reason) => {
      if (isMountedRef.current) {
        setIsFallbackMode(true);
        setFallbackNotice(reason);
      }
    });

    map.on('load', () => {
      if (!isMountedRef.current) return;
      setMapLoaded(true);

      // Add user pin marker on load
      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full bg-cinder border-2 border-white flex items-center justify-center shadow-lg animate-pulse';
      el.innerHTML = '<span class="w-2 h-2 rounded-full bg-white"></span>';
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      setupLayers(map, initialLat, initialLng);

      // Ensure canvas adapts to container
      map.resize();
      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize();
      }, 150);
    });

    // Re-setup custom layers if style changes (e.g. on fallback transition)
    map.on('style.load', () => {
      if (!isMountedRef.current) return;
      setupLayers(map, initialLat, initialLng);
    });

    mapRef.current = map;

    const handleWindowResize = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isMountedRef.current = false;
      cleanupErrorRecovery();
      window.removeEventListener('resize', handleWindowResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON data dynamically when territories prop changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('territories-source') as maplibregl.GeoJSONSource;
    if (source && territories && Array.isArray(territories.features) && territories.features.length > 0) {
      source.setData(territories as any);
    }
  }, [territories, mapLoaded]);

  // Update active polyline when props change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('active-run-source') as maplibregl.GeoJSONSource;
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
        const lastPt = activePolyline[activePolyline.length - 1];
        mapRef.current.panTo([lastPt[0], lastPt[1]], { duration: 500 });
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, [activePolyline, mapLoaded]);

  // Production-grade Geolocation Trigger with explicit safety timeouts & toast lifecycle
  const fetchLiveLocation = async () => {
    if (locating) return;

    if (!isSecureContext()) {
      toast.error('GPS requires a secure HTTPS connection.', { id: 'gps-locating' });
      return;
    }

    setLocating(true);
    toast.loading('Acquiring live GPS coordinates…', { id: 'gps-locating' });

    try {
      const result = await acquireLiveLocation((stage) => {
        if (stage === 'fallback_low_accuracy') {
          toast.loading('GPS hardware weak, acquiring network position…', { id: 'gps-locating' });
        }
      });

      if (!isMountedRef.current) return;

      const { latitude, longitude } = result;
      setUserCoords({ lat: latitude, lng: longitude });

      // Save in localStorage for instant reload
      try {
        localStorage.setItem('runzone_last_location', JSON.stringify({ lat: latitude, lng: longitude }));
      } catch (e) {}

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [longitude, latitude],
          zoom: 15.5,
          pitch: is3DMode ? 52 : 0,
          bearing: is3DMode ? -15 : 0,
          duration: 1800,
        });

        // Add or update pulsing runner pin
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        } else {
          const el = document.createElement('div');
          el.className = 'w-6 h-6 rounded-full bg-cinder border-2 border-white flex items-center justify-center shadow-lg animate-pulse';
          el.innerHTML = '<span class="w-2 h-2 rounded-full bg-white"></span>';
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);
        }

        // Generate dynamic local sectors around user's city
        const localSectors = generateDynamicLocalSectors(latitude, longitude);
        const source = mapRef.current.getSource('territories-source') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(localSectors as any);
        }
      }

      toast.success(`Position acquired (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, {
        id: 'gps-locating',
      });

      if (onLocationFound) onLocationFound(latitude, longitude);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.warn('[RunZone Geolocation]', err);
      toast.error(err.userMessage || 'Could not acquire GPS position. Click to retry.', {
        id: 'gps-locating',
        duration: 5000,
      });
    } finally {
      if (isMountedRef.current) {
        setLocating(false);
      }
    }
  };

  // Toggle 3D Terrain Pitch (52° tactical angle vs 0° top-down)
  const toggle3D = () => {
    if (!mapRef.current) return;
    const next3D = !is3DMode;
    setIs3DMode(next3D);
    mapRef.current.easeTo({
      pitch: next3D ? 52 : 0,
      bearing: next3D ? -25 : 0,
      duration: 1200,
    });
  };

  // Reset to default center
  const resetCenter = () => {
    if (!mapRef.current) return;
    const targetLng = userCoords ? userCoords.lng : center[1];
    const targetLat = userCoords ? userCoords.lat : center[0];
    mapRef.current.flyTo({
      center: [targetLng, targetLat],
      zoom: 14.5,
      pitch: is3DMode ? 52 : 0,
      bearing: is3DMode ? -25 : 0,
      duration: 1000,
    });
  };

  // Manual retry for MapTiler style
  const retryMapStyle = () => {
    if (!mapRef.current) return;
    setIsFallbackMode(false);
    setFallbackNotice(null);
    mapRef.current.setStyle(getVectorStyleUrl());
    toast('Reloading MapTiler vector theme…', { icon: '🔄' });
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-night ${
        fullBleed ? 'border-y border-hairline' : 'border border-hairline'
      }`}
      style={{ height }}
    >
      {/* Top Left Status Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-night/90 backdrop-blur-sm border border-hairline px-3 py-1.5 flex items-center gap-3 text-xs shadow-md">
        <div className="flex items-center gap-1.5 text-chalk font-display font-semibold">
          <span className="w-2 h-2 rounded-full bg-cinder inline-block animate-pulse" />
          <span>{isFallbackMode ? 'MapLibre GL · Fallback Mode' : 'MapLibre GL · 60 FPS Vector'}</span>
        </div>
        <div className="h-3 w-px bg-hairline-strong" />
        <span className="text-chalk-muted font-display tabular text-[11px]">
          {userCoords ? `Live: ${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)}` : 'Live spatial grid'}
        </span>
      </div>

      {/* Fallback Mode Banner */}
      {isFallbackMode && (
        <div className="absolute bottom-3 left-3 z-10 bg-night/95 backdrop-blur-md border border-amber-500/40 px-3 py-1.5 flex items-center gap-2 text-xs text-amber-300 shadow-xl max-w-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="text-[11px] truncate">{fallbackNotice || 'Running on fallback dark basemap'}</span>
          <button
            onClick={retryMapStyle}
            className="ml-auto text-[11px] underline hover:text-white flex items-center gap-1 text-amber-400 shrink-0"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Top Right Tactical Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {/* Fetch Live Location Button */}
        <button
          onClick={fetchLiveLocation}
          disabled={locating}
          className="px-3 py-1.5 bg-cinder hover:bg-cinder-hover disabled:opacity-70 text-chalk border border-cinder text-xs font-display font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          title="Fetch your exact physical GPS location"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
          <span>{locating ? 'Acquiring GPS…' : 'Locate Me'}</span>
        </button>

        <button
          onClick={toggle3D}
          className={`px-2.5 py-1.5 border text-xs font-display font-semibold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
            is3DMode
              ? 'bg-cinder text-chalk border-cinder'
              : 'bg-night/90 hover:bg-panel text-chalk-muted hover:text-chalk border-hairline'
          }`}
          title="Toggle 3D Terrain Pitch Angle"
        >
          <Compass className={`w-3.5 h-3.5 ${is3DMode ? 'animate-spin' : ''}`} />
          <span>{is3DMode ? '3D Active' : '3D View'}</span>
        </button>

        <button
          onClick={resetCenter}
          className="p-1.5 bg-night/90 hover:bg-panel border border-hairline text-chalk-muted hover:text-chalk transition-colors shadow-md cursor-pointer"
          title="Re-center map"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
