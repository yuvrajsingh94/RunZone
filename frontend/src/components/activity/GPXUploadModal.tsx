import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, UploadCloud, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface GPXUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newActivity: any) => void;
}

export const GPXUploadModal: React.FC<GPXUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('GPX outdoor run');
  const [rpeScore, setRpeScore] = useState(6);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.gpx')) {
        toast.error('Please select a valid .gpx file');
        return;
      }
      setFile(selected);
      setTitle(selected.name.replace('.gpx', '').replace(/[-_]/g, ' '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a GPX file');
      return;
    }
    setLoading(true);

    try {
      const activity = await api.uploadGPX(file, title, Number(rpeScore));
      toast.success(`GPX track ingested. Claimed ${activity.territory_captured_km2.toFixed(3)} km² territory.`);
      onSuccess(activity);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'GPX parse failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 font-sans animate-fade-in" role="dialog" aria-modal="true" aria-label="Upload GPX activity">
      <div className="w-full max-w-md bg-panel border border-hairline p-6 shadow-2xl space-y-4">
        <div className="flex items-baseline justify-between hairline-b pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-chalk">
              Import GPX track
            </h3>
            <p className="text-xs text-chalk-muted mt-0.5">
              Parse GPS points and compute 40m corridor buffer
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
          {/* Dropzone */}
          <label className="border border-dashed border-hairline-strong hover:border-cinder p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-night text-center">
            <input
              type="file"
              accept=".gpx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-1">
                <CheckCircle className="w-6 h-6 text-gauge-safe mx-auto" />
                <p className="font-medium text-chalk">{file.name}</p>
                <p className="text-[10px] text-chalk-dim tabular">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <UploadCloud className="w-6 h-6 text-chalk-dim mx-auto" />
                <p className="text-chalk-muted">
                  Click or drag a GPX track file here
                </p>
                <p className="text-[10px] text-chalk-dim">Standard GPX 1.1 format with track points</p>
              </div>
            )}
          </label>

          <div>
            <label className="block text-chalk-muted mb-1">Activity title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-night border border-hairline text-chalk focus:outline-none focus:border-cinder"
            />
          </div>

          <div>
            <label className="block text-chalk-muted mb-1">Perceived exertion (RPE 1–10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={rpeScore}
              onChange={(e) => setRpeScore(Number(e.target.value))}
              className="w-full px-3 py-2 bg-night border border-hairline text-chalk tabular focus:outline-none focus:border-cinder"
            />
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
              disabled={loading || !file}
              className="flex-1 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ingest track & buffer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
