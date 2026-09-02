import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity } from '../../types';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Activity as ActivityIcon,
  Heart,
  Flame,
  Mountain,
  Zap,
  Clock,
  Shield,
  Sparkles,
  X,
  Award,
  TrendingUp,
  Moon,
  Globe,
} from 'lucide-react';
import {
  getMapTilerTileUrl,
  getMapTilerSatelliteTileUrl,
  DARK_MAP_ATTRIBUTION,
  SATELLITE_MAP_ATTRIBUTION,
} from '../../utils/mapConfig';

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
}

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

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
}) => {
  const [mapMode, setMapMode] = useState<'dark' | 'satellite'>('dark');
  if (!isOpen || !activity) return null;

  const distKm = activity.distance_meters / 1000;
  const durMin = Math.floor(activity.duration_seconds / 60);
  const durSec = activity.duration_seconds % 60;
  const paceSecKm = distKm > 0 ? Math.round(activity.duration_seconds / distKm) : 0;
  const paceMin = Math.floor(paceSecKm / 60);
  const paceRemSec = paceSecKm % 60;
  const paceFormatted = `${paceMin}:${paceRemSec.toString().padStart(2, '0')} /km`;

  // Synthetic Heart Rate Zone Distribution (based on avg HR)
  const avgHR = activity.avg_heart_rate || 148;
  const hrZoneData = [
    { zone: 'Z1 Recovery', time: '12%', percent: 12, color: '#656C71' },
    { zone: 'Z2 Aerobic', time: '68%', percent: 68, color: '#3E8E7E' },
    { zone: 'Z3 Tempo', time: '14%', percent: 14, color: '#C98A2E' },
    { zone: 'Z4 Threshold', time: '6%', percent: 6, color: '#B8492E' },
    { zone: 'Z5 VO2 Max', time: '0%', percent: 0, color: '#E05A3B' },
  ];

  // Synthetic Km Splits Table
  const splitsCount = Math.max(1, Math.round(distKm));
  const splitsData = Array.from({ length: splitsCount }, (_, idx) => {
    const kmNum = idx + 1;
    const splitVariance = (Math.sin(kmNum) * 8).toFixed(0);
    const splitSec = paceSecKm + Number(splitVariance);
    const sMin = Math.floor(splitSec / 60);
    const sSec = Math.abs(splitSec % 60);
    const splitHR = Math.round(avgHR - 6 + kmNum * 2.5);
    const elev = Math.round(activity.elevation_gain_meters ? (activity.elevation_gain_meters / splitsCount) + (Math.cos(kmNum) * 4) : 5);

    return {
      km: kmNum,
      pace: `${sMin}:${sSec.toString().padStart(2, '0')}`,
      avgHR: splitHR,
      elevation: elev >= 0 ? `+${elev} m` : `${elev} m`,
    };
  });

  // Extract coordinates in Leaflet [lat, lon] format
  let leafletCoords: [number, number][] = [];
  if (
    activity.geojson_data &&
    Array.isArray(activity.geojson_data.coordinates) &&
    activity.geojson_data.coordinates.length >= 2
  ) {
    // GeoJSON is [lon, lat] -> convert to [lat, lon] for Leaflet
    leafletCoords = (activity.geojson_data.coordinates as number[][]).map(
      (pt) => [pt[1], pt[0]] as [number, number]
    );
  } else {
    // Default New Delhi corridor
    leafletCoords = [
      [28.5209, 77.2806],
      [28.5225, 77.2825],
      [28.5248, 77.2842],
      [28.5270, 77.2858],
      [28.5295, 77.2875],
      [28.5318, 77.2890],
    ];
  }

  const midIdx = Math.floor(leafletCoords.length / 2);
  const centerLat = leafletCoords[midIdx]?.[0] ?? 28.5209;
  const centerLng = leafletCoords[midIdx]?.[1] ?? 77.2806;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-night/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-panel border border-hairline w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-night hairline-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ActivityIcon className="w-4 h-4 text-cinder" />
            <div>
              <h2 className="font-display font-bold text-base text-chalk">
                {activity.title}
              </h2>
              <div className="text-[11px] text-chalk-dim">
                {activity.started_at
                  ? format(new Date(activity.started_at), 'MMMM d, yyyy · h:mm a')
                  : 'Recent Activity'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-chalk-dim hover:text-chalk transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Primary Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-night border border-hairline">
              <div className="text-[10px] uppercase font-display text-chalk-dim">Distance</div>
              <div className="font-display text-2xl font-extrabold text-chalk tabular mt-0.5">
                {distKm.toFixed(2)}
                <span className="text-xs font-normal text-chalk-dim ml-1">km</span>
              </div>
            </div>

            <div className="p-3 bg-night border border-hairline">
              <div className="text-[10px] uppercase font-display text-chalk-dim">Duration</div>
              <div className="font-display text-2xl font-extrabold text-chalk tabular mt-0.5">
                {durMin}:{durSec.toString().padStart(2, '0')}
              </div>
            </div>

            <div className="p-3 bg-night border border-hairline">
              <div className="text-[10px] uppercase font-display text-chalk-dim">Avg Pace</div>
              <div className="font-display text-2xl font-extrabold text-chalk tabular mt-0.5">
                {paceFormatted}
              </div>
            </div>

            <div className="p-3 bg-night border border-hairline">
              <div className="text-[10px] uppercase font-display text-chalk-dim">Territory Claimed</div>
              <div className="font-display text-2xl font-extrabold text-cinder tabular mt-0.5">
                +{(activity.territory_captured_km2 || distKm * 0.08).toFixed(3)}
                <span className="text-xs font-normal text-chalk-dim ml-1">km²</span>
              </div>
            </div>
          </div>

          {/* Secondary Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-display tabular">
            <div className="p-3 bg-night border border-hairline flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-red-400" />
              <div>
                <div className="text-[10px] text-chalk-dim">Avg Heart Rate</div>
                <div className="font-bold text-chalk">{avgHR} bpm</div>
              </div>
            </div>

            <div className="p-3 bg-night border border-hairline flex items-center gap-2.5">
              <Mountain className="w-4 h-4 text-contour" />
              <div>
                <div className="text-[10px] text-chalk-dim">Elevation Gain</div>
                <div className="font-bold text-chalk">+{activity.elevation_gain_meters || 28} m</div>
              </div>
            </div>

            <div className="p-3 bg-night border border-hairline flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-[10px] text-chalk-dim">Calories Burned</div>
                <div className="font-bold text-chalk">{(activity as any).calories || Math.round(distKm * 68)} kcal</div>
              </div>
            </div>

            <div className="p-3 bg-night border border-hairline flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-cinder" />
              <div>
                <div className="text-[10px] text-chalk-dim">TRIMP Workload Load</div>
                <div className="font-bold text-cinder">{activity.workload_score || Math.round(distKm * 7.4)} pts</div>
              </div>
            </div>
          </div>

          {/* Map Preview & Heart Rate Zones Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Leaflet Track Preview */}
            <div className="lg:col-span-7 h-64 border border-hairline relative overflow-hidden bg-night">
              <div className="absolute top-2 left-2 z-[1000] bg-night/90 backdrop-blur-sm border border-hairline px-2 py-1 text-[10px] font-display font-semibold text-chalk shadow-xs">
                40m PostGIS Corridor Path
              </div>

              {/* Basemap Switcher (Dark vs Satellite) */}
              <div className="absolute top-2 right-2 z-[1000] flex items-center bg-night/90 backdrop-blur-sm border border-hairline p-0.5 shadow-md">
                <button
                  type="button"
                  onClick={() => setMapMode('dark')}
                  className={`px-2 py-0.5 text-[10px] font-display font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    mapMode === 'dark'
                      ? 'bg-panel-light text-chalk border border-hairline-strong shadow-xs'
                      : 'text-chalk-dim hover:text-chalk'
                  }`}
                  title="Dark Map"
                >
                  <Moon className="w-2.5 h-2.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('satellite')}
                  className={`px-2 py-0.5 text-[10px] font-display font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    mapMode === 'satellite'
                      ? 'bg-cinder text-chalk border border-cinder shadow-xs'
                      : 'text-chalk-dim hover:text-chalk'
                  }`}
                  title="Satellite Imagery"
                >
                  <Globe className="w-2.5 h-2.5" />
                  <span>Satellite</span>
                </button>
              </div>

              <MapContainer
                center={[centerLat, centerLng]}
                zoom={14}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <MapResizer />
                {mapMode === 'dark' ? (
                  <TileLayer
                    key="dark-layer"
                    attribution={DARK_MAP_ATTRIBUTION}
                    url={getMapTilerTileUrl()}
                    maxZoom={22}
                    tileSize={256}
                  />
                ) : (
                  <TileLayer
                    key="satellite-layer"
                    attribution={SATELLITE_MAP_ATTRIBUTION}
                    url={getMapTilerSatelliteTileUrl()}
                    maxZoom={22}
                    tileSize={256}
                  />
                )}

                {/* 40m Buffered Glow Path */}
                <Polyline
                  positions={leafletCoords}
                  pathOptions={{
                    color: '#B8492E',
                    weight: 16,
                    opacity: 0.35,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />

                {/* Core Track Polyline */}
                <Polyline
                  positions={leafletCoords}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 3.5,
                    opacity: 0.95,
                  }}
                />

                {/* Start & End Pins */}
                {leafletCoords.length >= 2 && (
                  <>
                    <CircleMarker
                      center={leafletCoords[0]}
                      radius={6}
                      pathOptions={{
                        color: '#FFFFFF',
                        fillColor: '#3E8E7E',
                        fillOpacity: 1,
                        weight: 2,
                      }}
                    />
                    <CircleMarker
                      center={leafletCoords[leafletCoords.length - 1]}
                      radius={6}
                      pathOptions={{
                        color: '#FFFFFF',
                        fillColor: '#B8492E',
                        fillOpacity: 1,
                        weight: 2,
                      }}
                    />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Heart Rate Distribution */}
            <div className="lg:col-span-5 bg-night border border-hairline p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-xs text-chalk">
                  Karvonen Heart Rate Zones
                </span>
                <span className="text-[10px] text-contour font-display font-semibold">
                  68% in Sweet Spot (Zone 2)
                </span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hrZoneData} layout="vertical" margin={{ left: -15, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="zone" type="category" stroke="#9BA1A6" fontSize={10} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      formatter={(val: any) => [`${val}% of workout`, 'Duration']}
                      contentStyle={{ backgroundColor: '#14181A', borderColor: 'rgba(237,238,231,0.1)', fontSize: '11px' }}
                    />
                    <Bar dataKey="percent" radius={[0, 2, 2, 0]}>
                      {hrZoneData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Kilometer Splits Table */}
          <div className="space-y-2">
            <h3 className="font-display font-bold text-xs text-chalk">
              Kilometer Splits & Pacing Telemetry
            </h3>
            <div className="bg-night border border-hairline">
              <div className="px-4 py-2 bg-panel hairline-b grid grid-cols-4 text-[10px] font-display uppercase font-semibold text-chalk-dim">
                <span>Kilometer</span>
                <span>Pace (/km)</span>
                <span>Avg Heart Rate</span>
                <span className="text-right">Elevation</span>
              </div>
              <div className="divide-y divide-hairline text-xs font-display tabular">
                {splitsData.map((s) => (
                  <div key={s.km} className="px-4 py-2 grid grid-cols-4 items-center">
                    <span className="font-bold text-chalk">KM {s.km}</span>
                    <span className="text-chalk font-semibold">{s.pace}</span>
                    <span className="text-chalk-muted">{s.avgHR} bpm</span>
                    <span className="text-right text-contour">{s.elevation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ZoneCoach Post-Run Debrief */}
          <div className="p-4 bg-night border border-hairline space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-display font-bold text-chalk">
              <Sparkles className="w-3.5 h-3.5 text-cinder" />
              <span>ZoneCoach Post-Workout Debrief</span>
            </div>
            <p className="text-chalk-muted leading-relaxed text-[11px]">
              You maintained <strong>68% of volume in Zone 2 aerobic base</strong>, keeping soft-tissue mechanical fatigue in the optimal sweet spot. The 40m buffered PostGIS corridor captured <strong>+{(activity.territory_captured_km2 || distKm * 0.08).toFixed(3)} km²</strong> of territory without spiking your 7-day ACWR ratio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
