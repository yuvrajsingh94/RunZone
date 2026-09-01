import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TerritoryGeoJSONCollection } from '../../types';
import { Compass, Maximize2, Crosshair, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
  center = [37.7749, -122.4194], // Default [lat, lon]
  zoom = 13,
  height = '540px',
  onZoneSelect,
  fullBleed = false,
  onLocationFound,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // OpenFreeMap Dark Style - free, no API key, reliable in production
  const VECTOR_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

  // Helper to generate dynamic local sectors around user coordinates
  const generateLocalSectors = (lat: number, lng: number): TerritoryGeoJSONCollection => {
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
            defense_points: 32, // Contested
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
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Check if user has a previously stored location
    let initialLng = center[1];
    let initialLat = center[0];
    try {
      const savedLoc = JSON.parse(localStorage.getItem('runzone_last_location') || '{}');
      if (savedLoc.lat && savedLoc.lng) {
        initialLat = savedLoc.lat;
        initialLng = savedLoc.lng;
      }
    } catch (e) {}

    // MapLibre uses [lng, lat] coordinate order
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: VECTOR_STYLE_URL,
      center: [initialLng, initialLat],
      zoom: zoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    // Add navigation controls (zoom, pitch, compass)
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    // Add built-in Geolocation Control
    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
    });
    map.addControl(geolocateControl, 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);

      // Determine starting territory dataset
      let initialData: any = territories;
      if (!initialData || !initialData.features || initialData.features.length === 0) {
        initialData = generateLocalSectors(initialLat, initialLng);
      }

      // 1. Add Source for Territory Polygons
      map.addSource('territories-source', {
        type: 'geojson',
        data: initialData,
      });

      // 2. Translucent Fill Layer for Territories
      map.addLayer({
        id: 'territories-fill',
        type: 'fill',
        source: 'territories-source',
        paint: {
          'fill-color': [
            'case',
            ['get', 'is_user_owned'],
            '#B8492E', // Cinder red
            '#3E8E7E', // Contour emerald
          ],
          'fill-opacity': [
            'case',
            ['get', 'is_user_owned'],
            0.35,
            0.22,
          ],
        },
      });

      // 3. Glowing Outer Border for Territories
      map.addLayer({
        id: 'territories-border',
        type: 'line',
        source: 'territories-source',
        paint: {
          'line-color': [
            'case',
            ['<', ['get', 'defense_points'], 40],
            '#C98A2E', // Amber for contested
            ['case', ['get', 'is_user_owned'], '#E05A3B', '#4EA896'],
          ],
          'line-width': ['case', ['get', 'is_user_owned'], 2.5, 1.8],
          'line-opacity': 0.9,
        },
      });

      // 4. Source & Layer for Active Running Polyline Corridor
      map.addSource('active-run-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: activePolyline || [],
          },
        },
      });

      // 40m Buffered Glow Path
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

      // Solid Core Vector Path
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
    });

    mapRef.current = map;

    return () => {
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
    if (source && activePolyline) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: activePolyline,
        },
      });
      if (activePolyline.length > 0) {
        const lastPt = activePolyline[activePolyline.length - 1];
        mapRef.current.panTo([lastPt[0], lastPt[1]], { duration: 500 });
      }
    }
  }, [activePolyline, mapLoaded]);

  // Fetch and fly to athlete's live physical GPS location
  const fetchLiveLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    toast('Fetching live GPS coordinates…', { icon: '🛰️' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocating(false);

        // Save in localStorage
        try {
          localStorage.setItem('runzone_last_location', JSON.stringify({ lat: latitude, lng: longitude }));
        } catch (e) {}

        if (mapRef.current) {
          // Smoothly fly camera to user's real GPS location with 3D perspective
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15.5,
            pitch: 45,
            bearing: -15,
            duration: 2000,
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
          const localSectors = generateLocalSectors(latitude, longitude);
          const source = mapRef.current.getSource('territories-source') as maplibregl.GeoJSONSource;
          if (source) {
            source.setData(localSectors as any);
          }

          toast.success(`Centered on your live location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          if (onLocationFound) onLocationFound(latitude, longitude);
        }
      },
      (error) => {
        setLocating(false);
        console.error('Location error:', error);
        toast.error(`Could not fetch location: ${error.message}. Please enable location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
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
      zoom: 14,
      pitch: is3DMode ? 52 : 0,
      bearing: is3DMode ? -25 : 0,
      duration: 1000,
    });
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
          <span>MapLibre GL · 60 FPS Vector</span>
        </div>
        <div className="h-3 w-px bg-hairline-strong" />
        <span className="text-chalk-muted font-display tabular text-[11px]">
          {userCoords ? `Live: ${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)}` : 'Live spatial grid'}
        </span>
      </div>

      {/* Top Right Tactical Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {/* Fetch Live Location Button */}
        <button
          onClick={fetchLiveLocation}
          disabled={locating}
          className="px-3 py-1.5 bg-cinder hover:bg-cinder-hover text-chalk border border-cinder text-xs font-display font-bold transition-all flex items-center gap-1.5 shadow-md"
          title="Fetch your exact physical GPS location"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
          <span>{locating ? 'Locating…' : 'Locate Me'}</span>
        </button>

        <button
          onClick={toggle3D}
          className={`px-2.5 py-1.5 border text-xs font-display font-semibold transition-all flex items-center gap-1.5 shadow-md ${
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
          className="p-1.5 bg-night/90 hover:bg-panel border border-hairline text-chalk-muted hover:text-chalk transition-colors shadow-md"
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
