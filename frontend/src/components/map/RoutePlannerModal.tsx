import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { Route, MapPin, Play, Download, Trash2, Undo2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRouteInTracker?: (waypoints: [number, number][], distanceKm: number) => void;
}

// Haversine distance calculator
const calculateTotalDistanceKm = (pts: [number, number][]): number => {
  if (pts.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [lat1, lon1] = pts[i];
    const [lat2, lon2] = pts[i + 1];
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

// Map click listener component
const MapClickHandler: React.FC<{
  onAddPoint: (lat: number, lng: number) => void;
}> = ({ onAddPoint }) => {
  useMapEvents({
    click(e) {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Auto-resizer component on modal open
const MapResizer: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({
  isOpen,
  onClose,
  onStartRouteInTracker,
}) => {
  // Waypoints in [latitude, longitude] format for Leaflet
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [targetPaceMinKm, setTargetPaceMinKm] = useState<number>(5.5); // 5:30 min/km
  const [routeName, setRouteName] = useState<string>('Tactical Perimeter Route');

  // Read saved initial location or default to New Delhi
  let initialLat = 28.5209;
  let initialLng = 77.2806;
  try {
    const savedLoc = JSON.parse(localStorage.getItem('runzone_last_location') || '{}');
    if (savedLoc.lat && savedLoc.lng) {
      initialLat = savedLoc.lat;
      initialLng = savedLoc.lng;
    }
  } catch (e) {}

  const totalDistanceKm = calculateTotalDistanceKm(waypoints);
  const projectedTerritoryKm2 = Number((totalDistanceKm * 0.08).toFixed(3)); // 40m corridor width = ~0.08 km²/km
  const estimatedDurationMins = Math.round(totalDistanceKm * targetPaceMinKm);
  const estimatedCalories = Math.round(totalDistanceKm * 68);
  const estimatedTrimpLoad = Math.round(totalDistanceKm * 7.5);

  const handleAddPoint = (lat: number, lng: number) => {
    setWaypoints((prev) => [...prev, [lat, lng]]);
  };

  const undoLastPoint = () => {
    setWaypoints((prev) => prev.slice(0, -1));
  };

  const clearRoute = () => {
    setWaypoints([]);
    toast('Route cleared', { icon: '🧹' });
  };

  const loadPresetLoop = (preset: '5k' | '10k') => {
    const startLat = waypoints.length > 0 ? waypoints[0][0] : initialLat;
    const startLng = waypoints.length > 0 ? waypoints[0][1] : initialLng;
    const d = preset === '5k' ? 0.012 : 0.024;

    const loopPoints: [number, number][] = [
      [startLat, startLng],
      [startLat + d * 0.8, startLng + d * 0.3],
      [startLat + d * 1.1, startLng + d * 1.0],
      [startLat + d * 0.4, startLng + d * 1.4],
      [startLat - d * 0.3, startLng + d * 0.9],
      [startLat, startLng],
    ];

    setWaypoints(loopPoints);
    setRouteName(`${preset.toUpperCase()} Tactical Loop`);
    toast.success(`Generated ${preset.toUpperCase()} perimeter route template!`);
  };

  const downloadGPX = () => {
    if (waypoints.length < 2) {
      toast.error('Add at least 2 waypoints before exporting GPX');
      return;
    }

    const gpxPoints = waypoints
      .map(
        ([lat, lon]) =>
          `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>15.0</ele></trkpt>`
      )
      .join('\n');

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RunZone Tactical Engine" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${routeName}</name>
    <desc>RunZone Territory Corridor GPX Route</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${routeName}</name>
    <trkseg>
${gpxPoints}
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
    <div
      className="fixed inset-0 z-[9999] bg-night/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
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
              className="p-1.5 text-chalk-dim hover:text-chalk transition-colors cursor-pointer"
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
                    className="p-2 bg-night hover:bg-panel-light border border-hairline text-chalk font-display font-medium text-xs text-center transition-colors cursor-pointer"
                  >
                    ⚡ 5K Loop
                  </button>
                  <button
                    onClick={() => loadPresetLoop('10k')}
                    className="p-2 bg-night hover:bg-panel-light border border-hairline text-chalk font-display font-medium text-xs text-center transition-colors cursor-pointer"
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
                  className="flex-1 py-1.5 bg-night hover:bg-panel-light disabled:opacity-40 border border-hairline text-chalk text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo Point</span>
                </button>
                <button
                  onClick={clearRoute}
                  disabled={waypoints.length === 0}
                  className="py-1.5 px-3 bg-night hover:bg-panel-light disabled:opacity-40 border border-hairline text-chalk-dim hover:text-cinder text-xs transition-colors cursor-pointer"
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
                    // Convert [lat, lon] to [lon, lat] for GPS tracker
                    const lonLatWaypoints = waypoints.map(([lat, lon]) => [lon, lat] as [number, number]);
                    onStartRouteInTracker(lonLatWaypoints, totalDistanceKm);
                  }
                  onClose();
                  toast.success(`Loaded ${totalDistanceKm} km route into GPS Tracker!`);
                }}
                disabled={waypoints.length < 2}
                className="w-full py-3 bg-cinder hover:bg-cinder-hover disabled:opacity-40 text-chalk font-display font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START ROUTE IN GPS TRACKER</span>
              </button>

              <button
                onClick={downloadGPX}
                disabled={waypoints.length < 2}
                className="w-full py-2 bg-night hover:bg-panel-light disabled:opacity-40 border border-hairline text-chalk-muted hover:text-chalk text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export GPX to Garmin / Apple Watch</span>
              </button>
            </div>
          </div>

          {/* Right Leaflet Map Canvas with Live Crosshair Plotting */}
          <div className="flex-1 relative bg-night">
            {/* Top Instruction Banner */}
            <div className="absolute top-3 left-3 z-[1000] bg-night/90 backdrop-blur-sm border border-hairline px-3 py-1.5 flex items-center gap-2 text-xs shadow-md">
              <MapPin className="w-3.5 h-3.5 text-cinder animate-pulse" />
              <span className="text-chalk font-display font-medium">
                Click anywhere on the map to plot waypoints
              </span>
            </div>

            <MapContainer
              center={[initialLat, initialLng]}
              zoom={14.5}
              scrollWheelZoom={true}
              className="w-full h-full cursor-crosshair"
            >
              <MapResizer />
              <MapClickHandler onAddPoint={handleAddPoint} />

              <TileLayer
                attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={`https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY}`}
                maxZoom={22}
                tileSize={256}
              />

              {/* Waypoints Polyline Glow & Core */}
              {waypoints.length > 1 && (
                <>
                  <Polyline
                    positions={waypoints}
                    pathOptions={{
                      color: '#B8492E',
                      weight: 16,
                      opacity: 0.35,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  <Polyline
                    positions={waypoints}
                    pathOptions={{
                      color: '#FFFFFF',
                      weight: 3.5,
                      opacity: 0.95,
                    }}
                  />
                </>
              )}

              {/* Waypoint Markers */}
              {waypoints.map((pt, idx) => (
                <CircleMarker
                  key={`pt-${idx}-${pt[0]}-${pt[1]}`}
                  center={pt}
                  radius={idx === 0 ? 8 : idx === waypoints.length - 1 ? 7 : 5}
                  pathOptions={{
                    color: '#FFFFFF',
                    fillColor: idx === 0 ? '#3E8E7E' : idx === waypoints.length - 1 ? '#B8492E' : '#C98A2E',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
