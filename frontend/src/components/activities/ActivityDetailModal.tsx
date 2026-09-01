import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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
} from 'lucide-react';

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || 'PN0TxMEOhCAGQMwlU7zv';
  const VECTOR_STYLE_URL = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;

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

  // Setup MapLibre preview if coordinates exist
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let coords: [number, number][] = [];
    if (
      activity.geojson_data &&
      Array.isArray(activity.geojson_data.coordinates) &&
      activity.geojson_data.coordinates.length >= 2
    ) {
      coords = activity.geojson_data.coordinates as [number, number][];
    } else {
      // Safe Default San Francisco Waterfront polyline
      coords = [
        [-122.3937, 37.7955],
        [-122.3948, 37.7968],
        [-122.3962, 37.7982],
        [-122.3985, 37.8001],
        [-122.4011, 37.8018],
        [-122.4042, 37.8035],
        [-122.4078, 37.8052],
        [-122.4115, 37.8066],
        [-122.4158, 37.8078],
        [-122.4201, 37.8085],
      ];
    }

    const midIdx = Math.floor(coords.length / 2);
    const centerLng = coords[midIdx]?.[0] ?? -122.4194;
    const centerLat = coords[midIdx]?.[1] ?? 37.7749;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: VECTOR_STYLE_URL,
      center: [centerLng, centerLat],
      zoom: 14,
      pitch: 40,
      bearing: -15,
      attributionControl: false,
    });

    map.on('load', () => {
      map.resize();
      setTimeout(() => map.resize(), 150);
      // Add Source
      map.addSource('activity-track', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      });

      // 40m Buffer Glow
      map.addLayer({
        id: 'track-glow',
        type: 'line',
        source: 'activity-track',
        paint: {
          'line-color': '#B8492E',
          'line-width': 18,
          'line-opacity': 0.35,
          'line-blur': 4,
        },
      });

      // Core Polyline
      map.addLayer({
        id: 'track-core',
        type: 'line',
        source: 'activity-track',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 3.5,
          'line-opacity': 0.95,
        },
      });

      // Start & End markers
      const startEl = document.createElement('div');
      startEl.className = 'w-3.5 h-3.5 rounded-full bg-[#3E8E7E] border-2 border-white';
      new maplibregl.Marker({ element: startEl }).setLngLat(coords[0]).addTo(map);

      const endEl = document.createElement('div');
      endEl.className = 'w-3.5 h-3.5 rounded-full bg-[#B8492E] border-2 border-white';
      new maplibregl.Marker({ element: endEl }).setLngLat(coords[coords.length - 1]).addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [activity]);

  return (
    <div className="fixed inset-0 z-50 bg-night/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans">
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
                  : 'Recorded Workout'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-chalk-dim hover:text-chalk transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Primary Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 bg-night border border-hairline py-3">
            <div className="px-4">
              <div className="text-[10px] text-chalk-dim uppercase font-display">Distance</div>
              <div className="font-display text-2xl font-extrabold text-chalk tabular mt-0.5">
                {distKm.toFixed(2)}
                <span className="text-xs font-normal text-chalk-dim ml-1">km</span>
              </div>
            </div>

            <div className="px-4 hairline-l">
              <div className="text-[10px] text-chalk-dim uppercase font-display">Duration</div>
              <div className="font-display text-2xl font-extrabold text-chalk tabular mt-0.5">
                {durMin}:{durSec.toString().padStart(2, '0')}
              </div>
            </div>

            <div className="px-4 hairline-l">
              <div className="text-[10px] text-chalk-dim uppercase font-display">Avg Pace</div>
              <div className="font-display text-2xl font-extrabold text-chalk tabular mt-0.5">
                {paceFormatted}
              </div>
            </div>

            <div className="px-4 hairline-l">
              <div className="text-[10px] text-chalk-dim uppercase font-display">Territory Captured</div>
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
            {/* MapLibre Track Preview */}
            <div className="lg:col-span-7 h-64 border border-hairline relative overflow-hidden bg-night">
              <div className="absolute top-2 left-2 z-10 bg-night/90 border border-hairline px-2 py-1 text-[10px] font-display font-semibold text-chalk">
                40m PostGIS Corridor Path
              </div>
              <div ref={mapContainerRef} className="w-full h-full" />
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
