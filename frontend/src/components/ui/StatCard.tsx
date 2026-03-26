import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'cyan' | 'teal' | 'lavender' | 'green' | 'yellow' | 'red' | 'purple';
  sub?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  animate?: boolean;
}

const colorMap = {
  cyan: 'text-[#00F2FF] bg-[#00F2FF]/10 border-[#00F2FF]/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]',
  teal: 'text-[#00D2C8] bg-[#00D2C8]/10 border-[#00D2C8]/30',
  lavender: 'text-[#7D7DBE] bg-[#7D7DBE]/10 border-[#7D7DBE]/30',
  green: 'text-green-400 bg-green-500/10 border-green-500/30',
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  red: 'text-red-400 bg-red-500/10 border-red-500/30',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

export const StatCard = ({
  label,
  value,
  icon: Icon,
  color = 'cyan',
  sub,
  trend,
  animate = true
}: StatCardProps) => {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 hover:border-[#00F2FF]/30 transition-all duration-300 p-6 backdrop-blur-sm"
    >
      {/* Animated Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#00F2FF]/0 via-[#00F2FF]/5 to-[#00F2FF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-2">
            {label}
          </p>
          <p className="text-4xl font-black text-white tracking-tight leading-none">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] font-medium text-[#B8BCE6] mt-3 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-current opacity-40" />
              {sub}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={clsx(
                'text-[10px] font-bold',
                trend.isUp ? 'text-green-400' : 'text-red-400'
              )}>
                {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-[9px] text-[#7D7DBE]">vs last period</span>
            </div>
          )}
        </div>

        <div className={clsx(
          'p-3.5 rounded-2xl border backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg',
          colorMap[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};