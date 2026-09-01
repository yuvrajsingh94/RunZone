import React, { useState } from 'react';
import { api } from '../../services/api';
import { FieldError } from '../common/FieldError';
import { validateNumberRange, validateRequired } from '../../utils/validation';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LogRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newActivity: any) => void;
}

export const LogRunModal: React.FC<LogRunModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('Aerobic base recovery');
  const [distanceKm, setDistanceKm] = useState(8.0);
  const [durationMinutes, setDurationMinutes] = useState(44);
  const [elevationGain, setElevationGain] = useState(65);
  const [avgHr, setAvgHr] = useState(145);
  const [rpeScore, setRpeScore] = useState(5);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const titleErr = validateRequired(title, 'Workout title');
    if (titleErr) newErrors.title = titleErr;

    const distErr = validateNumberRange(Number(distanceKm), 0.1, 100, 'Distance');
    if (distErr) newErrors.distanceKm = distErr;

    const durErr = validateNumberRange(Number(durationMinutes), 1, 600, 'Duration');
    if (durErr) newErrors.durationMinutes = durErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const activity = await api.createManualActivity({
        title: title.trim(),
        distance_meters: Number(distanceKm) * 1000,
        duration_seconds: Number(durationMinutes) * 60,
        elevation_gain_meters: Number(elevationGain),
        avg_heart_rate: avgHr ? Number(avgHr) : undefined,
        rpe_score: Number(rpeScore),
      });

      toast.success('Run logged. Fatigue model updated.');
      onSuccess(activity);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log run');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, val: any, setter: (v: any) => void) => {
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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Log manual workout"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-panel border border-hairline p-6 shadow-2xl space-y-4">
        <div className="flex items-baseline justify-between hairline-b pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-chalk">
              Log workout
            </h3>
            <p className="text-xs text-chalk-muted mt-0.5">
              Record manual session to update TRIMP and ACWR score
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-chalk-dim hover:text-chalk transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5 text-xs">
          <div>
            <label className="block text-chalk-muted mb-1">Workout title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleFieldChange('title', e.target.value, setTitle)}
              className={`w-full px-3 py-2 bg-night text-chalk focus:outline-none transition-colors border ${
                errors.title
                  ? 'border-[#C1432E] focus:border-[#C1432E]'
                  : 'border-hairline focus:border-cinder'
              }`}
            />
            <FieldError error={errors.title} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-chalk-muted mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={distanceKm}
                onChange={(e) => handleFieldChange('distanceKm', Number(e.target.value), setDistanceKm)}
                className={`w-full px-3 py-2 bg-night text-chalk tabular focus:outline-none transition-colors border ${
                  errors.distanceKm
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.distanceKm} />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => handleFieldChange('durationMinutes', Number(e.target.value), setDurationMinutes)}
                className={`w-full px-3 py-2 bg-night text-chalk tabular focus:outline-none transition-colors border ${
                  errors.durationMinutes
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.durationMinutes} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-chalk-muted mb-1">Elevation gain (m)</label>
              <input
                type="number"
                min="0"
                value={elevationGain}
                onChange={(e) => setElevationGain(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Avg heart rate (bpm)</label>
              <input
                type="number"
                min="60"
                max="220"
                value={avgHr}
                onChange={(e) => setAvgHr(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-chalk-muted mb-1">
              <span>Perceived exertion (RPE)</span>
              <span className="font-display font-bold text-chalk tabular">{rpeScore}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={rpeScore}
              onChange={(e) => setRpeScore(Number(e.target.value))}
              className="w-full accent-cinder cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-chalk-dim mt-0.5">
              <span>1 - Easy</span>
              <span>5 - Moderate</span>
              <span>10 - All-out</span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-panel-light hover:bg-panel text-chalk-muted hover:text-chalk border border-hairline transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk transition-colors font-medium flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Log session</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
