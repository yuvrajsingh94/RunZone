import React, { useState } from 'react';
import { api } from '../../services/api';
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
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const activity = await api.createManualActivity({
        title,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 font-sans animate-fade-in" role="dialog" aria-modal="true" aria-label="Log manual workout">
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-chalk-muted mb-1">Workout title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-night border border-hairline text-chalk focus:outline-none focus:border-cinder"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-chalk-muted mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-chalk-muted mb-1">Elevation (m)</label>
              <input
                type="number"
                value={elevationGain}
                onChange={(e) => setElevationGain(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Avg HR (bpm)</label>
              <input
                type="number"
                value={avgHr}
                onChange={(e) => setAvgHr(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">RPE (1–10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={rpeScore}
                onChange={(e) => setRpeScore(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-night hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Log workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
