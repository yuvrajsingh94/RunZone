import React, { useState } from 'react';
import { api } from '../../services/api';
import { FieldError } from '../common/FieldError';
import { validateNumberRange, validateRequired } from '../../utils/validation';
import { X, Play, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SimulateRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newActivity: any) => void;
}

export const SimulateRunModal: React.FC<SimulateRunModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('Embarcadero waterfront corridor');
  const [startLat, setStartLat] = useState(37.7749);
  const [startLon, setStartLon] = useState(-122.4194);
  const [distanceKm, setDistanceKm] = useState(5.5);
  const [durationMinutes, setDurationMinutes] = useState(28);
  const [bufferMeters, setBufferMeters] = useState(40);
  const [avgHr, setAvgHr] = useState(154);
  const [rpeScore, setRpeScore] = useState(6);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const titleErr = validateRequired(title, 'Route title');
    if (titleErr) newErrors.title = titleErr;

    const latErr = validateNumberRange(Number(startLat), -90, 90, 'Start latitude');
    if (latErr) newErrors.startLat = latErr;

    const lonErr = validateNumberRange(Number(startLon), -180, 180, 'Start longitude');
    if (lonErr) newErrors.startLon = lonErr;

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
      const activity = await api.simulateRun({
        title: title.trim(),
        start_lat: Number(startLat),
        start_lon: Number(startLon),
        distance_km: Number(distanceKm),
        duration_minutes: Number(durationMinutes),
        buffer_meters: Number(bufferMeters),
        avg_hr: Number(avgHr),
        rpe_score: Number(rpeScore),
      });

      toast.success(`Run recorded. ${activity.territory_captured_km2.toFixed(3)} km² territory claimed.`);
      onSuccess(activity);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 font-sans animate-fade-in" role="dialog" aria-modal="true" aria-label="Simulate GPS run">
      <div className="w-full max-w-md bg-panel border border-hairline p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-baseline justify-between hairline-b pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-chalk">
              Simulate GPS route
            </h3>
            <p className="text-xs text-chalk-muted mt-0.5">
              PostGIS 40m polygon corridor buffer calculation
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

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-3.5 text-xs">
          <div>
            <label className="block text-chalk-muted mb-1">Route title</label>
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
              <label className="block text-chalk-muted mb-1">Start latitude</label>
              <input
                type="number"
                step="0.0001"
                value={startLat}
                onChange={(e) => handleFieldChange('startLat', Number(e.target.value), setStartLat)}
                className={`w-full px-3 py-2 bg-night text-chalk tabular focus:outline-none transition-colors border ${
                  errors.startLat
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.startLat} />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Start longitude</label>
              <input
                type="number"
                step="0.0001"
                value={startLon}
                onChange={(e) => handleFieldChange('startLon', Number(e.target.value), setStartLon)}
                className={`w-full px-3 py-2 bg-night text-chalk tabular focus:outline-none transition-colors border ${
                  errors.startLon
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.startLon} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-chalk-muted mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="50"
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
                min="5"
                max="300"
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
              <label className="block text-chalk-muted mb-1">Corridor buffer</label>
              <select
                value={bufferMeters}
                onChange={(e) => setBufferMeters(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk focus:outline-none focus:border-cinder"
              >
                <option value={30}>30 meters</option>
                <option value={40}>40 meters (Standard)</option>
                <option value={50}>50 meters (Wide)</option>
              </select>
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Heart rate (bpm)</label>
              <input
                type="number"
                min="100"
                max="200"
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
              <span>1 - Recovery</span>
              <span>5 - Aerobic</span>
              <span>10 - Maximum</span>
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
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute route</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
