import React from 'react';
import { ACWRDashboardSummary } from '../../types';

interface ACWRGaugeProps {
  data: ACWRDashboardSummary | null;
}

const GAUGE_COLORS = {
  safe: '#5B9A4B',
  alert: '#D9932E',
  danger: '#C1432E',
};

export const ACWRGauge: React.FC<ACWRGaugeProps> = ({ data }) => {
  if (!data) {
    return (
      <div
        className="bg-panel border border-hairline p-5 h-72 flex items-center justify-center text-xs text-chalk-dim font-sans"
        aria-busy="true"
        aria-label="Loading fatigue gauge"
      >
        Loading fatigue model…
      </div>
    );
  }

  const acwr = data.current_acwr || 0;

  // Determine current status and zone color
  let zoneColor = GAUGE_COLORS.safe;
  let statusText = 'Safe zone';
  let statusNote = 'Workload matches your chronic base. Low risk of soft-tissue strain.';

  if (acwr < 0.8) {
    zoneColor = '#4B7B9A';
    statusText = 'Under-training';
    statusNote = 'Training load is low relative to baseline fitness.';
  } else if (acwr <= 1.3) {
    zoneColor = GAUGE_COLORS.safe;
    statusText = 'Safe zone';
    statusNote = 'Optimal training sweet spot. High adaptation with lowest injury risk.';
  } else if (acwr <= 1.5) {
    zoneColor = GAUGE_COLORS.alert;
    statusText = 'High alert';
    statusNote = 'Workload is climbing faster than recovery rate. Prioritize easy pacing.';
  } else {
    zoneColor = GAUGE_COLORS.danger;
    statusText = 'Danger zone';
    statusNote = 'Acute spike detected. High risk of overtraining or injury.';
  }

  // Calculate needle angle across 0.0 to 2.0 (mapped from -90° to +90°)
  const clampedAcwr = Math.min(2.0, Math.max(0.0, acwr));
  const needleRotation = -90 + (clampedAcwr / 2.0) * 180;

  return (
    <div
      className="bg-panel border border-hairline p-5 text-chalk space-y-4"
      aria-label={`Fatigue gauge score: ${acwr.toFixed(2)} (${statusText})`}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-chalk">
            Fatigue gauge
          </h2>
          <p className="text-xs text-chalk-muted mt-0.5">
            Acute:chronic workload ratio (7-day fatigue vs 28-day baseline)
          </p>
        </div>
        <div
          className="text-xs font-medium px-2 py-0.5 border"
          style={{
            borderColor: `${zoneColor}40`,
            backgroundColor: `${zoneColor}15`,
            color: zoneColor,
          }}
        >
          {statusText}
        </div>
      </div>

      {/* Precision Calibrated Arc Gauge */}
      <div className="flex flex-col items-center py-2">
        <svg
          className="w-56 h-28 overflow-visible"
          viewBox="0 0 200 100"
          role="img"
          aria-label={`Fatigue gauge indicator showing ${acwr.toFixed(2)}`}
        >
          {/* Background arc track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#23292D"
            strokeWidth="12"
            strokeLinecap="butt"
          />

          {/* Under-training band (0.0 to 0.8) -> 0 to 72 deg */}
          <path
            d="M 20 100 A 80 80 0 0 1 65.5 35.5"
            fill="none"
            stroke="#4B7B9A"
            strokeWidth="12"
            strokeLinecap="butt"
          />

          {/* Safe zone band (0.8 to 1.3) -> 72 to 117 deg */}
          <path
            d="M 67 34 A 80 80 0 0 1 133 34"
            fill="none"
            stroke={GAUGE_COLORS.safe}
            strokeWidth="12"
            strokeLinecap="butt"
          />

          {/* High alert band (1.3 to 1.5) -> 117 to 135 deg */}
          <path
            d="M 134.5 35.5 A 80 80 0 0 1 156 56"
            fill="none"
            stroke={GAUGE_COLORS.alert}
            strokeWidth="12"
            strokeLinecap="butt"
          />

          {/* Danger zone band (1.5 to 2.0) -> 135 to 180 deg */}
          <path
            d="M 157.5 58 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={GAUGE_COLORS.danger}
            strokeWidth="12"
            strokeLinecap="butt"
          />

          {/* Scale tick marks */}
          <text x="18" y="114" fontSize="9" fill="#656C71" textAnchor="middle" className="tabular">0.0</text>
          <text x="70" y="24" fontSize="9" fill="#656C71" textAnchor="middle" className="tabular">0.8</text>
          <text x="135" y="24" fontSize="9" fill="#656C71" textAnchor="middle" className="tabular">1.3</text>
          <text x="160" y="48" fontSize="9" fill="#656C71" textAnchor="middle" className="tabular">1.5</text>
          <text x="182" y="114" fontSize="9" fill="#656C71" textAnchor="middle" className="tabular">2.0</text>

          {/* Precision Needle */}
          <g transform="translate(100, 100)">
            <g
              transform={`rotate(${needleRotation})`}
              style={{ transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <line
                x1="0"
                y1="4"
                x2="0"
                y2="-72"
                stroke="#EDEEE7"
                strokeWidth="2"
                strokeLinecap="square"
              />
              <circle cx="0" cy="-72" r="3" fill={zoneColor} />
            </g>
            {/* Center Pivot */}
            <circle cx="0" cy="0" r="6" fill="#14181A" stroke="#EDEEE7" strokeWidth="2" />
          </g>
        </svg>

        {/* Large Score Readout */}
        <div className="text-center mt-1">
          <div className="font-display text-4xl font-bold tabular tracking-tight text-chalk">
            {acwr.toFixed(2)}
          </div>
          <div className="text-xs text-chalk-dim mt-0.5">
            ACWR ratio
          </div>
        </div>
      </div>

      {/* Watch-Readout Data Strip */}
      <div className="grid grid-cols-4 hairline-t pt-3 text-center">
        <div className="px-2">
          <div className="text-[10px] text-chalk-dim">7-day acute</div>
          <div className="font-display text-sm font-semibold text-chalk tabular mt-0.5">
            {Math.round(data.acute_workload_7d)}
          </div>
          <div className="text-[10px] text-chalk-muted tabular">{data.total_distance_7d_km} km</div>
        </div>

        <div className="px-2 hairline-l">
          <div className="text-[10px] text-chalk-dim">28-day chronic</div>
          <div className="font-display text-sm font-semibold text-chalk tabular mt-0.5">
            {Math.round(data.chronic_workload_28d)}
          </div>
          <div className="text-[10px] text-chalk-muted tabular">{data.total_distance_28d_km} km</div>
        </div>

        <div className="px-2 hairline-l">
          <div className="text-[10px] text-chalk-dim">Estimated risk</div>
          <div className="font-display text-sm font-semibold tabular mt-0.5" style={{ color: zoneColor }}>
            {data.injury_risk_percentage}%
          </div>
          <div className="text-[10px] text-chalk-muted">Soft tissue</div>
        </div>

        <div className="px-2 hairline-l">
          <div className="text-[10px] text-chalk-dim">Sweet spot</div>
          <div className="font-display text-sm font-semibold text-chalk tabular mt-0.5" style={{ color: GAUGE_COLORS.safe }}>
            0.8–1.3
          </div>
          <div className="text-[10px] text-chalk-muted">Target band</div>
        </div>
      </div>

      {/* Recommendation Note */}
      <div className="text-xs text-chalk-muted hairline-t pt-3 leading-relaxed">
        <span className="text-chalk font-medium">Physiology read: </span>
        {statusNote}
      </div>
    </div>
  );
};
