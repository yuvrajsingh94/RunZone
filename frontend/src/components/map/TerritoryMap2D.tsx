import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { TerritoryGeoJSONCollection } from '../../types';
import 'leaflet/dist/leaflet.css';

interface TerritoryMap2DProps {
  center: { lat: number; lng: number };
  zoom: number;
  userCoords: { lat: number; lng: number } | null;
  territoriesData: TerritoryGeoJSONCollection;
  formattedPolyline: [number, number][]; // [[lat, lon], ...]
  onZoneSelect?: (zone: any) => void;
  onMoveEnd?: (lat: number, lng: number, zoom: number) => void;
}

// Controller component to handle programmatic camera pan/zoom in Leaflet
const LeafletViewController: React.FC<{
  targetCoords: { lat: number; lng: number };
  zoomLevel: number;
  onMoveEnd?: (lat: number, lng: number, zoom: number) => void;
}> = ({ targetCoords, zoomLevel, onMoveEnd }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo([targetCoords.lat, targetCoords.lng], zoomLevel, {
      animate: true,
      duration: 1.2,
    });
  }, [targetCoords.lat, targetCoords.lng, zoomLevel, map]);

  useEffect(() => {
    if (!onMoveEnd) return;
    const handleMoveEnd = () => {
      const c = map.getCenter();
      onMoveEnd(c.lat, c.lng, map.getZoom());
    };
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onMoveEnd]);

  return null;
};

export const TerritoryMap2D: React.FC<TerritoryMap2DProps> = ({
  center,
  zoom,
  userCoords,
  territoriesData,
  formattedPolyline,
  onZoneSelect,
  onMoveEnd,
}) => {
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

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <LeafletViewController
        targetCoords={center}
        zoomLevel={zoom}
        onMoveEnd={onMoveEnd}
      />

      {/* Crisp OpenStreetMap Basemap Layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {/* Territory Sectors GeoJSON Layer */}
      <GeoJSON
        key={`territories-2d-${center.lat}-${center.lng}-${territoriesData?.features?.length || 0}`}
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
  );
};
