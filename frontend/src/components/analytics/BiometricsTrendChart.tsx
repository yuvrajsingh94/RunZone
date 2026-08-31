import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Heart, Activity, Moon, Plus, Shield, Sparkles } from 'lucide-react';
import { BiometricDayData } from '../../types';

interface BiometricsTrendChartProps {
  data: BiometricDayData[];
  onOpenLogModal?: () => void;
}

export const BiometricsTrendChart: React.FC<BiometricsTrendChartProps> = ({
  data,
  onOpenLogModal,
}) => {
  const hasData = data && data.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: BiometricDayData = payload[0].payload;
      return (
        <div className="bg-night border border-hairline p-3 text-xs shadow-xl space-y-1.5 min-w-[170px] font-sans">
          <div className="font-display font-bold text-chalk flex justify-between">
            <span>{item.date} Telemetry</span>
            <span className="text-contour font-display tabular">{item.readiness_score}% Readiness</span>
          </div>
          <div className="hairline-t pt-1 space-y-0.5 text-[11px] text-chalk-muted font-display tabular">
            <div className="flex justify-between">
              <span className="text-chalk-dim">HRV (rMSSD):</span>
              <span className="text-[#3E8E7E] font-bold">{item.hrv_rmssd} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chalk-dim">Resting HR:</span>
              <span className="text-[#B8492E] font-bold">{item.resting_hr} bpm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chalk-dim">Sleep Duration:</span>
              <span className="text-chalk">{item.sleep_hours} hrs ({item.sleep_quality}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chalk-dim">Glycogen Restored:</span>
              <span className="text-amber-400">{item.glycogen_restored}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const latest = hasData ? data[data.length - 1] : null;

  return (
    <div className="bg-panel border border-hairline p-5 space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 ${hasData ? 'bg-contour' : 'bg-chalk-dim'} inline-block`} />
            <h2 className="font-display text-base font-bold text-chalk">
              Autonomic Recovery & HRV Trends (7-Day)
            </h2>
          </div>
          <p className="text-xs text-chalk-muted mt-0.5">
            Heart Rate Variability (rMSSD ms) vs. Resting Heart Rate (bpm)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasData && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#3E8E7E] inline-block" />
                <span className="text-chalk-muted font-medium">HRV (ms)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#B8492E] inline-block" />
                <span className="text-chalk-muted font-medium">Resting HR (bpm)</span>
              </div>
            </div>
          )}

          {onOpenLogModal && (
            <button
              onClick={onOpenLogModal}
              className="px-2.5 py-1 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-display font-medium transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Biometrics</span>
            </button>
          )}
        </div>
      </div>

      {!hasData ? (
        /* Honest Empty State */
        <div className="py-12 px-4 border border-dashed border-hairline bg-night/50 text-center space-y-3">
          <Heart className="w-8 h-8 text-chalk-dim mx-auto stroke-1 opacity-60" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-display text-sm font-bold text-chalk">
              No Biometrics Recorded Yet
            </h3>
            <p className="text-xs text-chalk-muted leading-relaxed">
              Biometric readiness scores require morning resting heart rate and HRV readings. Log your morning telemetry to activate recovery tracking.
            </p>
          </div>
          {onOpenLogModal && (
            <button
              onClick={onOpenLogModal}
              className="mt-2 px-3.5 py-1.5 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-display font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Today's Biometrics</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Chart Canvas */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  stroke="#656C71"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(237, 238, 231, 0.08)' }}
                />
                <YAxis
                  yAxisId="hrv"
                  stroke="#3E8E7E"
                  fontSize={11}
                  domain={[30, 100]}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(237, 238, 231, 0.08)' }}
                />
                <YAxis
                  yAxisId="rhr"
                  orientation="right"
                  stroke="#B8492E"
                  fontSize={11}
                  domain={[35, 80]}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(237, 238, 231, 0.08)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* HRV Baseline Guide */}
                <ReferenceLine yAxisId="hrv" y={64} stroke="#3E8E7E" strokeDasharray="3 3" opacity={0.4} />

                {/* HRV Area & Line */}
                <Area
                  yAxisId="hrv"
                  type="monotone"
                  dataKey="hrv_rmssd"
                  fill="rgba(62, 142, 126, 0.12)"
                  stroke="#3E8E7E"
                  strokeWidth={2.5}
                />

                {/* Resting HR Line */}
                <Line
                  yAxisId="rhr"
                  type="monotone"
                  dataKey="resting_hr"
                  stroke="#B8492E"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#B8492E' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Summary Strip */}
          {latest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 hairline-t text-xs font-sans">
              <div className="space-y-0.5">
                <div className="text-[10px] text-chalk-dim">Latest HRV (rMSSD)</div>
                <div className="font-display text-base font-bold text-contour tabular">
                  {latest.hrv_rmssd ?? '—'} ms{' '}
                  {latest.hrv_rmssd && (
                    <span className="text-[10px] font-normal text-contour">
                      ({latest.hrv_rmssd >= 64 ? `+${latest.hrv_rmssd - 64}` : `${latest.hrv_rmssd - 64}`} ms vs baseline)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] text-chalk-dim">Resting Pulse</div>
                <div className="font-display text-base font-bold text-chalk tabular">
                  {latest.resting_hr ?? '—'} bpm{' '}
                  {latest.resting_hr && (
                    <span className="text-[10px] font-normal text-contour">
                      ({latest.resting_hr <= 52 ? `${latest.resting_hr - 52}` : `+${latest.resting_hr - 52}`} bpm vs base)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] text-chalk-dim">Sleep Duration</div>
                <div className="font-display text-base font-bold text-chalk tabular">
                  {latest.sleep_hours ?? '—'} hrs{' '}
                  {latest.sleep_quality && (
                    <span className="text-[10px] font-normal text-chalk-muted">
                      ({latest.sleep_quality}% quality)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] text-chalk-dim">Autonomic Readiness</div>
                <div className="font-display text-base font-bold text-contour tabular">
                  {latest.readiness_score ? `${latest.readiness_score}% ${latest.readiness_category || ''}` : '—'}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
