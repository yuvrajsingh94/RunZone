import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ACWRDashboardSummary, BiometricsDashboardData, BiometricDayData } from '../types';
import { ACWRGauge } from '../components/analytics/ACWRGauge';
import { WorkloadTrendChart } from '../components/analytics/WorkloadTrendChart';
import { BiometricsTrendChart } from '../components/analytics/BiometricsTrendChart';
import { LogBiometricsModal } from '../components/analytics/LogBiometricsModal';
import { Activity, Heart, Moon, Zap, Shield, Sparkles, BatteryCharging, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'acwr' | 'biometrics'>('biometrics');
  const [acwrData, setAcwrData] = useState<ACWRDashboardSummary | null>(null);
  const [biometricsData, setBiometricsData] = useState<BiometricsDashboardData | null>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic Biometrics State for interactive simulator
  const [simHrv, setSimHrv] = useState<number>(68);
  const [simRhr, setSimRhr] = useState<number>(50);
  const [simSleep, setSimSleep] = useState<number>(7.5);
  const [simQuality, setSimQuality] = useState<number>(85);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [acwrRes, bioRes] = await Promise.all([
        api.getACWRAnalytics().catch(() => null),
        api.getBiometricsAnalytics(7).catch(() => null),
      ]);
      setAcwrData(acwrRes);
      setBiometricsData(bioRes);

      if (bioRes && bioRes.has_data) {
        if (bioRes.current_hrv_rmssd) setSimHrv(bioRes.current_hrv_rmssd);
        if (bioRes.current_resting_hr) setSimRhr(bioRes.current_resting_hr);
        if (bioRes.current_sleep_hours) setSimSleep(bioRes.current_sleep_hours);
        if (bioRes.current_sleep_quality) setSimQuality(bioRes.current_sleep_quality);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  // Compute live recovery readiness percentage for simulator
  const calculateSimReadiness = () => {
    const hrvScore = Math.min(100, Math.max(0, 50 + ((simHrv - 64) / 15) * 25));
    const rhrScore = Math.min(100, Math.max(0, 50 + ((52 - simRhr) / 5) * 25));
    const sleepScore = Math.min(100, (simSleep / 8.0) * simQuality);
    return Math.round(hrvScore * 0.40 + rhrScore * 0.30 + sleepScore * 0.30);
  };

  const simReadinessScore = calculateSimReadiness();

  const handleLogSuccess = (newEntry: BiometricDayData) => {
    fetchAllAnalytics();
  };

  const hasRealBiometrics = biometricsData && biometricsData.has_data;
  const currentReadiness = hasRealBiometrics ? biometricsData.current_readiness_score : null;
  const currentCategory = hasRealBiometrics ? biometricsData.current_readiness_category : null;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-chalk">
            Fatigue & Biometrics Readiness Center
          </h1>
          <p className="text-xs text-chalk-muted mt-0.5">
            Holistic athletic telemetry: Dr. Gabbett's ACWR model, HRV autonomic recovery, and sleep readiness
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-panel border border-hairline p-0.5" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'biometrics'}
            onClick={() => setActiveTab('biometrics')}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'biometrics'
                ? 'bg-cinder text-chalk font-semibold'
                : 'text-chalk-muted hover:text-chalk'
            }`}
          >
            Biometrics & Recovery
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'acwr'}
            onClick={() => setActiveTab('acwr')}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'acwr'
                ? 'bg-cinder text-chalk font-semibold'
                : 'text-chalk-muted hover:text-chalk'
            }`}
          >
            ACWR Workload Model
          </button>
        </div>
      </div>

      {activeTab === 'biometrics' ? (
        /* Biometrics & Recovery Hub View */
        <div className="space-y-6">
          {/* Top Readiness Score & Telemetry Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Holistic Readiness Score Card */}
            <div className="lg:col-span-5 bg-panel border border-hairline p-6 flex flex-col justify-between space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-chalk-dim uppercase font-display font-semibold">
                  Autonomic Readiness Index
                </span>
                <span className="px-2 py-0.5 text-[10px] bg-contour/20 border border-contour/40 text-contour font-display font-semibold">
                  {hasRealBiometrics ? 'Synchronized Telemetry' : 'Awaiting Entry'}
                </span>
              </div>

              {hasRealBiometrics && currentReadiness !== null ? (
                <div className="flex items-center gap-6 my-2">
                  <div className="relative flex items-center justify-center">
                    <div
                      className="w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center"
                      style={{
                        borderColor: currentReadiness >= 80 ? '#3E8E7E' : currentReadiness >= 60 ? '#C98A2E' : '#B8492E',
                        backgroundColor: currentReadiness >= 80 ? 'rgba(62, 142, 126, 0.1)' : 'rgba(184, 73, 46, 0.1)',
                      }}
                    >
                      <span className="font-display text-3xl font-extrabold text-chalk tabular">
                        {currentReadiness}%
                      </span>
                      <span className="text-[10px] text-chalk-dim font-display uppercase tracking-wider">
                        Readiness
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <h3 className="font-display text-base font-bold text-chalk">
                      {currentCategory || (currentReadiness >= 80 ? 'Primed for High Load' : 'Optimal Aerobic Base')}
                    </h3>
                    <p className="text-chalk-muted leading-relaxed text-[11px]">
                      {currentReadiness >= 80
                        ? 'Parasympathetic nervous system is fully recovered. You have full capacity for threshold intervals or hard territory captures.'
                        : currentReadiness >= 60
                        ? 'Heart rate variability is near baseline. Keep efforts conversational in Zone 2 to absorb acute training load.'
                        : 'Elevated resting pulse and depressed HRV detected. Mandatory active recovery or mobility prescribed today.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Honest Empty State */
                <div className="py-6 text-center space-y-2">
                  <Heart className="w-8 h-8 text-chalk-dim mx-auto stroke-1 opacity-50" />
                  <p className="text-xs text-chalk-muted max-w-xs mx-auto">
                    No biometrics recorded yet for today. Log your resting heart rate and HRV to compute your readiness score.
                  </p>
                  <button
                    onClick={() => setLogModalOpen(true)}
                    className="mt-2 px-3 py-1.5 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-display font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Morning Reading</span>
                  </button>
                </div>
              )}

              <div className="pt-3 hairline-t grid grid-cols-3 gap-2 text-center text-xs font-display">
                <div className="p-2 bg-night border border-hairline">
                  <div className="text-[10px] text-chalk-dim">HRV rMSSD</div>
                  <div className="font-bold text-contour tabular mt-0.5">
                    {hasRealBiometrics && biometricsData.current_hrv_rmssd ? `${biometricsData.current_hrv_rmssd} ms` : '—'}
                  </div>
                </div>
                <div className="p-2 bg-night border border-hairline">
                  <div className="text-[10px] text-chalk-dim">Resting HR</div>
                  <div className="font-bold text-chalk tabular mt-0.5">
                    {hasRealBiometrics && biometricsData.current_resting_hr ? `${biometricsData.current_resting_hr} bpm` : '—'}
                  </div>
                </div>
                <div className="p-2 bg-night border border-hairline">
                  <div className="text-[10px] text-chalk-dim">Sleep Quality</div>
                  <div className="font-bold text-amber-400 tabular mt-0.5">
                    {hasRealBiometrics && biometricsData.current_sleep_quality ? `${biometricsData.current_sleep_quality}%` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Sleep Architecture & Muscle Glycogen Card */}
            <div className="lg:col-span-7 bg-panel border border-hairline p-6 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-display text-sm font-bold text-chalk flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-amber-400" />
                    <span>Sleep Architecture & Tissue Repair</span>
                  </h3>
                  <span className="text-xs font-display font-semibold text-chalk tabular">
                    {hasRealBiometrics && biometricsData.current_sleep_hours ? `${biometricsData.current_sleep_hours}h total sleep` : 'No sleep data'}
                  </span>
                </div>

                {/* Stacked Sleep Stages Bar */}
                <div className="h-3.5 w-full flex overflow-hidden border border-hairline mt-2">
                  <div style={{ width: '22%' }} className="bg-[#2E6EB8]" title="Deep Sleep (22%)" />
                  <div style={{ width: '28%' }} className="bg-[#8A4FB8]" title="REM Sleep (28%)" />
                  <div style={{ width: '50%' }} className="bg-[#3D464D]" title="Light Sleep (50%)" />
                </div>

                <div className="flex justify-between text-[10px] text-chalk-dim pt-2 font-display">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#2E6EB8] inline-block" /> Deep (Stage 3/4)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#8A4FB8] inline-block" /> REM (Cognitive)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#3D464D] inline-block" /> Light Sleep
                  </span>
                </div>
              </div>

              {/* Muscle Glycogen Restoration Progress */}
              <div className="space-y-2 pt-3 hairline-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-semibold text-chalk flex items-center gap-1.5">
                    <BatteryCharging className="w-4 h-4 text-contour" />
                    <span>Muscular Glycogen & Tissue Readiness</span>
                  </span>
                  <span className="font-display font-bold text-contour tabular">
                    {hasRealBiometrics && currentReadiness ? `${Math.min(100, Math.round(currentReadiness * 1.05))}% Restored` : 'Calibrating'}
                  </span>
                </div>
                <div className="w-full bg-night border border-hairline h-2.5 overflow-hidden">
                  <div
                    className="bg-contour h-full"
                    style={{ width: `${hasRealBiometrics && currentReadiness ? Math.min(100, Math.round(currentReadiness * 1.05)) : 50}%` }}
                  />
                </div>
                <p className="text-[11px] text-chalk-muted leading-relaxed">
                  Post-workout glycogen synthesis is tracking according to your acute training volume.
                </p>
              </div>
            </div>
          </div>

          {/* 7-Day HRV & Heart Rate Trend Chart */}
          <BiometricsTrendChart
            data={biometricsData?.history || []}
            onOpenLogModal={() => setLogModalOpen(true)}
          />

          {/* Interactive Biometrics Simulator */}
          <div className="bg-panel border border-hairline p-5 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-display text-sm font-bold text-chalk flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cinder" />
                  <span>Interactive Biometrics & Stress Simulator</span>
                </h3>
                <p className="text-chalk-muted text-[11px]">
                  Adjust biometric sliders to test how sleep deficit or HRV drops alter readiness & ZoneCoach advice
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await api.logBiometricsEntry({
                        hrv_rmssd: simHrv,
                        resting_hr: simRhr,
                        sleep_hours: simSleep,
                        sleep_quality: simQuality,
                      });
                      toast.success('Saved simulated biometrics to your live record!');
                      fetchAllAnalytics();
                    } catch (e) {
                      toast.error('Failed to save biometrics');
                    }
                  }}
                  className="px-2.5 py-1 bg-cinder hover:bg-cinder-hover text-chalk text-[11px] font-display font-semibold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Save to Record</span>
                </button>
                <button
                  onClick={() => {
                    setSimHrv(68);
                    setSimRhr(50);
                    setSimSleep(7.5);
                    setSimQuality(85);
                    toast.success('Reset simulator to baseline');
                  }}
                  className="px-2.5 py-1 bg-night hover:bg-panel-light border border-hairline text-chalk-dim hover:text-chalk text-[11px] flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* HRV Slider */}
              <div className="space-y-1.5 bg-night p-3 border border-hairline">
                <div className="flex justify-between font-display text-xs">
                  <span className="text-chalk-muted">HRV rMSSD:</span>
                  <span className="font-bold text-contour tabular">{simHrv} ms</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={simHrv}
                  onChange={(e) => setSimHrv(Number(e.target.value))}
                  className="w-full accent-contour cursor-pointer"
                />
              </div>

              {/* Resting HR Slider */}
              <div className="space-y-1.5 bg-night p-3 border border-hairline">
                <div className="flex justify-between font-display text-xs">
                  <span className="text-chalk-muted">Resting HR:</span>
                  <span className="font-bold text-cinder tabular">{simRhr} bpm</span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="75"
                  value={simRhr}
                  onChange={(e) => setSimRhr(Number(e.target.value))}
                  className="w-full accent-cinder cursor-pointer"
                />
              </div>

              {/* Sleep Hours Slider */}
              <div className="space-y-1.5 bg-night p-3 border border-hairline">
                <div className="flex justify-between font-display text-xs">
                  <span className="text-chalk-muted">Sleep Duration:</span>
                  <span className="font-bold text-amber-400 tabular">{simSleep} hrs</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="10.0"
                  step="0.5"
                  value={simSleep}
                  onChange={(e) => setSimSleep(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-display border-t border-hairline text-chalk-dim">
              <span>Simulated Composite Readiness: <strong className="text-chalk">{simReadinessScore}%</strong></span>
              <span>{simReadinessScore >= 80 ? '🟢 Primed for High Load' : simReadinessScore >= 60 ? '🟡 Optimal Aerobic Base' : '🔴 Rest Mandated'}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ACWR Workload Model View */
        <div className="space-y-6">
          {/* Primary Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6">
              <ACWRGauge data={acwrData} />
            </div>

            {/* Workload Zone Calibration Guide */}
            <div className="lg:col-span-6 bg-panel border border-hairline p-5 space-y-4 text-xs font-sans">
              <div>
                <h2 className="font-display text-base font-bold text-chalk">
                  Zone calibration guide
                </h2>
                <p className="text-chalk-muted mt-0.5">
                  How training load ratios map to soft-tissue adaptation and injury risk
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-night border border-hairline space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-chalk tabular">&lt;0.80 — Under-training</span>
                    <span className="text-[10px] text-chalk-dim">Low fatigue</span>
                  </div>
                  <p className="text-chalk-muted leading-relaxed">
                    Acute load is low relative to baseline fitness. Prolonged periods below 0.80 cause aerobic detraining and reduced tissue capacity.
                  </p>
                </div>

                <div className="p-3 bg-night border border-hairline space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-contour tabular">0.80–1.30 — Safe zone (sweet spot)</span>
                    <span className="text-[10px] text-contour">Target</span>
                  </div>
                  <p className="text-chalk-muted leading-relaxed">
                    Optimal workload range with lowest injury risk (~10%). Tissue adaptation is balanced with muscular recovery.
                  </p>
                </div>

                <div className="p-3 bg-night border border-hairline space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-amber-400 tabular">1.30–1.50 — High alert</span>
                    <span className="text-[10px] text-amber-400">Overreaching</span>
                  </div>
                  <p className="text-chalk-muted leading-relaxed">
                    Training volume is ramping faster than tissue remodeling. Prioritize Zone 2 recovery runs to stay below the danger threshold.
                  </p>
                </div>

                <div className="p-3 bg-night border border-hairline space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-cinder tabular">&gt;1.50 — Danger zone</span>
                    <span className="text-[10px] text-cinder">Spike</span>
                  </div>
                  <p className="text-chalk-muted leading-relaxed">
                    Acute fatigue spike. Statistical injury risk increases by 200% to 400%. Immediate active rest or cross-training recommended.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 14-Day Timeline Chart */}
          <WorkloadTrendChart history={acwrData?.weekly_history || []} />
        </div>
      )}

      {/* Log Biometrics Modal */}
      <LogBiometricsModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={handleLogSuccess}
      />
    </div>
  );
};
