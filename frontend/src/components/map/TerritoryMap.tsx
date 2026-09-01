import React, { useState, useCallback } from 'react';
import { TerritoryGeoJSONCollection } from '../../types';
import { TerritoryMap2D } from './TerritoryMap2D';
import { TerritoryMap3D } from './TerritoryMap3D';
import { Crosshair, Loader2, Maximize2, Layers, Box } from 'lucide-react';
import toast from 'react-hot-toast';
import { acquireLiveLocation, isSecureContext } from '../../utils/geoService';
import { generateDynamicLocalSectors } from '../../utils/mapConfig';

export type MapDisplayMode = '2d' | '3d';

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
  activePolyline = [],
  center = [28.5209, 77.2806], // Default New Delhi [lat, lon]
  zoom = 15,
  height = '540px',
  onZoneSelect,
  fullBleed = false,
  onLocationFound,
}) => {
  // Read initial saved location from localStorage if available
  let initialLat = center[0];
  let initialLng = center[1];
  try {
    const savedLoc = JSON.parse(localStorage.getItem('runzone_last_location') || '{}');
    if (savedLoc.lat && savedLoc.lng) {
      initialLat = savedLoc.lat;
      initialLng = savedLoc.lng;
    }
  } catch (e) {}

  const [mapMode, setMapMode] = useState<MapDisplayMode>('2d');
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>({
    lat: initialLat,
    lng: initialLng,
  });
  const [locating, setLocating] = useState<boolean>(false);

  // Active polyline in Leaflet format [[lat, lon], ...]
  const formatted2DPolyline: [number, number][] = activePolyline.map((pt) => [pt[1], pt[0]]);

  // Dataset of territory polygons
  const territoriesData =
    territories && territories.features && territories.features.length > 0
      ? territories
      : generateDynamicLocalSectors(currentCenter.lat, currentCenter.lng);

  // Synchronize camera state when user pans/zooms in either map mode
  const handleMapMoveEnd = useCallback((lat: number, lng: number, newZoom: number) => {
    setCurrentCenter({ lat, lng });
    setCurrentZoom(newZoom);
  }, []);

  // Handle 3D mode switch with safe fallback
  const handleModeChange = (mode: MapDisplayMode) => {
    if (mode === '3d') {
      // Check WebGL support before switching
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        toast.error('3D Terrain requires WebGL hardware acceleration, which is unavailable on this browser.', {
          duration: 4000,
        });
        return;
      }
      toast('Entering 3D Terrain Mode · Right-click or drag to tilt & rotate', { icon: '🏔️' });
    }
    setMapMode(mode);
  };

  // Fallback handler if 3D initialization fails
  const handle3DError = useCallback((errMessage: string) => {
    console.warn('[RunZone 3D Fallback]', errMessage);
    toast.error(`3D map unavailable: ${errMessage}. Reverting to 2D tactical map.`, { duration: 4000 });
    setMapMode('2d');
  }, []);

  // Production-grade Geolocation with dual-pass accuracy and managed toasts
  const fetchLiveLocation = async () => {
    if (locating) return;

    if (!isSecureContext()) {
      toast.error('GPS requires a secure HTTPS connection.', { id: 'gps-locate' });
      return;
    }

    setLocating(true);
    toast.loading('Acquiring live GPS coordinates…', { id: 'gps-locate' });

    try {
      const result = await acquireLiveLocation((stage) => {
        if (stage === 'fallback_low_accuracy') {
          toast.loading('Acquiring network position…', { id: 'gps-locate' });
        }
      });

      const { latitude, longitude } = result;
      setUserCoords({ lat: latitude, lng: longitude });
      setCurrentCenter({ lat: latitude, lng: longitude });
      setCurrentZoom(16);

      try {
        localStorage.setItem('runzone_last_location', JSON.stringify({ lat: latitude, lng: longitude }));
      } catch (e) {}

      toast.success(`Position acquired (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, {
        id: 'gps-locate',
      });

      if (onLocationFound) onLocationFound(latitude, longitude);
    } catch (err: any) {
      console.warn('[RunZone Geolocation]', err);
      toast.error(err.userMessage || 'Could not acquire GPS position. Click to retry.', {
        id: 'gps-locate',
        duration: 5000,
      });
    } finally {
      setLocating(false);
    }
  };

  // Re-center map to user coordinates or default center
  const resetCenter = () => {
    const targetLat = userCoords ? userCoords.lat : initialLat;
    const targetLng = userCoords ? userCoords.lng : initialLng;
    setCurrentCenter({ lat: targetLat, lng: targetLng });
    setCurrentZoom(15.5);
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-night ${
        fullBleed ? 'border-y border-hairline' : 'border border-hairline'
      }`}
      style={{ height }}
    >
      {/* Top Left Status Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-night/90 backdrop-blur-sm border border-hairline px-3 py-1.5 flex items-center gap-3 text-xs shadow-md">
        <div className="flex items-center gap-1.5 text-chalk font-display font-semibold">
          <span className="w-2 h-2 rounded-full bg-cinder inline-block animate-pulse" />
          <span>{mapMode === '3d' ? '3D WebGL Terrain Mode' : '2D Tactical Grid · OpenStreetMap'}</span>
        </div>
        <div className="h-3 w-px bg-hairline-strong" />
        <span className="text-chalk-muted font-display tabular text-[11px]">
          {userCoords ? `Live: ${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)}` : 'Live spatial grid'}
        </span>
      </div>

      {/* Top Right Tactical Controls: Mode Switcher + Locate + Re-center */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* 2D / 3D Segmented Switcher */}
        <div className="bg-night/95 backdrop-blur-md border border-hairline p-0.5 flex items-center shadow-md">
          <button
            onClick={() => handleModeChange('2d')}
            className={`px-2.5 py-1 text-xs font-display font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapMode === '2d'
                ? 'bg-cinder text-chalk shadow-sm'
                : 'text-chalk-muted hover:text-chalk hover:bg-panel'
            }`}
            title="Switch to standard 2D tactical map"
          >
            <Layers className="w-3 h-3" />
            <span>2D Map</span>
          </button>
          <button
            onClick={() => handleModeChange('3d')}
            className={`px-2.5 py-1 text-xs font-display font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapMode === '3d'
                ? 'bg-cinder text-chalk shadow-sm'
                : 'text-chalk-muted hover:text-chalk hover:bg-panel'
            }`}
            title="Switch to 3D terrain elevation map"
          >
            <Box className="w-3 h-3" />
            <span>3D Terrain</span>
          </button>
        </div>

        {/* Locate Me Button */}
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

        {/* Re-center Button */}
        <button
          onClick={resetCenter}
          className="p-1.5 bg-night/90 hover:bg-panel border border-hairline text-chalk-muted hover:text-chalk transition-colors shadow-md cursor-pointer"
          title="Re-center map"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Render 2D Leaflet Map (Default & Safe Fallback) */}
      {mapMode === '2d' && (
        <TerritoryMap2D
          center={currentCenter}
          zoom={currentZoom}
          userCoords={userCoords}
          territoriesData={territoriesData}
          formattedPolyline={formatted2DPolyline}
          onZoneSelect={onZoneSelect}
          onMoveEnd={handleMapMoveEnd}
        />
      )}

      {/* Render 3D MapLibre WebGL Terrain Map */}
      {mapMode === '3d' && (
        <TerritoryMap3D
          center={currentCenter}
          zoom={currentZoom}
          userCoords={userCoords}
          territoriesData={territoriesData}
          activePolyline={activePolyline}
          onZoneSelect={onZoneSelect}
          onMoveEnd={handleMapMoveEnd}
          onError={handle3DError}
        />
      )}
    </div>
  );
};
