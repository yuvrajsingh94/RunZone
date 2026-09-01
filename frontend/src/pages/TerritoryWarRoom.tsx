import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { TerritoryGeoJSONCollection } from '../types';
import { TerritoryMap } from '../components/map/TerritoryMap';
import { RoutePlannerModal } from '../components/map/RoutePlannerModal';
import { useTerritoryRealtime } from '../hooks/useTerritoryRealtime';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { RefreshCw, Play, Radio, Shield, MapPin, Zap, Route } from 'lucide-react';

interface TerritoryWarRoomProps {
  onOpenLiveTracker?: () => void;
  onOpenSimulate: () => void;
  onOpenGPX: () => void;
}

export const TerritoryWarRoom: React.FC<TerritoryWarRoomProps> = ({
  onOpenLiveTracker,
  onOpenSimulate,
  onOpenGPX,
}) => {
  const [territories, setTerritories] = useState<TerritoryGeoJSONCollection | null>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTerritories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTerritoryMap();
      setTerritories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  // Real-time WebSocket connection for live territory events
  const { isConnected } = useTerritoryRealtime(
    useCallback(() => {
      fetchTerritories();
    }, [fetchTerritories])
  );

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-chalk">
              Territory War Room
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-panel border border-hairline text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-contour' : 'bg-chalk-dim'}`} />
              <span className="text-chalk-muted font-display">{isConnected ? 'Live WebSocket feed' : 'Offline sandbox'}</span>
            </div>
          </div>
          <p className="text-xs text-chalk-muted mt-0.5">
            PostGIS spatial corridor engine with 40m GPS buffering and GiST indexing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tactical Route Planner Trigger */}
          <button
            onClick={() => setRoutePlannerOpen(true)}
            className="bg-panel hover:bg-panel-light text-chalk border border-hairline text-xs font-medium px-3.5 py-1.5 transition-colors flex items-center gap-1.5"
          >
            <Route className="w-3.5 h-3.5 text-cinder" />
            <span>Plan Route</span>
          </button>

          {onOpenLiveTracker && (
            <button
              onClick={onOpenLiveTracker}
              className="bg-cinder hover:bg-cinder-hover text-chalk text-xs font-medium px-3.5 py-1.5 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
              <span>Record GPS run</span>
            </button>
          )}

          <button
            onClick={onOpenSimulate}
            className="bg-panel hover:bg-panel-light text-chalk text-xs font-medium px-3 py-1.5 border border-hairline transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-current text-chalk-dim" />
            <span>Simulate route</span>
          </button>

          <button
            onClick={fetchTerritories}
            className="p-1.5 bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline transition-colors"
            title="Refresh map"
            aria-label="Refresh territory polygons"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid: Map & Sector Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Full-height Map */}
        <div className="lg:col-span-8">
          <ErrorBoundary isWidget={true} fallbackTitle="Territory Map Unavailable">
            <TerritoryMap
              territories={territories}
              height="580px"
              onZoneSelect={(zone) => setSelectedZone(zone)}
            />
          </ErrorBoundary>
        </div>

        {/* Tactical Telemetry & Sector Detail Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Sector Inspector Card */}
          <div className="bg-panel border border-hairline p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-sans font-medium text-chalk-dim uppercase">
                Sector Telemetry
              </span>
              {selectedZone && (
                <span
                  className="px-2 py-0.5 text-[10px] font-sans font-semibold border"
                  style={{
                    backgroundColor: selectedZone.is_user_owned ? 'rgba(184, 73, 46, 0.2)' : 'rgba(62, 142, 126, 0.2)',
                    color: selectedZone.is_user_owned ? '#EDEEE7' : '#3E8E7E',
                    borderColor: selectedZone.is_user_owned ? '#B8492E' : '#3E8E7E',
                  }}
                >
                  {selectedZone.is_user_owned ? 'Fortified by You' : 'Contested Rival Sector'}
                </span>
              )}
            </div>

            {selectedZone ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-chalk">
                    {selectedZone.zone_name}
                  </h3>
                  <div className="text-xs text-chalk-muted mt-0.5">
                    Controlled by <span className="font-semibold text-chalk">{selectedZone.owner_username}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 hairline-t">
                  <div className="p-2.5 bg-night border border-hairline">
                    <div className="text-[10px] text-chalk-dim">Claimed Area</div>
                    <div className="font-display text-base font-bold text-chalk tabular mt-0.5">
                      {Number(selectedZone.area_km2).toFixed(3)}
                      <span className="text-xs font-normal text-chalk-dim ml-1">km²</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-night border border-hairline">
                    <div className="text-[10px] text-chalk-dim">Defense Rating</div>
                    <div className="font-display text-base font-bold text-chalk tabular mt-0.5">
                      {selectedZone.defense_points}
                      <span className="text-xs font-normal text-chalk-dim ml-1">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-night border border-hairline text-xs text-chalk-muted space-y-1">
                  <div className="font-display font-semibold text-chalk text-[11px] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-contour" />
                    <span>Conquest Strategy</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {selectedZone.is_user_owned
                      ? 'Run through this sector within the next 4 days to fortify defense points and prevent sector decay.'
                      : 'Run a 40m buffered GPS corridor intersecting this sector to drop enemy defense points and flip the boundary.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 text-chalk-dim">
                <MapPin className="w-8 h-8 mx-auto stroke-1 opacity-50" />
                <p className="text-xs">Click any sector polygon on the map to inspect ownership and defense points.</p>
              </div>
            )}
          </div>

          {/* PostGIS Spatial Engine Explanation Card */}
          <div className="bg-panel border border-hairline p-4 space-y-2 text-xs text-chalk-muted font-sans">
            <div className="font-display font-semibold text-chalk flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cinder" />
              <span>PostGIS 40m Corridor Dynamics</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every GPS track is buffered into an 80m wide polygon (~0.08 km² per km). Running perimeter loops seals interior polygons into single high-defense zones.
            </p>
          </div>
        </div>
      </div>

      {/* Tactical Route Planner Modal */}
      <RoutePlannerModal
        isOpen={routePlannerOpen}
        onClose={() => setRoutePlannerOpen(false)}
        onStartRouteInTracker={() => {
          if (onOpenLiveTracker) onOpenLiveTracker();
        }}
      />
    </div>
  );
};
