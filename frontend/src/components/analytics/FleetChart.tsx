import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, BarChart3 } from 'lucide-react';

interface FleetChartProps {
  run: number;
  standby: number;
  maintenance: number;
}

export const FleetChart: React.FC<FleetChartProps> = ({ run, standby, maintenance }) => {
  const total = run + standby + maintenance;

  const pieSlices = useMemo(() => {
    const runPercent = total > 0 ? (run / total) * 100 : 0;
    const standbyPercent = total > 0 ? (standby / total) * 100 : 0;
    const maintenancePercent = total > 0 ? (maintenance / total) * 100 : 0;

    return [
      { label: 'Running', value: run, percent: runPercent, color: 'bg-green-500' },
      { label: 'Standby', value: standby, percent: standbyPercent, color: 'bg-blue-500' },
      { label: 'Maintenance', value: maintenance, percent: maintenancePercent, color: 'bg-orange-500' },
    ];
  }, [run, standby, maintenance, total]);

  // SVG Pie Chart
  const getPieChartPath = () => {
    let currentAngle = -90;
    const paths = [];

    pieSlices.forEach((slice, idx) => {
      const sliceAngle = (slice.percent / 100) * 360;
      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + sliceAngle) * (Math.PI / 180);

      const x1 = 50 + 40 * Math.cos(startAngle);
      const y1 = 50 + 40 * Math.sin(startAngle);
      const x2 = 50 + 40 * Math.cos(endAngle);
      const y2 = 50 + 40 * Math.sin(endAngle);

      const largeArc = sliceAngle > 180 ? 1 : 0;
      const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const colorClass = slice.color.replace('bg-', '#');
      const colorMap: Record<string, string> = {
        '#green-500': '#10b981',
        '#blue-500': '#3b82f6',
        '#orange-500': '#f97316',
      };
      const color = colorMap[colorClass] || colorClass;

      paths.push(
        <motion.path
          key={idx}
          d={pathData}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: idx * 0.1 }}
          opacity={0.8}
        />
      );

      currentAngle += sliceAngle;
    });

    return paths;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-700/30 to-slate-800/30 border border-slate-600/50 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PieChart className="text-cyan-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Fleet Distribution</h3>
        </div>
        <div className="text-sm text-gray-400">Total: {total} trains</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart SVG */}
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-48 h-48">
            {getPieChartPath()}
            <circle cx="50" cy="50" r="20" fill="rgba(7, 13, 31, 0.8)" />
            <text
              x="50"
              y="52"
              textAnchor="middle"
              className="text-xl font-bold fill-white"
            >
              {total}
            </text>
          </svg>
        </div>

        {/* Legend & Details */}
        <div className="space-y-4">
          {pieSlices.map((slice, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 p-3 bg-slate-600/20 rounded-lg"
            >
              <div className={`${slice.color} w-4 h-4 rounded-full`} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{slice.label}</div>
                <div className="text-xs text-gray-400">{slice.percent.toFixed(1)}%</div>
              </div>
              <div className="text-lg font-bold text-gray-200">{slice.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default FleetChart;
