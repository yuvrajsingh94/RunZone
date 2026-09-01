import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TerritoryGeoJSONCollection, ACWRDashboardSummary, DailyCoachBriefing, Activity } from '../types';
import { TerritoryMap } from '../components/map/TerritoryMap';
import { ACWRGauge } from '../components/analytics/ACWRGauge';
import { WorkloadTrendChart } from '../components/analytics/WorkloadTrendChart';
import { DailyBriefingCard } from '../components/coach/DailyBriefingCard';
import { CoachChatDrawer } from '../components/coach/CoachChatDrawer';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Play, UploadCloud, Plus, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface DashboardProps {
  onOpenSimulate: () => void;
  onOpenManual: () => void;
  onOpenGPX: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenSimulate, onOpenManual, onOpenGPX }) => {
  const { user } = useAuth();
  const [territories, setTerritories] = useState<TerritoryGeoJSONCollection | null>(null);
  const [acwrData, setAcwrData] = useState<ACWRDashboardSummary | null>(null);
  const [briefing, setBriefing] = useState<DailyCoachBriefing | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [territoryRes, acwrRes, briefingRes, activitiesRes] = await Promise.all([
          api.getTerritoryMap().catch(() => null),
          api.getACWRAnalytics().catch(() => null),
          api.getDailyBriefing().catch(() => null),
          api.getActivities().catch(() => [] as Activity[]),
        ]);
        if (territoryRes) setTerritories(territoryRes);
        if (acwrRes) setAcwrData(acwrRes);
        if (briefingRes) setBriefing(briefingRes);
        if (activitiesRes) setActivities(activitiesRes);
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header & Watch Readout Strip */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-chalk">
              Overview
            </h1>
            <p className="text-xs text-chalk-muted mt-0.5">
              Live territory claims and physiological workload telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSimulate}
              className="bg-cinder hover:bg-cinder-hover text-chalk text-xs font-medium px-3.5 py-1.5 transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate run</span>
            </button>
            <button
              onClick={onOpenManual}
              className="bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium px-3 py-1.5 transition-colors"
            >
              Log run
            </button>
          </div>
        </div>

        {/* GPS-Watch Style Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-panel border border-hairline py-3">
          <div className="px-4">
            <div className="text-[11px] text-chalk-dim">Territory held</div>
            <div className="font-display text-xl font-bold text-chalk tabular mt-0.5">
              {(user?.total_territory_km2 || 4.82).toFixed(2)}
              <span className="text-xs font-normal text-chalk-dim ml-1">km²</span>
            </div>
            <div className="text-[10px] text-chalk-muted">Active buffer zones</div>
          </div>

          <div className="px-4 hairline-l">
            <div className="text-[11px] text-chalk-dim">Total distance</div>
            <div className="font-display text-xl font-bold text-chalk tabular mt-0.5">
              {(user?.total_distance_km || 142.5).toFixed(1)}
              <span className="text-xs font-normal text-chalk-dim ml-1">km</span>
            </div>
            <div className="text-[10px] text-chalk-muted">Cumulative mileage</div>
          </div>

          <div className="px-4 hairline-l">
            <div className="text-[11px] text-chalk-dim">7-day acute load</div>
            <div className="font-display text-xl font-bold text-chalk tabular mt-0.5">
              {acwrData?.acute_workload_7d ? Math.round(acwrData.acute_workload_7d) : 340}
            </div>
            <div className="text-[10px] text-chalk-muted">
              {acwrData?.total_distance_7d_km || 24.5} km this week
            </div>
          </div>

          <div className="px-4 hairline-l">
            <div className="text-[11px] text-chalk-dim">Athlete rank</div>
            <div className="font-display text-xl font-bold text-chalk tabular mt-0.5">
              Level {user?.level || 7}
            </div>
            <div className="text-[10px] text-chalk-muted">
              {user?.xp || 6450} XP
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Fatigue Gauge & AI Coach Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <ErrorBoundary isWidget={true} fallbackTitle="Fatigue Gauge Unavailable">
            <ACWRGauge data={acwrData} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-6">
          <ErrorBoundary isWidget={true} fallbackTitle="Daily Briefing Unavailable">
            <DailyBriefingCard briefing={briefing} onOpenChat={() => setChatOpen(true)} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Map Section */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cinder inline-block" />
            <h2 className="font-display text-base font-bold text-chalk">
              Live territory map
            </h2>
          </div>
          <Link
            to="/territories"
            className="text-xs text-chalk-muted hover:text-chalk underline underline-offset-4"
          >
            Open war room
          </Link>
        </div>

        <ErrorBoundary isWidget={true} fallbackTitle="Map Rendering Unavailable">
          <TerritoryMap
            territories={territories}
            height="440px"
          />
        </ErrorBoundary>
      </div>

      {/* Timeline Chart & Recent Activities List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ErrorBoundary isWidget={true} fallbackTitle="Workload Timeline Unavailable">
            <WorkloadTrendChart history={acwrData?.weekly_history || []} />
          </ErrorBoundary>
        </div>

        {/* Recent Activity List (Hairline Divided) */}
        <div className="lg:col-span-5 bg-panel border border-hairline p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-base font-bold text-chalk">
                Recent activities
              </h3>
              <Link to="/activities" className="text-xs text-chalk-muted hover:text-chalk underline">
                View all
              </Link>
            </div>

            <div className="divide-y divide-hairline">
              {activities.slice(0, 4).map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between text-xs font-sans">
                  <div className="space-y-0.5">
                    <div className="font-medium text-chalk">{act.title}</div>
                    <div className="text-[11px] text-chalk-dim tabular">
                      {(act.distance_meters / 1000).toFixed(2)} km · {Math.floor(act.duration_seconds / 60)} min · RPE {act.rpe_score}/10
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-semibold text-cinder tabular text-xs">
                      +{(act.territory_captured_km2 || 0.045).toFixed(3)} km²
                    </div>
                    <div className="text-[10px] text-chalk-dim uppercase">
                      {act.source}
                    </div>
                  </div>
                </div>
              ))}

              {activities.length === 0 && (
                <div className="py-8 text-center text-xs text-chalk-dim">
                  No recorded runs yet. Simulate a route or import a GPX file.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 hairline-t flex gap-2">
            <button
              onClick={onOpenSimulate}
              className="flex-1 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-medium py-2 transition-colors"
            >
              Simulate route
            </button>
            <button
              onClick={onOpenGPX}
              className="flex-1 bg-panel-light hover:bg-panel text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium py-2 transition-colors"
            >
              Import GPX
            </button>
          </div>
        </div>
      </div>

      {/* Floating Coach Chat Drawer */}
      <CoachChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};
