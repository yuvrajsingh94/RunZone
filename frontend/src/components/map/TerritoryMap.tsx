import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { TerritoryGeoJSONCollection } from '../../types';
import { Crosshair, Loader2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { acquireLiveLocation, isSecureContext } from '../../utils/geoService';
import { generateDynamicLocalSectors } from '../../utils/mapConfig';
import 'leaflet/dist/leaflet.css';

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

// Controller component to handle programmatic camera pan/zoom in Leaflet
const MapViewController: React.FC<{
  targetCoords: { lat: number; lng: number } | null;
  zoomLevel: number;
}> = ({ targetCoords, zoomLevel }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo([targetCoords.lat, targetCoords.lng], zoomLevel, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [targetCoords, zoomLevel, map]);
  return null;
};

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

  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>({
    lat: initialLat,
    lng: initialLng,
  });
  const [locating, setLocating] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  // Active polyline in Leaflet format [[lat, lon], ...]
  const formattedPolyline: [number, number][] = activePolyline.map((pt) => [pt[1], pt[0]]);

  // Dataset of territory polygons
  const territoriesData =
    territories && territories.features && territories.features.length > 0
      ? territories
      : generateDynamicLocalSectors(currentCenter.lat, currentCenter.lng);

  // Style callback for territory polygons
  const getFeatureStyle = (feature: any) => {
    const isUserOwned = feature?.properties?.is_user_owned;
    const defense = feature?.properties?.defense_points || 50;
    const isContested = defense < 40;

    return {
      fillColor: isUserOwned ? '#B8492E' : '#3E8E7E',
      fillOpacity: 0.35,
      color: isContested ? '#C98A2E' : isUserOwned ? '#E05A3B' : '#4EA896',
      weight: isUserOwned ? 3 : 2,
      opacity: 0.9,
    };
  };

  // Interactive popup on each sector feature
  const onEachFeature = (feature: any, layer: any) => {
    const props = feature.properties || {};
    const popupContent = `
      <div style="font-family: 'Inter', sans-serif; color: #111827; padding: 4px; min-width: 170px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <strong style="font-size: 13px; color: #111827;">${props.zone_name || 'Sector Zone'}</strong>
          <span style="font-size: 10px; padding: 1px 5px; background: ${
            props.is_user_owned ? '#B8492E20' : '#3E8E7E20'
          }; color: ${props.is_user_owned ? '#B8492E' : '#3E8E7E'}; font-weight: bold; border-radius: 2px;">
            ${props.owner_username || 'Athlete'}
          </span>
        </div>
        <div style="font-size: 11px; color: #4B5563; line-height: 1.5; border-top: 1px solid #E5E7EB; padding-top: 4px;">
          <div>Area: <strong>${Number(props.area_km2 || 0.85).toFixed(3)} km²</strong></div>
          <div>Defense: <strong>${props.defense_points || 88}/100</strong></div>
          <div style="color: ${props.is_user_owned ? '#B8492E' : '#3E8E7E'}; font-weight: bold; margin-top: 2px;">
            ${props.is_user_owned ? 'Your Territory' : 'Rival Sector'}
          </div>
        </div>
      </div>
    `;
    layer.bindPopup(popupContent);

    layer.on({
      click: () => {
        if (onZoneSelect) onZoneSelect(props);
      },
    });
  };

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

  const resetCenter = () => {
    setCurrentCenter({ lat: initialLat, lng: initialLng });
    setCurrentZoom(15);
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-night ${
        fullBleed ? 'border-y border-hairline' : 'border border-hairline'
      }`}
      style={{ height }}
    >
      {/* Top Left Status Overlay */}
      <div className="absolute top-3 left-3 z-[9000] bg-night/90 backdrop-blur-sm border border-hairline px-3 py-1.5 flex items-center gap-3 text-xs shadow-md">
        <div className="flex items-center gap-1.5 text-chalk font-display font-semibold">
          <span className="w-2 h-2 rounded-full bg-cinder inline-block animate-pulse" />
          <span>Live Tactical Grid · MapTiler Dark</span>
        </div>
        <div className="h-3 w-px bg-hairline-strong" />
        <span className="text-chalk-muted font-display tabular text-[11px]">
          {userCoords ? `Live: ${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)}` : 'Live spatial grid'}
        </span>
      </div>

      {/* Top Right Tactical Controls */}
      <div className="absolute top-3 right-3 z-[9000] flex items-center gap-1.5">
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
          onClick={resetCenter}
          className="p-1.5 bg-night/90 hover:bg-panel border border-hairline text-chalk-muted hover:text-chalk transition-colors shadow-md cursor-pointer"
          title="Re-center map"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Leaflet Map Engine */}
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapViewController targetCoords={currentCenter} zoomLevel={currentZoom} />

        {/* MapTiler Dark Basemap (API key via VITE_MAPTILER_API_KEY env var) */}
        <TileLayer
          attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY}`}
          maxZoom={22}
          tileSize={256}
        />

        {/* Territory Sectors GeoJSON Layer */}
        <GeoJSON
          key={`territories-${currentCenter.lat}-${currentCenter.lng}-${territoriesData?.features?.length || 0}`}
          data={territoriesData as any}
          style={getFeatureStyle}
          onEachFeature={onEachFeature}
        />

        {/* Active Run Corridor Polyline */}
        {formattedPolyline.length > 1 && (
          <>
            {/* 40m Buffered Glow Path */}
            <Polyline
              positions={formattedPolyline}
              pathOptions={{
                color: '#B8492E',
                weight: 18,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Sharp Core Polyline */}
            <Polyline
              positions={formattedPolyline}
              pathOptions={{
                color: '#FFFFFF',
                weight: 3.5,
                opacity: 0.95,
              }}
            />
          </>
        )}

        {/* Athlete Location Marker */}
        {userCoords && (
          <CircleMarker
            center={[userCoords.lat, userCoords.lng]}
            radius={8}
            pathOptions={{
              color: '#FFFFFF',
              fillColor: '#B8492E',
              fillOpacity: 1,
              weight: 2.5,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};
