import React, { useState } from 'react';
import { api } from '../../services/api';
import { Heart, Moon, Activity, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { BiometricDayData } from '../../types';

interface LogBiometricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEntry: BiometricDayData) => void;
}

export const LogBiometricsModal: React.FC<LogBiometricsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [hrvRmssd, setHrvRmssd] = useState<number>(68);
  const [restingHr, setRestingHr] = useState<number>(50);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [sleepQuality, setSleepQuality] = useState<number>(85);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const entry = await api.logBiometricsEntry({
        hrv_rmssd: Number(hrvRmssd),
        resting_hr: Number(restingHr),
        sleep_hours: Number(sleepHours),
        sleep_quality: Number(sleepQuality),
      });
      toast.success(`Biometrics logged! Readiness: ${entry.readiness_score}%.`);
      onSuccess(entry);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save biometrics');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-night/90 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-panel border border-hairline w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-cinder" />
            <h3 className="font-display font-bold text-base text-chalk">
              Log Morning Biometrics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-chalk-dim hover:text-chalk transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* HRV rMSSD */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-chalk-muted font-medium">HRV rMSSD (ms)</label>
              <span className="font-display font-bold text-contour tabular">{hrvRmssd} ms</span>
            </div>
            <input
              type="number"
              min="20"
              max="200"
              step="1"
              value={hrvRmssd}
              onChange={(e) => setHrvRmssd(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-night border border-hairline text-chalk focus:outline-none focus:border-cinder"
            />
            <p className="text-[10px] text-chalk-dim">
              Standard athletic baseline: ~64 ms. Higher values reflect parasympathetic recovery.
            </p>
          </div>

          {/* Resting Heart Rate */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-chalk-muted font-medium">Resting Heart Rate (bpm)</label>
              <span className="font-display font-bold text-cinder tabular">{restingHr} bpm</span>
            </div>
            <input
              type="number"
              min="30"
              max="120"
              step="1"
              value={restingHr}
              onChange={(e) => setRestingHr(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-night border border-hairline text-chalk focus:outline-none focus:border-cinder"
            />
          </div>

          {/* Sleep Hours */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-chalk-muted font-medium">Sleep Duration (hours)</label>
              <span className="font-display font-bold text-amber-400 tabular">{sleepHours} hrs</span>
            </div>
            <input
              type="number"
              min="2"
              max="16"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-night border border-hairline text-chalk focus:outline-none focus:border-cinder"
            />
          </div>

          {/* Sleep Quality */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-chalk-muted font-medium">Sleep Quality (%)</label>
              <span className="font-display font-bold text-chalk tabular">{sleepQuality}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(Number(e.target.value))}
              className="w-full accent-cinder cursor-pointer"
            />
          </div>

          <div className="flex gap-2 pt-2 hairline-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk text-xs font-medium border border-hairline transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk text-xs font-display font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{saving ? 'Computing...' : 'Save & Calculate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
