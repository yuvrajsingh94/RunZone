import React, { useState } from 'react';
import { api } from '../../services/api';
import { FieldError } from '../common/FieldError';
import { validateNumberRange } from '../../utils/validation';
import { Heart, Moon, Activity, X, Sparkles, Loader2 } from 'lucide-react';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const hrvErr = validateNumberRange(Number(hrvRmssd), 20, 200, 'HRV rMSSD');
    if (hrvErr) newErrors.hrvRmssd = hrvErr;

    const rhrErr = validateNumberRange(Number(restingHr), 30, 120, 'Resting Heart Rate');
    if (rhrErr) newErrors.restingHr = rhrErr;

    const sleepErr = validateNumberRange(Number(sleepHours), 1, 16, 'Sleep duration');
    if (sleepErr) newErrors.sleepHours = sleepErr;

    const qualityErr = validateNumberRange(Number(sleepQuality), 1, 100, 'Sleep quality');
    if (qualityErr) newErrors.sleepQuality = qualityErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

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

  const handleFieldChange = (field: string, val: number, setter: (v: number) => void) => {
    setter(val);
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-night/90 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in" role="dialog" aria-modal="true" aria-label="Log Morning Biometrics">
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
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
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
              onChange={(e) => handleFieldChange('hrvRmssd', Number(e.target.value), setHrvRmssd)}
              className={`w-full px-3 py-2 bg-night text-chalk focus:outline-none transition-colors border ${
                errors.hrvRmssd
                  ? 'border-[#C1432E] focus:border-[#C1432E]'
                  : 'border-hairline focus:border-cinder'
              }`}
            />
            <FieldError error={errors.hrvRmssd} />
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
              onChange={(e) => handleFieldChange('restingHr', Number(e.target.value), setRestingHr)}
              className={`w-full px-3 py-2 bg-night text-chalk focus:outline-none transition-colors border ${
                errors.restingHr
                  ? 'border-[#C1432E] focus:border-[#C1432E]'
                  : 'border-hairline focus:border-cinder'
              }`}
            />
            <FieldError error={errors.restingHr} />
            <p className="text-[10px] text-chalk-dim">
              Baseline: 48–56 bpm. Elevated resting pulse signals autonomic strain or sleep deficit.
            </p>
          </div>

          {/* Sleep Hours & Quality Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-chalk-muted font-medium">Sleep Duration</label>
                <span className="font-display font-bold text-chalk tabular">{sleepHours}h</span>
              </div>
              <input
                type="number"
                min="1"
                max="16"
                step="0.5"
                value={sleepHours}
                onChange={(e) => handleFieldChange('sleepHours', Number(e.target.value), setSleepHours)}
                className={`w-full px-3 py-2 bg-night text-chalk tabular focus:outline-none transition-colors border ${
                  errors.sleepHours
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.sleepHours} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-chalk-muted font-medium">Sleep Quality</label>
                <span className="font-display font-bold text-contour tabular">{sleepQuality}%</span>
              </div>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={sleepQuality}
                onChange={(e) => handleFieldChange('sleepQuality', Number(e.target.value), setSleepQuality)}
                className={`w-full px-3 py-2 bg-night text-chalk tabular focus:outline-none transition-colors border ${
                  errors.sleepQuality
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.sleepQuality} />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-panel-light hover:bg-panel text-chalk-muted hover:text-chalk border border-hairline transition-colors font-medium text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk transition-colors font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Biometrics</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
