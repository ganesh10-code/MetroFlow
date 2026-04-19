import React from 'react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode | string;
  color: 'blue' | 'red' | 'green' | 'purple' | 'orange';
  loading?: boolean;
}

const colorMap = {
  blue: 'from-blue-500/20 to-blue-400/10 border-blue-400',
  red: 'from-red-500/20 to-red-400/10 border-red-400',
  green: 'from-green-500/20 to-green-400/10 border-green-400',
  purple: 'from-purple-500/20 to-purple-400/10 border-purple-400',
  orange: 'from-orange-500/20 to-orange-400/10 border-orange-400',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  loading = false,
}) => {
  const isEmoji = typeof icon === 'string';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorMap[color]} border backdrop-blur-sm rounded-xl p-6 h-full transition ${loading ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-300 mb-2">{title}</p>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-400/20 rounded animate-pulse" />
            </div>
          ) : (
            <span className="text-3xl font-bold text-white">{value}</span>
          )}
        </div>
        {isEmoji ? (
          <div className="text-4xl">{icon}</div>
        ) : (
          <div className="opacity-60">{icon}</div>
        )}
      </div>
    </motion.div>
  );
};

export default MetricCard;
