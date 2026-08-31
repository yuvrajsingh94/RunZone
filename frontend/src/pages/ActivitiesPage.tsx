import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Activity } from '../types';
import { ActivityDetailModal } from '../components/activities/ActivityDetailModal';
import { Play, UploadCloud, Plus, ChevronRight, Zap, Award, Flame } from 'lucide-react';
import { format } from 'date-fns';

interface ActivitiesPageProps {
  onOpenSimulate: () => void;
  onOpenManual: () => void;
  onOpenGPX: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  simulation: 'Simulated',
  gps_simulation: 'GPS Sim',
  gpx_upload: 'GPX',
  strava: 'Strava',
  manual: 'Manual',
};

export const ActivitiesPage: React.FC<ActivitiesPageProps> = ({
  onOpenSimulate,
  onOpenManual,
  onOpenGPX,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivities()
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-chalk">
            Activity Log & Telemetry
          </h1>
          <p className="text-xs text-chalk-muted mt-0.5">
            Recorded runs, TRIMP workload scores, and 40m PostGIS territory corridors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSimulate}
            className="bg-cinder hover:bg-cinder-hover text-chalk text-xs font-medium px-3.5 py-1.5 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate run</span>
          </button>
          <button
            onClick={onOpenGPX}
            className="bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium px-3 py-1.5 transition-colors"
          >
            Upload GPX
          </button>
          <button
            onClick={onOpenManual}
            className="bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium px-3 py-1.5 transition-colors"
          >
            Log run
          </button>
        </div>
      </div>

      {/* Activities List (Hairline Divided) */}
      <div className="bg-panel border border-hairline">
        <div className="divide-y divide-hairline">
          {activities.map((act) => {
            const distKm = act.distance_meters / 1000;
            const durMin = Math.floor(act.duration_seconds / 60);
            const paceStr = distKm > 0
              ? `${(durMin / distKm).toFixed(1)} min/km`
              : '—';
            const sourceLabel = SOURCE_LABELS[act.source] || act.source;

            return (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-panel-light cursor-pointer transition-colors group"
              >
                {/* Left: Metadata */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-night border border-hairline text-chalk-muted font-display uppercase tracking-wider">
                      {sourceLabel}
                    </span>
                    <h3 className="font-display font-semibold text-sm text-chalk group-hover:text-cinder transition-colors flex items-center gap-1.5">
                      <span>{act.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                  </div>
                  <div className="text-xs text-chalk-dim font-sans">
                    <span>
                      {act.started_at ? format(new Date(act.started_at), 'MMM d, yyyy · h:mm a') : 'Recent session'}
                    </span>
                    <span className="mx-2">·</span>
                    <span className="tabular">{durMin} min</span>
                    <span className="mx-2">·</span>
                    <span className="tabular">{paceStr}</span>
                  </div>
                </div>

                {/* Right: Telemetry Figures */}
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="font-display text-lg font-bold text-chalk tabular">
                      {distKm.toFixed(2)}
                      <span className="text-xs font-normal text-chalk-dim ml-1">km</span>
                    </div>
                    <div className="text-[10px] text-chalk-muted font-display">
                      Distance
                    </div>
                  </div>

                  <div className="hairline-l pl-4 hidden sm:block">
                    <div className="font-display text-lg font-bold text-cinder tabular">
                      +{((act.territory_captured_km2 || distKm * 0.08)).toFixed(3)}
                      <span className="text-xs font-normal text-chalk-dim ml-1">km²</span>
                    </div>
                    <div className="text-[10px] text-chalk-muted font-display">
                      Territory
                    </div>
                  </div>

                  <div className="hairline-l pl-4 hidden sm:block">
                    <div className="font-display text-lg font-bold text-chalk tabular">
                      {act.workload_score ? Math.round(act.workload_score) : Math.round(distKm * 7.4)}
                    </div>
                    <div className="text-[10px] text-chalk-muted font-display">
                      TRIMP Load
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Deep-Dive Inspector Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
};
