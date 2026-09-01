import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TerritoryGeoJSONCollection, ACWRDashboardSummary } from '../types';
import { TerritoryMap } from '../components/map/TerritoryMap';
import { ACWRGauge } from '../components/analytics/ACWRGauge';
import { Play, Shield, MapPin, Activity, ArrowRight, Zap, Check } from 'lucide-react';
import { PrivacyModal } from '../components/common/PrivacyModal';
import toast from 'react-hot-toast';

export const LandingPage: React.FC = () => {
  const [territories, setTerritories] = useState<TerritoryGeoJSONCollection | null>(null);
  const [acwrData, setAcwrData] = useState<ACWRDashboardSummary | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const { loginDemoUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getTerritoryMap().then(setTerritories).catch(() => null);
    api.getACWRAnalytics().then(setAcwrData).catch(() => null);
  }, []);

  const handleLaunchDemo = (role: 'runner' | 'admin' = 'runner') => {
    loginDemoUser(role);
    toast.success('Signed in as demo athlete');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-night text-chalk font-sans">
      {/* Top Marketing Navigation */}
      <header className="h-16 hairline-b px-4 lg:px-8 flex items-center justify-between bg-night/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 bg-cinder inline-block" />
          <span className="font-display font-bold text-xl tracking-tight text-chalk">
            RunZone
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleLaunchDemo('runner')}
            className="text-xs text-chalk-muted hover:text-chalk px-3 py-1.5 border border-hairline hover:bg-panel transition-colors"
          >
            Launch demo
          </button>
          <Link
            to="/login"
            className="bg-cinder hover:bg-cinder-hover text-chalk text-xs font-medium px-3.5 py-1.5 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero Section — Asymmetric, Left-aligned */}
      <section className="px-4 lg:px-8 pt-12 lg:pt-16 pb-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Thesis & Mechanism */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-panel border border-hairline text-xs text-chalk-muted">
              <span className="w-1.5 h-1.5 bg-cinder inline-block" />
              <span>Geospatial running platform & physiological load control</span>
            </div>

            <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-chalk leading-[1.08]">
              Turn your runs into claimed territory. Without destroying your body.
            </h1>

            <p className="text-sm lg:text-base text-chalk-muted leading-relaxed max-w-xl">
              RunZone buffers your real GPS path into a 40-meter territory corridor on the city map. Steal zones from rival runners, while a deterministic fatigue gauge keeps your acute training load from crossing into the injury danger zone.
            </p>

            {/* Readout Strip */}
            <div className="grid grid-cols-3 bg-panel border border-hairline py-3 text-center max-w-lg">
              <div className="px-3">
                <div className="text-[11px] text-chalk-dim">Spatial buffer</div>
                <div className="font-display text-lg font-bold text-chalk tabular mt-0.5">40m</div>
                <div className="text-[10px] text-chalk-muted">Corridor width</div>
              </div>
              <div className="px-3 hairline-l">
                <div className="text-[11px] text-chalk-dim">Fatigue model</div>
                <div className="font-display text-lg font-bold text-chalk tabular mt-0.5">ACWR</div>
                <div className="text-[10px] text-chalk-muted">7d:28d ratio</div>
              </div>
              <div className="px-3 hairline-l">
                <div className="text-[11px] text-chalk-dim">Query latency</div>
                <div className="font-display text-lg font-bold text-chalk tabular mt-0.5">&lt;100ms</div>
                <div className="text-[10px] text-chalk-muted">GiST indexing</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => handleLaunchDemo('runner')}
                className="bg-cinder hover:bg-cinder-hover active:bg-cinder-active text-chalk font-medium text-xs px-5 py-2.5 transition-colors flex items-center gap-2"
              >
                <span>Enter live command center</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
              <Link
                to="/register"
                className="bg-panel hover:bg-panel-light text-chalk border border-hairline text-xs font-medium px-4 py-2.5 transition-colors"
              >
                Create athlete account
              </Link>
            </div>
          </div>

          {/* Right Column: Live Territory Map Preview */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-chalk-dim px-1">
              <span>PostGIS corridor preview</span>
              <span className="tabular font-display">San Francisco sector</span>
            </div>
            <TerritoryMap
              territories={territories}
              height="380px"
            />
          </div>
        </div>
      </section>

      {/* Core Mechanism 3-Pillar Strip (Hairline Divided) */}
      <section className="hairline-t hairline-b bg-panel py-12 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cinder font-display font-semibold text-sm">
              <span className="w-2 h-2 bg-cinder inline-block" />
              <span>01 · Territory conquest</span>
            </div>
            <h2 className="font-display text-lg font-bold text-chalk">
              Every GPS run claims a 40m corridor
            </h2>
            <p className="text-xs text-chalk-muted leading-relaxed font-sans">
              PostGIS converts GPS line coordinates into high-precision polygon corridors. Run through rival sectors to steal map ownership and climb the faction leaderboard.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="space-y-3 md:hairline-l md:pl-8">
            <div className="flex items-center gap-2 text-chalk font-display font-semibold text-sm">
              <span className="w-2 h-2 bg-gauge-safe inline-block" />
              <span>02 · Fatigue control</span>
            </div>
            <h2 className="font-display text-lg font-bold text-chalk">
              Acute:chronic workload ratio
            </h2>
            <p className="text-xs text-chalk-muted leading-relaxed font-sans">
              Running injuries happen from sudden training volume spikes. The fatigue gauge measures 7-day fatigue against 28-day fitness to keep you in the 0.8–1.3 sweet spot.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="space-y-3 md:hairline-l md:pl-8">
            <div className="flex items-center gap-2 text-contour font-display font-semibold text-sm">
              <span className="w-2 h-2 bg-contour inline-block" />
              <span>03 · AI physiological coach</span>
            </div>
            <h2 className="font-display text-lg font-bold text-chalk">
              Contextual morning briefings
            </h2>
            <p className="text-xs text-chalk-muted leading-relaxed font-sans">
              ZoneCoach reviews your ACWR score and recent workout impulses every morning, delivering exact pacing advice ("easy 3km today") before you head out.
            </p>
          </div>
        </div>
      </section>

      {/* Live Fatigue Gauge Demo Section */}
      <section className="py-14 px-4 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-sans text-chalk-dim">
              Physiological workload engine
            </div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-chalk tracking-tight">
              Push for territory with proof, not guesswork.
            </h2>
            <p className="text-xs lg:text-sm text-chalk-muted leading-relaxed">
              When you know your exact soft-tissue strain risk, increasing mileage feels earned rather than reckless. The gauge clearly delineates under-training, optimal adaptation, high alert, and injury danger bands.
            </p>

            <div className="space-y-2 pt-2 text-xs font-sans text-chalk-muted">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gauge-safe inline-block" />
                <span className="text-chalk font-medium">0.80–1.30 Safe zone:</span>
                <span>Minimum injury risk with maximum aerobic fitness gains</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gauge-alert inline-block" />
                <span className="text-chalk font-medium">1.30–1.50 High alert:</span>
                <span>Fatigue accumulating faster than tissue recovery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gauge-danger inline-block" />
                <span className="text-chalk font-medium">&gt;1.50 Danger zone:</span>
                <span>Exponential 2x–4x spike in muscle strain and tendonitis risk</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <ACWRGauge data={acwrData} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hairline-t bg-night py-8 px-4 lg:px-8 text-xs text-chalk-dim">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cinder inline-block" />
            <span className="font-display font-semibold text-chalk">RunZone</span>
            <span className="text-chalk-dim">· PostGIS & ACWR Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPrivacyOpen(true)}
              className="text-chalk-dim hover:text-chalk underline underline-offset-4 transition-colors"
            >
              Privacy & Telemetry Disclosure
            </button>
            <span>Built with FastAPI, PostgreSQL/PostGIS, React & Groq AI</span>
          </div>
        </div>
      </footer>

      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
};
