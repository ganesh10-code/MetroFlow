import React from 'react';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendsChartsProps {
  maintenance_trend?: TrendPoint[];
  cleaning_trend?: TrendPoint[];
  fitness_trend?: TrendPoint[];
  risk_trend?: TrendPoint[];
  loading?: boolean;
}

const TrendBars: React.FC<{
  data: TrendPoint[];
  label: string;
  color: string;
}> = ({ data, label, color }) => {
  if (!data || data.length === 0) return null;

  const values = data.map((p) => p.value);
  const maxVal = Math.max(...values, 1);
  const current = values[values.length - 1] ?? 0;
  const previous = values[values.length - 2] ?? 0;
  const delta = current - previous;

  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    orange: '#f97316',
    green: '#10b981',
    purple: '#a855f7',
  };
  const barColor = colorMap[color] || color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-slate-600/20 border border-slate-500/50"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">{label}</h4>
        <div className="text-xs text-gray-300">
          Current: <span className="font-semibold">{current.toFixed(0)}</span>
        </div>
      </div>

      <div className="h-32 flex items-end gap-2 mb-3">
        {data.map((point, idx) => {
          const height = Math.max(8, (point.value / maxVal) * 100);
          const time = new Date(point.date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <div key={`${point.date}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-gray-400">{Math.round(point.value)}</div>
              <div
                className="w-full rounded-t"
                style={{ height: `${height}%`, backgroundColor: barColor, opacity: idx === data.length - 1 ? 0.95 : 0.5 }}
              />
              <div className="text-[10px] text-gray-500">{time}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-gray-400">
          Max: <span className="text-gray-300">{maxVal.toFixed(0)}</span>
        </div>
        <div className={`${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Delta: <span className="font-semibold">{delta >= 0 ? '+' : ''}{delta.toFixed(0)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export const TrendsCharts: React.FC<TrendsChartsProps> = ({
  maintenance_trend = [],
  cleaning_trend = [],
  fitness_trend = [],
  risk_trend = [],
  loading = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-cyan-400" size={20} />
        <h3 className="text-lg font-bold text-white">7-Day Trends</h3>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">
          <div className="inline-block animate-spin">⏳</div> Loading trends...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendBars
            data={maintenance_trend}
            label="Maintenance Backlog"
            color="orange"
          />
          <TrendBars
            data={cleaning_trend}
            label="Cleaning Pending"
            color="blue"
          />
          <TrendBars
            data={fitness_trend}
            label="Fitness Non-Compliant"
            color="purple"
          />
          <TrendBars
            data={risk_trend}
            label="System Risk Score"
            color="green"
          />
        </div>
      )}
    </motion.div>
  );
};

export default TrendsCharts;
