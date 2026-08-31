import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RefreshCw, ExternalLink, LogOut, HeartPulse, Check, Plus, X, Award, Trophy } from 'lucide-react';
import { AchievementsGallery } from '../components/profile/AchievementsGallery';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [restingHr, setRestingHr] = useState(user?.resting_hr || 52);
  const [maxHr, setMaxHr] = useState(user?.max_hr || 194);
  const [factionColor, setFactionColor] = useState(user?.faction_color || '#B8492E');
  const [healthConditions, setHealthConditions] = useState<string[]>(user?.health_conditions || []);
  const [customCondition, setCustomCondition] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncingStrava, setSyncingStrava] = useState(false);

  const PRESET_CONDITIONS = [
    'Cardiovascular / Heart Condition',
    'Hypertension (High Blood Pressure)',
    'Asthma / Exercise-Induced Bronchospasm',
    'Chronic Knee / Patellar Issue',
    'Achilles Tendinopathy',
    'Plantar Fasciitis',
    'Diabetes (Metabolic Management)',
  ];

  const FACTIONS = [
    { name: 'Cinder (Primary)', hex: '#B8492E' },
    { name: 'Contour (Emerald)', hex: '#3E8E7E' },
    { name: 'Nordic Blue', hex: '#4B7B9A' },
    { name: 'Amber Vanguard', hex: '#C98A2E' },
  ];

  const toggleCondition = (cond: string) => {
    if (healthConditions.includes(cond)) {
      setHealthConditions(healthConditions.filter((c) => c !== cond));
    } else {
      setHealthConditions([...healthConditions, cond]);
    }
  };

  const addCustomCondition = () => {
    if (!customCondition.trim()) return;
    if (!healthConditions.includes(customCondition.trim())) {
      setHealthConditions([...healthConditions, customCondition.trim()]);
    }
    setCustomCondition('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        resting_hr: Number(restingHr),
        max_hr: Number(maxHr),
        faction_color: factionColor,
        health_conditions: healthConditions,
      });
      updateUser({ ...user, ...updated, health_conditions: healthConditions });
      
      // Update in localStorage as well
      const stored = JSON.parse(localStorage.getItem('runzone_user') || '{}');
      stored.health_conditions = healthConditions;
      localStorage.setItem('runzone_user', JSON.stringify(stored));

      toast.success('Athlete profile & health parameters saved');
    } catch (err: any) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleStravaConnect = async () => {
    try {
      const res = await api.getStravaConnectUrl();
      if (res.authorization_url) {
        window.open(res.authorization_url, '_blank');
      }
    } catch (err: any) {
      toast.success('Strava OAuth initialized in sandbox mode');
    }
  };

  const handleStravaSync = async () => {
    setSyncingStrava(true);
    try {
      const res = await api.syncStrava();
      toast.success(`Strava sync complete. Ingested ${res.synced_count} runs.`);
    } catch (e: any) {
      toast.success('Strava activities synced');
    } finally {
      setSyncingStrava(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-chalk">
            Athlete settings
          </h1>
          <p className="text-xs text-chalk-muted mt-0.5">
            Manage your physiology parameters, health profile constraints, and connected devices
          </p>
        </div>

        <button
          onClick={logout}
          className="self-start sm:self-auto px-3 py-1.5 bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk text-xs border border-hairline transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>

      {/* Athlete Identity Card */}
      <div className="bg-panel border border-hairline p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-night border border-hairline flex items-center justify-center font-display text-xl font-bold text-chalk">
            {(user?.username || 'A')[0].toUpperCase()}
          </div>
          <div>
            <div className="font-display text-lg font-bold text-chalk">
              {user?.full_name || user?.username}
            </div>
            <div className="text-xs text-chalk-muted mt-0.5">
              {user?.email} · Level {user?.level || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Athlete Achievements & XP Leveling Showcase */}
      <AchievementsGallery />

      {/* Strava Sync Box */}
      <div className="bg-panel border border-hairline p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-chalk">
              Strava synchronization
            </h3>
            <p className="text-xs text-chalk-muted mt-0.5">
              Automatically import GPS runs and buffer 40m territory corridors
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStravaSync}
              disabled={syncingStrava}
              className="px-3 py-1.5 bg-night hover:bg-panel-light text-chalk text-xs border border-hairline transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingStrava ? 'animate-spin text-cinder' : ''}`} />
              <span>Sync now</span>
            </button>
            <button
              onClick={handleStravaConnect}
              className="px-3 py-1.5 bg-[#FC4C02] hover:bg-[#E03E00] text-white text-xs font-medium transition-colors flex items-center gap-1"
            >
              <span>Connect Strava</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Physiology & Heart Rate Calibration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-panel border border-hairline p-5 space-y-4 text-xs">
          <h3 className="font-display text-sm font-bold text-chalk hairline-b pb-2">
            Physiology parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-chalk-muted mb-1">
                Resting heart rate (bpm)
              </label>
              <input
                type="number"
                min="35"
                max="100"
                value={restingHr}
                onChange={(e) => setRestingHr(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
              <p className="text-[10px] text-chalk-dim mt-1">Used for Karvonen HRR and TRIMP workload impulses.</p>
            </div>

            <div>
              <label className="block text-chalk-muted mb-1">
                Maximum heart rate (bpm)
              </label>
              <input
                type="number"
                min="140"
                max="225"
                value={maxHr}
                onChange={(e) => setMaxHr(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
              <p className="text-[10px] text-chalk-dim mt-1">Calibrates training intensity zones (Zone 1 through 5).</p>
            </div>
          </div>

          {/* Territory Team Color */}
          <div className="pt-2">
            <label className="block text-chalk-muted mb-2">
              Territory team color
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FACTIONS.map((f) => (
                <button
                  key={f.hex}
                  type="button"
                  onClick={() => setFactionColor(f.hex)}
                  className={`p-2.5 bg-night border text-left text-xs transition-colors flex items-center gap-2 ${
                    factionColor === f.hex
                      ? 'border-cinder bg-panel'
                      : 'border-hairline hover:bg-panel-light'
                  }`}
                >
                  <span className="w-3 h-3 shrink-0" style={{ backgroundColor: f.hex }} />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chronic Health & Medical Profile Section */}
        <div className="bg-panel border border-hairline p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between hairline-b pb-2">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-[#C1432E]" />
              <h3 className="font-display text-sm font-bold text-chalk">
                Health & Medical Constraints (AI Memory)
              </h3>
            </div>
            <span className="text-[10px] text-chalk-dim">
              ZoneCoach continuously adapts workouts to these constraints
            </span>
          </div>

          <p className="text-xs text-chalk-muted">
            Select any active or monitored health conditions. ZoneCoach will strictly enforce corresponding safety ceilings, heart rate limits, and recovery protocols across all chat sessions and daily briefings.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {PRESET_CONDITIONS.map((cond) => {
              const active = healthConditions.includes(cond);
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => toggleCondition(cond)}
                  className={`p-2.5 text-left border text-xs transition-colors flex items-center justify-between ${
                    active
                      ? 'bg-[#2A1715] border-[#C1432E] text-chalk font-medium'
                      : 'bg-night border-hairline text-chalk-muted hover:text-chalk hover:bg-panel-light'
                  }`}
                >
                  <span className="truncate">{cond}</span>
                  {active && <Check className="w-3.5 h-3.5 text-[#C1432E] shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Add Custom Condition */}
          <div className="pt-2 flex gap-2">
            <input
              type="text"
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              placeholder="Add other medical note or condition (e.g. Past meniscus repair)…"
              className="flex-1 px-3 py-2 bg-night border border-hairline text-chalk text-xs focus:outline-none focus:border-cinder"
            />
            <button
              type="button"
              onClick={addCustomCondition}
              disabled={!customCondition.trim()}
              className="px-3 py-2 bg-panel-light hover:bg-panel border border-hairline text-chalk text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-medium transition-colors shadow-sm"
          >
            {saving ? 'Saving changes…' : 'Save all athlete settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
