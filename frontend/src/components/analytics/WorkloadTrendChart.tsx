import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ACWRMetricPoint } from '../../types';
import { Activity } from 'lucide-react';

interface WorkloadTrendChartProps {
  history: ACWRMetricPoint[];
}

export const WorkloadTrendChart: React.FC<WorkloadTrendChartProps> = ({ history = [] }) => {
  const safeHistory = Array.isArray(history) ? history : [];
  const hasData = safeHistory.length > 0;

  const formattedData = safeHistory.map((item) => ({
    ...item,
    formattedDate: item?.date ? String(item.date).slice(5) : '—',
  }));

  return (
    <div className="bg-panel border border-hairline p-5 space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-chalk">
            Workload timeline
          </h3>
          <p className="text-xs text-chalk-muted mt-0.5 font-sans">
            14-day history comparing acute fatigue (7d) against chronic capacity (28d)
          </p>
        </div>

        {/* Legend */}
        {hasData && (
          <div className="flex items-center gap-4 text-xs font-sans text-chalk-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cinder inline-block" />
              <span className="text-chalk font-medium">Acute (7d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-chalk-muted inline-block" />
              <span>Chronic (28d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-contour/40 inline-block" />
              <span>Daily km</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart or Honest Empty State */}
      {hasData ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(237, 238, 231, 0.05)" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                stroke="#656C71"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(237, 238, 231, 0.1)' }}
                className="tabular"
              />
              <YAxis
                yAxisId="load"
                stroke="#656C71"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(237, 238, 231, 0.1)' }}
                className="tabular"
              />
              <YAxis
                yAxisId="distance"
                orientation="right"
                stroke="#656C71"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="k"
                className="tabular"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1B2023',
                  borderColor: 'rgba(237, 238, 231, 0.12)',
                  borderRadius: '2px',
                  color: '#EDEEE7',
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                labelStyle={{ fontFamily: 'Archivo', fontWeight: 600, color: '#EDEEE7' }}
              />
              {/* Daily Distance Bar (Contour subtle) */}
              <Bar
                yAxisId="distance"
                dataKey="distance_km"
                name="Distance (km)"
                fill="#3E8E7E"
                opacity={0.3}
              />
              {/* Chronic Workload Line (Chalk muted) */}
              <Line
                yAxisId="load"
                type="monotone"
                dataKey="chronic_load"
                name="Chronic Load (28d)"
                stroke="#9BA1A6"
                strokeWidth={1.5}
                dot={{ r: 2, fill: '#9BA1A6' }}
              />
              {/* Acute Workload Line (Cinder) */}
              <Line
                yAxisId="load"
                type="monotone"
                dataKey="acute_load"
                name="Acute Load (7d)"
                stroke="#B8492E"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#B8492E' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 border border-dashed border-hairline flex flex-col items-center justify-center p-6 text-center space-y-2 bg-night">
          <Activity className="w-6 h-6 text-chalk-dim" />
          <div className="space-y-1">
            <h4 className="font-display font-semibold text-xs text-chalk">
              No Workload Telemetry Yet
            </h4>
            <p className="text-[11px] text-chalk-muted max-w-sm">
              Log or simulate runs to build your rolling 7-day acute and 28-day chronic fatigue model.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
