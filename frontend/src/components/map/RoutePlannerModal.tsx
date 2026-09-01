import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Route, MapPin, Play, Download, Trash2, Undo2, Zap, Shield, Sparkles, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRouteInTracker?: (waypoints: [number, number][], distanceKm: number) => void;
}

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({
  isOpen,
  onClose,
  onStartRouteInTracker,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  // Waypoints in [longitude, latitude] format
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [targetPaceMinKm, setTargetPaceMinKm] = useState<number>(5.5); // 5:30 min/km
  const [routeName, setRouteName] = useState<string>('Tactical Perimeter Route');

  // Stadia Maps Alidade Smooth Dark - free, no API key needed, proven reliable
  const VECTOR_STYLE_URL = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

  // Haversine distance calculator
  const calculateTotalDistanceKm = (pts: [number, number][]): number => {
    if (pts.length < 2) return 0;
    let totalMeters = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [lon1, lat1] = pts[i];
      const [lon2, lat2] = pts[i + 1];
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalMeters += R * c;
    }
    return Number((totalMeters / 1000).toFixed(2));
  };

  const totalDistanceKm = calculateTotalDistanceKm(waypoints);
  const projectedTerritoryKm2 = Number((totalDistanceKm * 0.08).toFixed(3)); // 40m corridor width = ~0.08 km²/km
  const estimatedDurationMins = Math.round(totalDistanceKm * targetPaceMinKm);
  const estimatedCalories = Math.round(totalDistanceKm * 68);
  const estimatedTrimpLoad = Math.round(totalDistanceKm * 7.5);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    // Center on stored user location or default SF
    let initialLng = -122.4194;
    let initialLat = 37.7749;
    try {
      const savedLoc = JSON.parse(localStorage.getItem('runzone_last_location') || '{}');
      if (savedLoc.lat && savedLoc.lng) {
        initialLat = savedLoc.lat;
        initialLng = savedLoc.lng;
      }
    } catch (e) {}

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
          },
          'esri-labels': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
          },
        },
        layers: [
          { id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 23 },
          { id: 'esri-labels-layer', type: 'raster', source: 'esri-labels', minzoom: 0, maxzoom: 23 },
        ],
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      },
      center: [initialLng, initialLat],
      zoom: 14,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      // Add Route Line Source
      map.addSource('planned-route-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        },
      });

      // 40m Buffered Glow Path
      map.addLayer({
        id: 'planned-route-glow',
        type: 'line',
        source: 'planned-route-source',
        paint: {
          'line-color': '#B8492E',
          'line-width': 22,
          'line-opacity': 0.35,
          'line-blur': 6,
        },
      });

      // Sharp Core Polyline
      map.addLayer({
        id: 'planned-route-core',
        type: 'line',
        source: 'planned-route-source',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 4,
          'line-opacity': 0.95,
        },
      });

      // Click to add waypoint
      map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setWaypoints((prev) => [...prev, [lng, lat]]);
      });

      map.getCanvas().style.cursor = 'crosshair';
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isOpen]);

  // Update map polyline and markers when waypoints change
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('planned-route-source') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: waypoints,
        },
      });
    }

    // Clean old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add numbered pins
    waypoints.forEach((pt, idx) => {
      const el = document.createElement('div');
      el.className = `w-5 h-5 rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white shadow-md ${
        idx === 0
          ? 'bg-[#3E8E7E] border-2 border-white'
          : idx === waypoints.length - 1
          ? 'bg-[#B8492E] border-2 border-white'
          : 'bg-[#1B2023] border border-hairline'
      }`;
      el.innerText = `${idx + 1}`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(pt)
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  }, [waypoints]);

  // Undo last waypoint
  const undoLastPoint = () => {
    setWaypoints((prev) => prev.slice(0, -1));
  };

  // Clear all
  const clearRoute = () => {
    setWaypoints([]);
    toast('Route cleared');
  };

  // Preset Template 5K Loop
  const loadPresetLoop = (type: '5k' | '10k') => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    const lng = center.lng;
    const lat = center.lat;
    const offset = type === '5k' ? 0.012 : 0.024;

    const presetPts: [number, number][] = [
      [lng, lat],
      [lng + offset, lat + offset * 0.4],
      [lng + offset * 1.4, lat - offset * 0.3],
      [lng + offset * 0.8, lat - offset * 1.2],
      [lng - offset * 0.4, lat - offset * 0.9],
      [lng, lat],
    ];
    setWaypoints(presetPts);
    setRouteName(`${type.toUpperCase()} Tactical Perimeter Loop`);
    toast.success(`Generated ${type.toUpperCase()} route template!`);
  };

  // Export GPX XML
  const downloadGPX = () => {
    if (waypoints.length < 2) {
      toast.error('Add at least 2 waypoints to export GPX');
      return;
    }

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RunZone Tactical Spatial Engine">
  <trk>
    <name>${routeName}</name>
    <type>running</type>
    <trkseg>
      ${waypoints.map(([lon, lat]) => `<trkpt lat="${lat}" lon="${lon}"><ele>15.0</ele></trkpt>`).join('\n      ')}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName.toLowerCase().replace(/\s+/g, '_')}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('GPX route downloaded! Compatible with Garmin & Apple Watch.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-night/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans">
      <div className="bg-panel border border-hairline w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-night hairline-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Route className="w-4 h-4 text-cinder" />
            <h2 className="font-display font-bold text-base text-chalk">
              Tactical Route Builder & Corridor Planner
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-chalk-dim hover:text-chalk transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Grid: Metrics/Controls Sidebar + Interactive Map */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Sidebar Controls & Telemetry */}
          <div className="w-full lg:w-80 bg-panel border-r border-hairline p-5 space-y-5 overflow-y-auto flex flex-col justify-between text-xs">
            <div className="space-y-4">
              {/* Route Name Input */}
              <div>
                <label className="block text-chalk-dim text-[11px] font-medium mb-1">
                  Route Name
                </label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-night border border-hairline text-chalk text-xs focus:outline-none focus:border-cinder"
                />
              </div>

              {/* Primary Metrics HUD */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-night border border-hairline p-3">
                  <div className="text-[10px] text-chalk-dim uppercase font-display">Distance</div>
                  <div className="font-display text-2xl font-extrabold text-chalk tabular mt-0.5">
                    {totalDistanceKm}
                    <span className="text-xs font-normal text-chalk-dim ml-1">km</span>
                  </div>
                </div>

                <div className="bg-night border border-hairline p-3">
                  <div className="text-[10px] text-chalk-dim uppercase font-display">Corridor Buffer</div>
                  <div className="font-display text-2xl font-extrabold text-cinder tabular mt-0.5">
                    +{projectedTerritoryKm2}
                    <span className="text-xs font-normal text-chalk-dim ml-1">km²</span>
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Strip */}
              <div className="bg-night border border-hairline p-3 space-y-1.5 text-[11px] font-display tabular">
                <div className="flex justify-between">
                  <span className="text-chalk-dim">Est. Duration:</span>
                  <span className="text-chalk font-semibold">{estimatedDurationMins} mins (@ 5:30 /km)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chalk-dim">TRIMP Fatigue Load:</span>
                  <span className="text-contour font-semibold">{estimatedTrimpLoad} pts (Sweet Spot)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chalk-dim">Estimated Calories:</span>
                  <span className="text-amber-400 font-semibold">{estimatedCalories} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chalk-dim">Waypoints Plotted:</span>
                  <span className="text-chalk font-semibold">{waypoints.length} points</span>
                </div>
              </div>

              {/* Quick Preset Templates */}
              <div>
                <label className="block text-chalk-dim text-[11px] font-medium mb-1.5">
                  Preset Route Templates
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => loadPresetLoop('5k')}
                    className="p-2 bg-night hover:bg-panel-light border border-hairline text-chalk font-display font-medium text-xs text-center transition-colors"
                  >
                    ⚡ 5K Loop
                  </button>
                  <button
                    onClick={() => loadPresetLoop('10k')}
                    className="p-2 bg-night hover:bg-panel-light border border-hairline text-chalk font-display font-medium text-xs text-center transition-colors"
                  >
                    ⚡ 10K Sector Loop
                  </button>
                </div>
              </div>

              {/* Waypoint Edit Actions */}
              <div className="flex gap-2">
                <button
                  onClick={undoLastPoint}
                  disabled={waypoints.length === 0}
                  className="flex-1 py-1.5 bg-night hover:bg-panel-light disabled:opacity-40 border border-hairline text-chalk text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo Point</span>
                </button>
                <button
                  onClick={clearRoute}
                  disabled={waypoints.length === 0}
                  className="py-1.5 px-3 bg-night hover:bg-panel-light disabled:opacity-40 border border-hairline text-chalk-dim hover:text-cinder text-xs transition-colors"
                  title="Clear all waypoints"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Primary Actions */}
            <div className="space-y-2 pt-3 hairline-t">
              <button
                onClick={() => {
                  if (waypoints.length < 2) {
                    toast.error('Plot at least 2 waypoints on the map');
                    return;
                  }
                  if (onStartRouteInTracker) {
                    onStartRouteInTracker(waypoints, totalDistanceKm);
                  }
                  onClose();
                  toast.success(`Loaded ${totalDistanceKm} km route into GPS Tracker!`);
                }}
                disabled={waypoints.length < 2}
                className="w-full py-3 bg-cinder hover:bg-cinder-hover disabled:opacity-40 text-chalk font-display font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START ROUTE IN GPS TRACKER</span>
              </button>

              <button
                onClick={downloadGPX}
                disabled={waypoints.length < 2}
                className="w-full py-2 bg-night hover:bg-panel-light disabled:opacity-40 border border-hairline text-chalk-muted hover:text-chalk text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export GPX to Garmin / Apple Watch</span>
              </button>
            </div>
          </div>

          {/* Right Map Canvas with Live Crosshair Plotting */}
          <div className="flex-1 relative bg-night">
            {/* Top Instruction Banner */}
            <div className="absolute top-3 left-3 z-10 bg-night/90 backdrop-blur-sm border border-hairline px-3 py-1.5 flex items-center gap-2 text-xs shadow-md">
              <MapPin className="w-3.5 h-3.5 text-cinder animate-pulse" />
              <span className="text-chalk font-display font-medium">
                Click anywhere on the map to plot waypoints
              </span>
            </div>

            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
