import { clsx } from 'clsx';

type StatusType =
  | 'OK' | 'READY' | 'FIT' | 'LOW'
  | 'UNKNOWN' | 'PENDING' | 'NOT VERIFIED' | 'GENERATED'
  | 'MAINTENANCE_REQUIRED' | 'UNSAFE' | 'ERROR' | 'HIGH'
  | 'HOLD' | 'LOCKED'
  | 'INDUCT'
  | 'BRANDING'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
  animated?: boolean;
}

const getConfig = (status: string) => {
  const s = status?.toUpperCase();
  if (['OK', 'READY', 'FIT', 'INDUCT', 'LOW'].includes(s))
    return {
      color: 'bg-green-500/10 text-green-400 border-green-500/30',
      dot: 'bg-green-400',
      glow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]'
    };
  if (['UNKNOWN', 'PENDING', 'NOT VERIFIED', 'GENERATED'].includes(s))
    return {
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      dot: 'bg-yellow-400',
      glow: 'shadow-[0_0_8px_rgba(234,179,8,0.5)]'
    };
  if (['MAINTENANCE_REQUIRED', 'UNSAFE', 'ERROR', 'HIGH', 'HOLD'].includes(s))
    return {
      color: 'bg-red-500/10 text-red-400 border-red-500/30',
      dot: 'bg-red-400',
      glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    };
  if (['LOCKED'].includes(s))
    return {
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      dot: 'bg-purple-400',
      glow: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]'
    };
  return {
    color: 'bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/30',
    dot: 'bg-[#00F2FF]',
    glow: 'shadow-[0_0_8px_rgba(0,242,255,0.5)]'
  };
};

export const StatusBadge = ({ status, size = 'sm', animated = true }: StatusBadgeProps) => {
  const { color, dot, glow } = getConfig(status || 'UNKNOWN');
  return (
    <span className={clsx(
      'inline-flex items-center gap-2 font-bold rounded-full border uppercase tracking-wider backdrop-blur-sm',
      size === 'sm' ? 'px-2.5 py-1 text-[9px]' : 'px-4 py-2 text-[11px]',
      color
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dot, animated && 'animate-pulse', glow)} />
      {status || 'UNKNOWN'}
    </span>
  );
};