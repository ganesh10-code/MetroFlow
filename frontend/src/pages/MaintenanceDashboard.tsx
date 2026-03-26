import { useEffect, useState } from 'react';
import { Wrench, CheckCircle, AlertTriangle, HelpCircle, Activity, Zap, Gauge, Clock, Shield, AlertOctagon, Battery, Thermometer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../config/axios';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';

interface Train {
  train_id: string;
  rolling_stock_status: string;
  urgency_level: string;
  highest_open_job_priority: string;
  last_maintenance?: string;
  next_maintenance_due?: string;
  health_score?: number;
  component_status?: {
    brakes?: string;
    engine?: string;
    electrical?: string;
    hvac?: string;
  };
}

const STATUS_OPTIONS = ['OK', 'MAINTENANCE_REQUIRED', 'UNKNOWN'];

const MaintenanceDashboard = () => {
  const [trains, setTrains] = useState<Train[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [expandedTrain, setExpandedTrain] = useState<string | null>(null);

  useEffect(() => { fetchTrains(); }, []);

  const fetchTrains = async () => {
    try {
      const res = await api.get('/maintenance/trains');
      setTrains(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (trainId: string, status: string) => {
    setUpdating(trainId);
    try {
      await api.put(`/maintenance/trains/${trainId}`, { rolling_stock_status: status });
      await fetchTrains();
    } catch { }
    finally { setUpdating(null); }
  };

  const grouped = {
    repair: trains.filter(t => t.rolling_stock_status === 'MAINTENANCE_REQUIRED'),
    unknown: trains.filter(t => !t.rolling_stock_status || t.rolling_stock_status === 'UNKNOWN'),
    ok: trains.filter(t => t.rolling_stock_status === 'OK'),
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredTrains = (trainsList: Train[]) => {
    return trainsList.filter(train => {
      const matchesSearch = train.train_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || train.rolling_stock_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const Section = ({ title, trains: list, icon: Icon, accent, description, gradient }: any) => {
    const filtered = filteredTrains(list);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl ${accent} bg-opacity-10 border border-current`}>
            <Icon className={`w-4 h-4 ${accent}`} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">{title}</h2>
            {description && <p className="text-[9px] text-[#7D7DBE] mt-0.5">{description}</p>}
          </div>
          <div className={`ml-auto px-3 py-1 rounded-full text-[9px] font-black ${accent} bg-opacity-10 border border-current`}>
            {filtered.length} UNITS
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/40 to-[#3A3F7A]/20 border border-[#00F2FF]/10 backdrop-blur-sm p-8 text-center">
            <CheckCircle className="w-8 h-8 text-[#7D7DBE]/30 mx-auto mb-2" />
            <p className="text-sm text-[#7D7DBE]">No {title.toLowerCase()}</p>
            <p className="text-[9px] text-[#7D7DBE]/50 mt-1">All systems operational in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((train: Train, i: number) => {
                const healthScore = train.health_score ||
                  (train.rolling_stock_status === 'OK' ? 92 :
                    train.rolling_stock_status === 'MAINTENANCE_REQUIRED' ? 34 : 58);

                return (
                  <motion.div
                    key={train.train_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="relative group/card">
                      <div className={`absolute -inset-0.5 bg-gradient-to-r ${train.rolling_stock_status === 'MAINTENANCE_REQUIRED'
                          ? 'from-red-500 to-red-600'
                          : train.rolling_stock_status === 'OK'
                            ? 'from-green-500 to-emerald-600'
                            : 'from-yellow-500 to-amber-600'
                        } rounded-2xl opacity-0 group-hover/card:opacity-30 transition-opacity duration-300 blur-md`} />

                      <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/90 to-[#3A3F7A]/50 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm">
                        <div className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-xl ${train.rolling_stock_status === 'MAINTENANCE_REQUIRED'
                                    ? 'bg-red-500/10 border border-red-500/30'
                                    : train.rolling_stock_status === 'OK'
                                      ? 'bg-green-500/10 border border-green-500/30'
                                      : 'bg-yellow-500/10 border border-yellow-500/30'
                                  }`}>
                                  {train.rolling_stock_status === 'MAINTENANCE_REQUIRED' ? (
                                    <AlertOctagon className="w-4 h-4 text-red-400" />
                                  ) : train.rolling_stock_status === 'OK' ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <HelpCircle className="w-4 h-4 text-yellow-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-white text-lg tracking-tight">
                                      {train.train_id}
                                    </span>
                                    <StatusBadge
                                      status={train.rolling_stock_status || 'UNKNOWN'}
                                      size="sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-2.5 h-2.5 text-[#7D7DBE]" />
                                    <span className="text-[8px] text-[#7D7DBE] uppercase tracking-wider">
                                      Last Service: {train.last_maintenance || 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Health Score */}
                              <div className="mt-3 mb-2">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <Gauge className="w-3 h-3 text-[#00F2FF]" />
                                    <span className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-wider">
                                      Health Index
                                    </span>
                                  </div>
                                  <span className={`text-xs font-black ${getHealthScoreColor(healthScore)}`}>
                                    {healthScore}%
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-[#080B1F] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${getHealthScoreBarColor(healthScore)}`}
                                    style={{ width: `${healthScore}%` }}
                                  />
                                </div>
                              </div>

                              {/* Component Status Grid */}
                              {(train.urgency_level || train.highest_open_job_priority) && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  {train.urgency_level && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                      <AlertTriangle className="w-3 h-3 text-[#00F2FF]" />
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#7D7DBE]">URGENCY</span>
                                      <div className="ml-auto">
                                        <StatusBadge status={train.urgency_level} size="sm" />
                                      </div>
                                    </div>
                                  )}
                                  {train.highest_open_job_priority && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                      <Wrench className="w-3 h-3 text-[#00F2FF]" />
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#7D7DBE]">JOB PRIORITY</span>
                                      <div className="ml-auto">
                                        <StatusBadge status={train.highest_open_job_priority} size="sm" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Status Update Control */}
                            <div className="ml-4">
                              <div className="relative">
                                <select
                                  disabled={updating === train.train_id}
                                  defaultValue={train.rolling_stock_status || 'UNKNOWN'}
                                  onChange={e => handleUpdate(train.train_id, e.target.value)}
                                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#080B1F]/80 border border-[#00F2FF]/20 text-white outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all cursor-pointer appearance-none min-w-[140px]"
                                >
                                  {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s} className="bg-[#1A1C3D]">
                                      {s === 'OK' ? '✓ Set OK' : s === 'MAINTENANCE_REQUIRED' ? '⚠ Set REPAIR' : '❓ Set UNKNOWN'}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  {updating === train.train_id ? (
                                    <div className="w-3 h-3 border-2 border-[#00F2FF] border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <svg className="w-3 h-3 text-[#7D7DBE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )}
                                </div>
                              </div>

                              {/* Expand/Collapse Toggle */}
                              <button
                                onClick={() => setExpandedTrain(expandedTrain === train.train_id ? null : train.train_id)}
                                className="mt-2 w-full text-center text-[8px] font-bold text-[#7D7DBE] hover:text-[#00F2FF] transition-colors uppercase tracking-wider"
                              >
                                {expandedTrain === train.train_id ? '▲ Less Details' : '▼ Component Status'}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Component Details */}
                          <AnimatePresence>
                            {expandedTrain === train.train_id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 pt-4 border-t border-[#00F2FF]/10"
                              >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="p-3 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Battery className="w-3 h-3 text-[#00F2FF]" />
                                      <span className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-wider">BRAKES</span>
                                    </div>
                                    <StatusBadge status={train.component_status?.brakes || 'OK'} size="sm" />
                                  </div>
                                  <div className="p-3 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Zap className="w-3 h-3 text-[#00F2FF]" />
                                      <span className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-wider">ENGINE</span>
                                    </div>
                                    <StatusBadge status={train.component_status?.engine || 'OK'} size="sm" />
                                  </div>
                                  <div className="p-3 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Activity className="w-3 h-3 text-[#00F2FF]" />
                                      <span className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-wider">ELECTRICAL</span>
                                    </div>
                                    <StatusBadge status={train.component_status?.electrical || 'OK'} size="sm" />
                                  </div>
                                  <div className="p-3 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Thermometer className="w-3 h-3 text-[#00F2FF]" />
                                      <span className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-wider">HVAC</span>
                                    </div>
                                    <StatusBadge status={train.component_status?.hvac || 'OK'} size="sm" />
                                  </div>
                                </div>
                                {train.next_maintenance_due && (
                                  <div className="mt-3 pt-3 border-t border-[#00F2FF]/5 flex items-center justify-between">
                                    <span className="text-[8px] text-[#7D7DBE] uppercase tracking-wider">Next Maintenance Due:</span>
                                    <span className="text-[9px] font-bold text-white">{train.next_maintenance_due}</span>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );
  };

  // Calculate maintenance metrics
  const maintenanceScore = trains.length > 0
    ? Math.round((grouped.ok.length / trains.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#00F2FF]/5 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00F2FF]/20 to-[#00D2C8]/20 border border-[#00F2FF]/30">
                <Wrench className="w-6 h-6 text-[#00F2FF]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7D7DBE] bg-white/5 px-3 py-1 rounded-full">
                Rolling Stock Health Terminal
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
              Operations Maintenance
            </h1>
            <p className="text-[#B8BCE6] text-sm mt-2 font-medium max-w-2xl">
              Rolling stock health and priority intervention ledger • Predictive maintenance analytics
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
            <Activity className="w-3 h-3 text-[#00F2FF] animate-pulse" />
            <span className="text-[10px] font-bold text-[#7D7DBE] uppercase tracking-wider">
              Fleet Health: {maintenanceScore}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard
          label="Needs Repair"
          value={grouped.repair.length}
          icon={Wrench}
          color="red"
          sub="Immediate intervention"
          trend={grouped.repair.length > 0 ? { value: 15, isUp: true } : undefined}
        />
        <StatCard
          label="Inconclusive"
          value={grouped.unknown.length}
          icon={HelpCircle}
          color="yellow"
          sub="Requires inspection"
        />
        <StatCard
          label="Optimal Health"
          value={grouped.ok.length}
          icon={CheckCircle}
          color="green"
          sub="Operational ready"
          trend={maintenanceScore > 70 ? { value: 8, isUp: true } : { value: 5, isUp: false }}
        />
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search trains by ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1C3D]/60 border border-[#00F2FF]/15 rounded-xl py-3 pl-11 pr-4 text-sm text-[#E6E9FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF]/20 focus:border-[#00F2FF] transition-all placeholder:text-[#7D7DBE]/50"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2">
          {['ALL', 'OK', 'MAINTENANCE_REQUIRED', 'UNKNOWN'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${filterStatus === status
                  ? status === 'MAINTENANCE_REQUIRED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : status === 'OK'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                      : status === 'UNKNOWN'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                        : 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                  : 'bg-transparent text-[#7D7DBE] border border-[#00F2FF]/10 hover:border-[#00F2FF]/30 hover:text-white'
                }`}
            >
              {status === 'MAINTENANCE_REQUIRED' ? 'NEEDS REPAIR' : status}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-10 mt-2">
        <Section
          title="CRITICAL: NEEDS REPAIR"
          trains={grouped.repair}
          icon={AlertTriangle}
          accent="text-red-400"
          description="Immediate intervention required - high priority"
          gradient="from-red-500/20 to-transparent"
        />
        <Section
          title="ATTENTION: INCONCLUSIVE"
          trains={grouped.unknown}
          icon={HelpCircle}
          accent="text-yellow-400"
          description="Awaiting diagnostic verification"
        />
        <Section
          title="VERIFIED: OPTIMAL HEALTH"
          trains={grouped.ok}
          icon={CheckCircle}
          accent="text-green-400"
          description="Operational and fully compliant"
        />
      </div>

      {/* Maintenance Overview Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap gap-4 justify-center pt-6 pb-4"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Shield className="w-3 h-3 text-green-400" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Fleet Availability: {maintenanceScore}%
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Wrench className="w-3 h-3 text-red-400" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Open Work Orders: {grouped.repair.length + grouped.unknown.length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Zap className="w-3 h-3 text-[#00F2FF]" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Predictive Alerts: {grouped.repair.length > 0 ? 'Active' : 'None'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceDashboard;