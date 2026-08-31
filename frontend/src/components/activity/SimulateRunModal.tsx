import React, { useState } from 'react';
import { api } from '../../services/api';
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
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const activity = await api.simulateRun({
        title,
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
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-chalk-muted mb-1">Route title</label>
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
              <label className="block text-chalk-muted mb-1">Start latitude</label>
              <input
                type="number"
                step="0.0001"
                value={startLat}
                onChange={(e) => setStartLat(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Start longitude</label>
              <input
                type="number"
                step="0.0001"
                value={startLon}
                onChange={(e) => setStartLon(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-chalk-muted mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="42.2"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Duration (min)</label>
              <input
                type="number"
                min="2"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">Buffer (m)</label>
              <input
                type="number"
                min="10"
                max="200"
                value={bufferMeters}
                onChange={(e) => setBufferMeters(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-chalk-muted mb-1">Average HR (bpm)</label>
              <input
                type="number"
                min="80"
                max="210"
                value={avgHr}
                onChange={(e) => setAvgHr(Number(e.target.value))}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
              />
            </div>
            <div>
              <label className="block text-chalk-muted mb-1">RPE intensity (1–10)</label>
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

          {/* Action Buttons */}
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
              className="flex-1 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing buffer…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute simulation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
