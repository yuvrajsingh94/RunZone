import React from 'react';
import { Shield, Lock, MapPin, Heart, X, CheckCircle2 } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-night/90 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-panel border border-hairline w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-night hairline-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cinder" />
            <h2 id="privacy-modal-title" className="font-display font-bold text-sm text-chalk">
              Data, Telemetry & Privacy Disclosure
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close privacy modal"
            className="p-1 text-chalk-dim hover:text-chalk transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-chalk-muted leading-relaxed font-sans">
          <div className="p-3 bg-night border border-hairline space-y-1">
            <div className="flex items-center gap-1.5 font-display font-semibold text-chalk text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-contour" />
              <span>Engineering Demonstration Notice</span>
            </div>
            <p className="text-[11px] text-chalk-dim">
              RunZone is a production-grade sports science and geospatial engineering demonstration platform. We treat all runner data with rigorous SaaS security standards.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-xs text-chalk flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cinder" />
                <span>GPS Location History & Spatial Corridors</span>
              </h3>
              <p>
                GPS track coordinates are ingested during live GPS tracking, GPX uploads, or simulated runs. Coordinates are used solely by our PostGIS spatial engine to calculate geodesic distance, elevation, and 40-meter territory corridors. Coordinates are never sold, advertised, or shared with third parties.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-xs text-chalk flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#C1432E]" />
                <span>Biometric & Autonomic Recovery Telemetry</span>
              </h3>
              <p>
                Resting heart rate, Heart Rate Variability (HRV rMSSD), and sleep duration are used exclusively to calculate Dr. Tim Gabbett’s Acute:Chronic Workload Ratio (ACWR) and autonomic readiness scores. This data informs ZoneCoach pacing recommendations and is not used for medical diagnosis.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-xs text-chalk flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-chalk" />
                <span>Authentication & Session Security</span>
              </h3>
              <p>
                Passwords are encrypted using industry-standard <code className="font-mono bg-night px-1">bcrypt</code> with salt. Session authentication uses short-lived (15-minute) JWT access tokens alongside database-backed, rotated refresh tokens with replay protection.
              </p>
            </div>
          </div>

          <div className="p-3 bg-night border border-hairline text-[11px] text-chalk-dim space-y-1">
            <div className="font-display font-bold text-chalk">Data Ownership & Right to Erasure</div>
            <p>
              You maintain full ownership of your activity log. You may delete individual runs or clear your stored profile parameters at any time from the Activities or Profile dashboard.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-night hairline-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-semibold font-display transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
