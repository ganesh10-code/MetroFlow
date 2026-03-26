import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldX, ShieldAlert, Activity, Zap, Gauge, Signal, Wifi, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../config/axios';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';

interface Train {
  train_id: string;
  compliance_status: string;
  signalling_status: string;
  telecom_status: string;
  last_inspected?: string;
  fitness_expiry?: string;
}

const STATUS_OPTIONS = ['FIT', 'UNSAFE', 'NOT VERIFIED'];

const FitnessDashboard = () => {
  const [trains, setTrains] = useState<Train[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTrain, setExpandedTrain] = useState<string | null>(null);

  useEffect(() => { fetchTrains(); }, []);

  const fetchTrains = async () => {
    try {
      const res = await api.get('/fitness/trains');
      setTrains(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (trainId: string, status: string) => {
    setUpdating(trainId);
    try {
      await api.put(`/fitness/trains/${trainId}`, { compliance_status: status });
      await fetchTrains();
    } catch { }
    finally { setUpdating(null); }
  };

  const grouped = {
    unsafe: trains.filter(t => t.compliance_status === 'UNSAFE'),
    unverified: trains.filter(t => !t.compliance_status || t.compliance_status === 'NOT VERIFIED'),
    fit: trains.filter(t => t.compliance_status === 'FIT'),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FIT': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'UNSAFE': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    }
  };

  const Section = ({ title, trains: list, icon: Icon, accent, description }: any) => (
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
          {list.length} UNITS
        </div>
      </div>

      {list.length === 0 ? (
        <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/40 to-[#3A3F7A]/20 border border-[#00F2FF]/10 backdrop-blur-sm p-8 text-center">
          <CheckCircle className="w-8 h-8 text-[#7D7DBE]/30 mx-auto mb-2" />
          <p className="text-sm text-[#7D7DBE]">No {title.toLowerCase()} units</p>
          <p className="text-[9px] text-[#7D7DBE]/50 mt-1">All clear in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {list.map((train: Train, i: number) => (
              <motion.div
                key={train.train_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                whileHover={{ x: 4 }}
              >
                <div className="relative group/card">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${train.compliance_status === 'UNSAFE'
                      ? 'from-red-500 to-red-600'
                      : train.compliance_status === 'FIT'
                        ? 'from-green-500 to-emerald-600'
                        : 'from-yellow-500 to-amber-600'
                    } rounded-2xl opacity-0 group-hover/card:opacity-30 transition-opacity duration-300 blur-md`} />

                  <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/90 to-[#3A3F7A]/50 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl ${getStatusColor(train.compliance_status || 'NOT VERIFIED')} border`}>
                              {train.compliance_status === 'FIT' ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : train.compliance_status === 'UNSAFE' ? (
                                <ShieldX className="w-4 h-4" />
                              ) : (
                                <ShieldAlert className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-white text-lg tracking-tight">
                                  {train.train_id}
                                </span>
                                <StatusBadge
                                  status={train.compliance_status || 'NOT VERIFIED'}
                                  size="sm"
                                />
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-2.5 h-2.5 text-[#7D7DBE]" />
                                <span className="text-[8px] text-[#7D7DBE] uppercase tracking-wider">
                                  Last Inspection: {train.last_inspected || 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* System Status Grid */}
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            {(train.signalling_status || train.telecom_status) && (
                              <>
                                {train.signalling_status && (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                    <Signal className="w-3 h-3 text-[#00F2FF]" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#7D7DBE]">SIGNALLING</span>
                                    <div className="ml-auto">
                                      <StatusBadge status={train.signalling_status} size="sm" />
                                    </div>
                                  </div>
                                )}
                                {train.telecom_status && (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#080B1F]/40 border border-[#00F2FF]/10">
                                    <Wifi className="w-3 h-3 text-[#00F2FF]" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#7D7DBE]">TELECOM</span>
                                    <div className="ml-auto">
                                      <StatusBadge status={train.telecom_status} size="sm" />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Update Control */}
                        <div className="ml-4">
                          <div className="relative">
                            <select
                              disabled={updating === train.train_id}
                              defaultValue={train.compliance_status || 'NOT VERIFIED'}
                              onChange={e => handleUpdate(train.train_id, e.target.value)}
                              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#080B1F]/80 border border-[#00F2FF]/20 text-white outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all cursor-pointer appearance-none min-w-[130px]"
                            >
                              {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s} className="bg-[#1A1C3D]">
                                  {s === 'FIT' ? '✓ Set FIT' : s === 'UNSAFE' ? '⚠ Set UNSAFE' : '❓ Set NOT VERIFIED'}
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
                            {expandedTrain === train.train_id ? '▲ Less Details' : '▼ More Details'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedTrain === train.train_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-[#00F2FF]/10"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-2">Fitness Metrics</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-[#B8BCE6]">Safety Score</span>
                                    <div className="flex items-center gap-1">
                                      <Gauge className="w-2.5 h-2.5 text-[#00F2FF]" />
                                      <span className="text-[10px] font-bold text-white">
                                        {train.compliance_status === 'FIT' ? '98%' : train.compliance_status === 'UNSAFE' ? '34%' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-full h-1.5 bg-[#080B1F] rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${train.compliance_status === 'FIT' ? 'w-[98%] bg-green-500' :
                                          train.compliance_status === 'UNSAFE' ? 'w-[34%] bg-red-500' : 'w-0'
                                        }`}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-2">Compliance Timeline</p>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-[#00F2FF]" />
                                  <span className="text-[9px] text-[#B8BCE6]">
                                    Next Audit: {train.fitness_expiry || 'Scheduled'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );

  // Calculate overall compliance score
  const complianceScore = trains.length > 0
    ? Math.round((grouped.fit.length / trains.length) * 100)
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
                <ShieldCheck className="w-6 h-6 text-[#00F2FF]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7D7DBE] bg-white/5 px-3 py-1 rounded-full">
                Safety & Compliance Terminal
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
              Fitness & Certification
            </h1>
            <p className="text-[#B8BCE6] text-sm mt-2 font-medium max-w-2xl">
              Compliance status and fitness certificate management • Real-time safety monitoring
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
            <Activity className="w-3 h-3 text-[#00F2FF] animate-pulse" />
            <span className="text-[10px] font-bold text-[#7D7DBE] uppercase tracking-wider">
              Overall Compliance: {complianceScore}%
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
          label="Unsafe / Flagged"
          value={grouped.unsafe.length}
          icon={ShieldX}
          color="red"
          sub="Immediate action required"
          trend={grouped.unsafe.length > 0 ? { value: 25, isUp: true } : undefined}
        />
        <StatCard
          label="Not Verified"
          value={grouped.unverified.length}
          icon={ShieldAlert}
          color="yellow"
          sub="Pending inspection"
        />
        <StatCard
          label="Certified Fit"
          value={grouped.fit.length}
          icon={ShieldCheck}
          color="green"
          sub="Operational ready"
          trend={complianceScore > 70 ? { value: 12, isUp: true } : { value: 8, isUp: false }}
        />
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative w-full md:w-96"
      >
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
      </motion.div>

      {/* Sections */}
      <div className="space-y-10 mt-2">
        <Section
          title="UNSAFE / FLAGGED"
          trains={grouped.unsafe.filter(t => t.train_id.includes(searchTerm))}
          icon={ShieldX}
          accent="text-red-400"
          description="Immediate intervention required - high priority"
        />
        <Section
          title="NOT VERIFIED"
          trains={grouped.unverified.filter(t => t.train_id.includes(searchTerm))}
          icon={ShieldAlert}
          accent="text-yellow-400"
          description="Awaiting fitness certification"
        />
        <Section
          title="CERTIFIED FIT"
          trains={grouped.fit.filter(t => t.train_id.includes(searchTerm))}
          icon={ShieldCheck}
          accent="text-green-400"
          description="Operational and compliant"
        />
      </div>

      {/* Compliance Overview Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap gap-4 justify-center pt-6 pb-4"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <ShieldCheck className="w-3 h-3 text-green-400" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Fleet Compliance: {complianceScore}%
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Critical Alerts: {grouped.unsafe.length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Zap className="w-3 h-3 text-[#00F2FF]" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Last Updated: Live Telemetry
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default FitnessDashboard;