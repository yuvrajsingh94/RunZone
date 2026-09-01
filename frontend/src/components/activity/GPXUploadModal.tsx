import React, { useState } from 'react';
import { api } from '../../services/api';
import { FieldError } from '../common/FieldError';
import { validateRequired } from '../../utils/validation';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.gpx')) {
        setErrors((prev) => ({ ...prev, file: 'Please select a valid .gpx track file' }));
        return;
      }
      setFile(selected);
      setTitle(selected.name.replace('.gpx', '').replace(/[-_]/g, ' '));
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.file;
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!file) {
      newErrors.file = 'Please upload a GPX track file';
    }
    const titleErr = validateRequired(title, 'Activity title');
    if (titleErr) {
      newErrors.title = titleErr;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const activity = await api.uploadGPX(file!, title.trim(), Number(rpeScore));
      toast.success(`GPX track ingested. Claimed ${activity.territory_captured_km2.toFixed(3)} km² territory.`);
      onSuccess(activity);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'GPX parse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (errors.title) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.title;
        return updated;
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Upload GPX activity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
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

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5 text-xs">
          {/* Dropzone */}
          <label className={`border border-dashed p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-night text-center ${
            errors.file
              ? 'border-[#C1432E]'
              : 'border-hairline-strong hover:border-cinder'
          }`}>
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
          <FieldError error={errors.file} />

          <div>
            <label className="block text-chalk-muted mb-1">Activity title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`w-full px-3 py-2 bg-night text-chalk focus:outline-none transition-colors border ${
                errors.title
                  ? 'border-[#C1432E] focus:border-[#C1432E]'
                  : 'border-hairline focus:border-cinder'
              }`}
            />
            <FieldError error={errors.title} />
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
              <span>6 - Steady tempo</span>
              <span>10 - All-out race</span>
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
                <span>Ingest track</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
