import { useEffect, useState } from 'react';
import { History, ChevronDown, ChevronRight, Lock, Calendar, Zap, FileText, Archive, Search, Filter, TrendingUp, TrendingDown, Clock, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';

interface PlanSummary {
  id: number;
  date: string;
  created_at: string;
  created_by: number;
  status: string;
  is_locked: boolean;
  total_trains: number;
  selected_count: number;
  confidence_score: number;
  override_count: number;
}

interface PlanDetail {
  id: number;
  train_id: string;
  decision: string;
  risk_score: number;
  override_flag: boolean;
  remarks: string;
  overridden_at: string;
}

interface PlanFull extends PlanSummary {
  explanation: string;
  summary: string;
  details: PlanDetail[];
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [planDetails, setPlanDetails] = useState<Record<number, PlanFull>>({});
  const [loading, setLoading] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/planner/history');
      setPlans(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = async (planId: number) => {
    if (expanded === planId) {
      setExpanded(null);
      return;
    }
    setExpanded(planId);
    if (!planDetails[planId]) {
      setLoading(planId);
      try {
        const res = await api.get(`/planner/history/${planId}`);
        setPlanDetails(p => ({ ...p, [planId]: res.data }));
      } catch { }
      finally { setLoading(null); }
    }
  };

  const locked = plans.filter(p => p.is_locked).length;
  const totalOverrides = plans.reduce((s, p) => s + (p.override_count || 0), 0);
  const avgConfidence = plans.length > 0
    ? Math.round(plans.reduce((s, p) => s + (p.confidence_score || 0), 0) / plans.length * 100)
    : 0;

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.id.toString().includes(searchTerm) ||
      plan.date.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#00F2FF]/5 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00F2FF]/20 to-[#00D2C8]/20 border border-[#00F2FF]/30">
                <Archive className="w-6 h-6 text-[#00F2FF]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7D7DBE] bg-white/5 px-3 py-1 rounded-full">
                Historical Analytics Terminal
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
              Operations Archive
            </h1>
            <p className="text-[#B8BCE6] text-sm mt-2 font-medium max-w-2xl">
              Longitudinal induction planning historical telemetry • AI decision audit trail
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/planner')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A1C3D]/60 border border-[#00F2FF]/20 text-[#E6E9FF] hover:text-white hover:border-[#00F2FF]/40 transition-all text-sm font-semibold backdrop-blur-sm group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Back to Control Center
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <StatCard
          label="Total Plans"
          value={plans.length}
          icon={History}
          color="cyan"
          sub="Historical records"
        />
        <StatCard
          label="Locked Archive"
          value={locked}
          icon={Lock}
          color="lavender"
          sub="Finalized plans"
        />
        <StatCard
          label="Human Overrides"
          value={totalOverrides}
          icon={Zap}
          color="yellow"
          sub="Manual interventions"
        />
        <StatCard
          label="Avg. Confidence"
          value={`${avgConfidence}%`}
          icon={TrendingUp}
          color="green"
          sub="AI prediction accuracy"
          trend={avgConfidence > 75 ? { value: 8, isUp: true } : { value: 3, isUp: false }}
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
            placeholder="Search by Plan ID or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1C3D]/60 border border-[#00F2FF]/15 rounded-xl py-3 pl-11 pr-4 text-sm text-[#E6E9FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF]/20 focus:border-[#00F2FF] transition-all placeholder:text-[#7D7DBE]/50"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE]" />
        </div>

        <div className="flex gap-2">
          {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${statusFilter === status
                  ? status === 'APPROVED'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    : status === 'REJECTED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : status === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                        : 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                  : 'bg-transparent text-[#7D7DBE] border border-[#00F2FF]/10 hover:border-[#00F2FF]/30 hover:text-white'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Plans List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="space-y-4"
      >
        {filteredPlans.length === 0 && (
          <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/40 to-[#3A3F7A]/20 border border-[#00F2FF]/10 backdrop-blur-sm p-16 text-center">
            <Archive className="w-16 h-16 text-[#7D7DBE]/20 mx-auto mb-4" />
            <p className="text-sm font-bold text-[#7D7DBE] uppercase tracking-[0.2em]">No historical data points detected</p>
            <p className="text-[10px] text-[#7D7DBE]/50 mt-2">Generate your first plan from the control center</p>
            <button
              onClick={() => navigate('/planner')}
              className="mt-6 px-6 py-2 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] text-xs font-bold uppercase tracking-wider hover:bg-[#00F2FF]/20 transition-all"
            >
              Create New Plan →
            </button>
          </div>
        )}

        <AnimatePresence>
          {filteredPlans.map((plan, idx) => {
            const isOpen = expanded === plan.id;
            const detail = planDetails[plan.id];
            const confidencePercent = plan.confidence_score != null ? Math.round(plan.confidence_score * 100) : 0;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="relative group/plan">
                  {/* Hover Glow Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] rounded-2xl opacity-0 group-hover/plan:opacity-20 transition-opacity duration-500 blur-xl" />

                  <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/90 to-[#3A3F7A]/50 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm">
                    {/* Header Row */}
                    <button
                      onClick={() => toggleExpand(plan.id)}
                      className="w-full px-6 py-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left group"
                    >
                      <div className="shrink-0">
                        <div className={`p-1.5 rounded-lg transition-all duration-300 ${isOpen ? 'bg-[#00F2FF]/20' : 'group-hover:bg-white/5'}`}>
                          {isOpen ? (
                            <ChevronDown className="w-5 h-5 text-[#00F2FF]" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-[#7D7DBE] group-hover:text-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-4 text-sm items-center">
                        {/* Plan ID */}
                        <div>
                          <p className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-1">Plan ID</p>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-[#00F2FF]" />
                            <p className="font-black text-white tracking-tight">MF-{plan.id}</p>
                          </div>
                        </div>

                        {/* Date */}
                        <div>
                          <p className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-1">Timestamp</p>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-[#7D7DBE]" />
                            <p className="text-text-secondary font-mono text-xs">{plan.date}</p>
                          </div>
                        </div>

                        {/* Inducted Count */}
                        <div>
                          <p className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-1">Inducted</p>
                          <p className="text-green-400 font-black text-lg leading-none">
                            {plan.selected_count}
                            <span className="text-[#7D7DBE] text-xs font-bold ml-1">/{plan.total_trains}</span>
                          </p>
                        </div>

                        {/* Confidence Score */}
                        <div>
                          <p className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-1">Confidence</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#080B1F] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${confidencePercent >= 80 ? 'bg-green-500' :
                                    confidencePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                style={{ width: `${confidencePercent}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${getConfidenceColor(plan.confidence_score || 0)}`}>
                              {confidencePercent}%
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <p className="text-[8px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] mb-1">Audit Status</p>
                          <StatusBadge status={plan.status} size="sm" />
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2">
                          {plan.is_locked && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
                              <Lock className="w-3 h-3 text-purple-400" />
                              <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">Locked</span>
                            </div>
                          )}
                          {plan.override_count > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                              <Zap className="w-3 h-3 text-yellow-400" />
                              <span className="text-[8px] font-bold text-yellow-400 uppercase tracking-wider">
                                {plan.override_count} Override{plan.override_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-2 justify-end">
                          <Clock className="w-3 h-3 text-[#7D7DBE]" />
                          <span className="text-[9px] text-[#7D7DBE]">
                            {new Date(plan.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <div className="overflow-hidden border-t border-[#00F2FF]/10 bg-gradient-to-b from-[#080B1F]/60 to-transparent">
                            {loading === plan.id ? (
                              <div className="px-8 py-16 text-center">
                                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[#1A1C3D]/60 border border-[#00F2FF]/20">
                                  <div className="w-4 h-4 border-2 border-[#00F2FF] border-t-transparent rounded-full animate-spin" />
                                  <span className="text-[10px] font-black text-[#7D7DBE] uppercase tracking-[0.2em]">
                                    Retrieving Archived Telemetry...
                                  </span>
                                </div>
                              </div>
                            ) : detail ? (
                              <div>
                                {/* Explanation Section */}
                                {detail.explanation && (
                                  <div className="px-8 py-6 border-b border-[#00F2FF]/10 bg-gradient-to-r from-[#00F2FF]/5 to-transparent">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="p-1.5 rounded-lg bg-[#00F2FF]/10">
                                        <Shield className="w-3.5 h-3.5 text-[#00F2FF]" />
                                      </div>
                                      <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                        Operational Rationale
                                      </p>
                                    </div>
                                    <p className="text-sm text-[#B8BCE6] leading-relaxed font-medium italic border-l-2 border-[#00F2FF]/30 pl-4">
                                      {detail.explanation}
                                    </p>
                                  </div>
                                )}

                                {/* Details Table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-[9px] text-[#7D7DBE] uppercase tracking-[0.2em] font-black border-b border-[#00F2FF]/10 bg-[#080B1F]/50">
                                        <th className="px-8 py-4 text-left">Unit Identifier</th>
                                        <th className="px-8 py-4 text-left">Directive</th>
                                        <th className="px-8 py-4 text-left">Risk Matrix</th>
                                        <th className="px-8 py-4 text-left">Audit Trail</th>
                                        <th className="px-8 py-4 text-left">Operational Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#00F2FF]/5">
                                      <AnimatePresence>
                                        {detail.details.map((d, idx) => (
                                          <motion.tr
                                            key={d.train_id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className={`hover:bg-white/[0.02] transition-colors ${d.override_flag ? 'bg-yellow-500/5' : ''
                                              }`}
                                          >
                                            <td className="px-8 py-4">
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00F2FF]/20 to-[#00D2C8]/20 border border-[#00F2FF]/30 flex items-center justify-center">
                                                  <span className="text-[10px] font-black text-[#00F2FF]">
                                                    {d.train_id.charAt(0)}
                                                  </span>
                                                </div>
                                                <span className="font-bold text-white">{d.train_id}</span>
                                              </div>
                                            </td>
                                            <td className="px-8 py-4">
                                              <StatusBadge status={d.decision} size="sm" />
                                            </td>
                                            <td className="px-8 py-4">
                                              <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 bg-[#080B1F] rounded-full overflow-hidden">
                                                  <div
                                                    className={`h-full rounded-full ${(d.risk_score || 0) >= 0.7 ? 'bg-red-500' :
                                                        (d.risk_score || 0) >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                                      }`}
                                                    style={{ width: `${((d.risk_score || 0) * 100)}%` }}
                                                  />
                                                </div>
                                                <span className="font-mono text-[10px] text-[#B8BCE6]">
                                                  {(d.risk_score || 0).toFixed(3)}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-8 py-4">
                                              {d.override_flag ? (
                                                <div className="flex items-center gap-1.5">
                                                  <Zap className="w-3 h-3 text-yellow-400" />
                                                  <span className="text-yellow-400 font-black uppercase tracking-wider text-[9px]">
                                                    Manual Override
                                                  </span>
                                                  {d.overridden_at && (
                                                    <span className="text-[8px] text-[#7D7DBE]">
                                                      {new Date(d.overridden_at).toLocaleDateString()}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-1.5">
                                                  <CheckCircle2 className="w-3 h-3 text-[#00F2FF]/50" />
                                                  <span className="text-[#7D7DBE] text-[9px] font-black uppercase tracking-wider">
                                                    Automated
                                                  </span>
                                                </div>
                                              )}
                                            </td>
                                            <td className="px-8 py-4">
                                              <div className="group/remark">
                                                <p className="text-[#B8BCE6] italic text-xs max-w-[250px] truncate group-hover/remark:whitespace-normal group-hover/remark:break-all transition-all">
                                                  {d.remarks || '—'}
                                                </p>
                                              </div>
                                            </td>
                                          </motion.tr>
                                        ))}
                                      </AnimatePresence>
                                    </tbody>
                                  </table>
                                </div>

                                {/* Summary Footer */}
                                {detail.summary && (
                                  <div className="px-8 py-4 border-t border-[#00F2FF]/10 bg-[#080B1F]/30">
                                    <div className="flex items-center gap-2">
                                      <AlertCircle className="w-3 h-3 text-[#7D7DBE]" />
                                      <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">Summary:</span>
                                      <span className="text-xs text-[#B8BCE6]">{detail.summary}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Footer Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-4 justify-center pt-6 pb-4"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <History className="w-3 h-3 text-[#00F2FF]" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Total Records: {plans.length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Lock className="w-3 h-3 text-purple-400" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Locked Archives: {locked}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Total Overrides: {totalOverrides}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default HistoryPage;