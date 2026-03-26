import React, { useEffect, useState } from 'react';
import {
  Train, CheckCircle, Wrench, ShieldCheck, RefreshCw, Lock, Zap,
  MessageSquare, Send, History, Edit, Brain, Sparkles, Target,
  TrendingUp, TrendingDown, Activity, AlertOctagon, BarChart3,
  Clock, Shield, Gauge, GitBranch, Cpu, Database, ArrowRight,
  Award, Crown, Star, Rocket, Compass, Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import api from '../config/axios';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';

interface TrainData {
  train_id: string;
  rolling_stock_status: string;
  compliance_status: string;
  penalty_risk_level: string;
  urgency_level: string;
  signalling_status: string;
  telecom_status: string;
  advertiser_name: string;
  health_score?: number;
  predicted_failure?: number;
  last_maintenance?: string;
}

interface PlanDetail {
  id: number;
  train_id: string;
  decision: string;
  risk_score: number;
  override_flag: boolean;
  remarks: string;
  confidence_band?: number;
}

interface GeneratedPlan {
  plan_id: number;
  date: string;
  status: string;
  is_locked?: boolean;
  total_trains: number;
  selected_count: number;
  confidence_score: number;
  explanation: string;
  details: PlanDetail[];
  execution_time_ms?: number;
  optimization_metric?: number;
}

const PlannerDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [trains, setTrains] = useState<TrainData[]>([]);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [locking, setLocking] = useState(false);
  const [overrideTrainId, setOverrideTrainId] = useState<string | null>(null);
  const [overrideDecision, setOverrideDecision] = useState('HOLD');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [chatLog, setChatLog] = useState<{ role: string; msg: string }[]>([]);
  const [query, setQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'predictions'>('overview');
  const [hoveredTrain, setHoveredTrain] = useState<string | null>(null);

  useEffect(() => { fetchSummary(); fetchTrains(); }, []);

  const fetchSummary = async () => {
    try { const res = await api.get('/planner/summary'); setSummary(res.data); }
    catch (e) { console.error(e); }
  };

  const fetchTrains = async () => {
    try { const res = await api.get('/planner/trains'); setTrains(res.data); }
    catch (e) { console.error(e); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try { const res = await api.post('/planner/generate-plan'); setPlan(res.data); }
    catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  const handleLock = async () => {
    if (!plan) return;
    setLocking(true);
    try { await api.post(`/planner/lock-plan/${plan.plan_id}`); setPlan(p => p ? { ...p, status: 'LOCKED', is_locked: true } : p); }
    catch (e) { console.error(e); }
    finally { setLocking(false); }
  };

  const handleOverrideSave = async () => {
    if (!plan || !overrideTrainId) return;
    setSavingOverride(true);
    try {
      await api.post('/planner/override', { plan_id: plan.plan_id, train_id: overrideTrainId, decision: overrideDecision, remarks: overrideRemarks });
      const updated = { ...plan, details: plan.details.map(d => d.train_id === overrideTrainId ? { ...d, decision: overrideDecision, override_flag: true, remarks: overrideRemarks } : d) };
      const inducted = updated.details.filter(d => d.decision === 'INDUCT').length;
      setPlan({ ...updated, selected_count: inducted });
      setOverrideTrainId(null); setOverrideRemarks('');
    } catch { }
    finally { setSavingOverride(false); }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const msg = query;
    setChatLog(l => [...l, { role: 'user', msg }]);
    setQuery('');
    setChatLoading(true);
    try {
      const res = await api.post('/planner/assistant', { query: msg, plan_id: plan?.plan_id });
      setChatLog(l => [...l, { role: 'ai', msg: res.data.response }]);
    } catch { }
    finally { setChatLoading(false); }
  };

  const filteredTrains = trains.filter(t => t.train_id.toLowerCase().includes(search.toLowerCase()));

  const chartData = summary ? [
    { name: 'Maintenance', ready: summary.maintenance?.ready || 0, pending: summary.maintenance?.maintenance_required || 0 },
    { name: 'Fitness', ready: summary.fitness?.fit || 0, pending: summary.fitness?.not_verified || 0 },
    { name: 'Branding', ready: summary.branding?.low_risk || 0, pending: summary.branding?.high_risk || 0 },
  ] : [];

  const readinessScore = summary ? Math.round((summary.ready_for_induction / summary.total_trains) * 100) : 0;

  const generateTrendData = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: `Week ${i + 1}`,
      efficiency: 65 + Math.random() * 25,
      predicted: 70 + Math.random() * 20,
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header Section - Premium Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1C3D] via-[#3A3F7A] to-[#1A1C3D] p-8"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FF]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00D2C8]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] shadow-[0_0_30px_rgba(0,242,255,0.3)] animate-pulse-glow">
                <Brain className="w-6 h-6 text-[#080B1F]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00F2FF] bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  AI Neural Core v4.2
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7D7DBE] bg-white/5 px-3 py-1 rounded-full">
                  Real-Time Inference
                </span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              <span className="text-white">Induction</span>
              <br />
              <span className="bg-gradient-to-r from-[#00F2FF] via-[#00D2C8] to-[#7D7DBE] bg-clip-text text-transparent">
                Intelligence Core
              </span>
            </h1>
            <p className="text-[#B8BCE6] text-base mt-3 font-medium max-w-2xl">
              Strategic train induction & lifecycle analytics powered by predictive AI algorithms
            </p>
          </div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/planner/history')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-[#00F2FF]/20 text-[#E6E9FF] hover:text-white hover:border-[#00F2FF]/40 transition-all text-sm font-semibold backdrop-blur-sm group"
            >
              <History className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Archive Logs
            </motion.button>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-4 right-8 flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
            <Activity className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-white">System Nominal</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
            <Cpu className="w-3 h-3 text-[#00F2FF]" />
            <span className="text-[9px] font-mono text-white">Inference Ready</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards - Enhanced Premium */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <StatCard
            label="Fleet Capacity"
            value={summary.total_trains}
            icon={Train}
            color="cyan"
            sub="Total active rolling stock"
            trend={{ value: 5, isUp: true }}
          />
          <StatCard
            label="Readiness Index"
            value={`${readinessScore}%`}
            icon={Target}
            color="green"
            sub="Compliance verified"
            trend={{ value: 12, isUp: true }}
          />
          <StatCard
            label="Maintenance Flag"
            value={summary.maintenance_pending}
            icon={Wrench}
            color="red"
            sub="Intervention required"
          />
          <StatCard
            label="AI Confidence"
            value={plan ? `${Math.round(plan.confidence_score * 100)}%` : '—'}
            icon={Brain}
            color="purple"
            sub={plan ? "Current plan confidence" : "Awaiting generation"}
          />
        </motion.div>
      )}

      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 border-b border-[#00F2FF]/10 pb-2"
      >
        {[
          { id: 'overview', label: 'Strategic Overview', icon: Compass },
          { id: 'analytics', label: 'Predictive Analytics', icon: TrendingUp },
          { id: 'predictions', label: 'AI Forecast', icon: Rocket },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab.id
                ? 'bg-gradient-to-r from-[#00F2FF]/20 to-[#00D2C8]/20 text-[#00F2FF] border border-[#00F2FF]/30 shadow-[0_0_20px_rgba(0,242,255,0.1)]'
                : 'text-[#7D7DBE] hover:text-white hover:bg-white/5'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Middle Section: Analytics + Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Enhanced Readiness Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-3 rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-[#00F2FF]" />
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                  Fleet Performance Matrix
                </h2>
              </div>
              <p className="text-[9px] text-[#7D7DBE]">Real-time operational readiness metrics</p>
            </div>
            <div className="flex gap-4 text-[9px] font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Optimal</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={12} barCategoryGap={20}>
                <XAxis dataKey="name" tick={{ fill: '#7D7DBE', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7D7DBE', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,242,255,0.05)' }}
                  contentStyle={{
                    backgroundColor: '#1A1C3D',
                    border: '1px solid rgba(0,242,255,0.2)',
                    borderRadius: 12,
                    color: '#E6E9FF',
                    fontSize: 10,
                    fontWeight: 'bold',
                    backdropFilter: 'blur(8px)'
                  }}
                />
                <Bar dataKey="ready" name="Optimal" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" name="Critical" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Database className="w-8 h-8 text-[#7D7DBE]/30 animate-pulse" />
                <p className="text-[10px] text-[#7D7DBE] uppercase tracking-wider">Loading telemetry data...</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Premium Generate Plan Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm p-6 flex flex-col"
        >
          <div className="space-y-4">
            <div className="p-3 inline-flex rounded-xl bg-gradient-to-br from-[#00F2FF]/20 to-[#00D2C8]/20 border border-[#00F2FF]/30">
              <Sparkles className="w-6 h-6 text-[#00F2FF]" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Strategic Generator</h2>
            <p className="text-xs text-[#B8BCE6] leading-relaxed">
              Execute AI Core optimization to calculate the optimal induction sequence based on real-time fleet health, predictive failure models, and operational constraints.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={generating || plan?.is_locked}
              className="relative group w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] text-[#080B1F] font-black text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-40 overflow-hidden shadow-[0_0_30px_rgba(0,242,255,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="relative z-10">CALCULATING OPTIMAL PATH...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">EXECUTE AI OPTIMIZER</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>

            {plan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-[#080B1F]/60 border border-[#00F2FF]/20 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#00F2FF]" />
                    <span className="text-[9px] font-black text-[#7D7DBE] uppercase tracking-wider">Plan ID</span>
                  </div>
                  <span className="text-white font-mono text-sm font-black tracking-tight bg-[#00F2FF]/10 px-3 py-1 rounded-lg border border-[#00F2FF]/30">
                    MF-{plan.plan_id}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#7D7DBE]">Strategy Confidence</span>
                    <span className="text-lg font-black text-white">
                      {((plan.confidence_score ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#080B1F] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((plan.confidence_score ?? 0) * 100).toFixed(0)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${(plan.confidence_score ?? 0) >= 0.7 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          (plan.confidence_score ?? 0) >= 0.4 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                            'bg-gradient-to-r from-red-500 to-rose-500'
                        } shadow-[0_0_10px_currentColor]`}
                    />
                  </div>
                  <p className="text-[8px] text-[#7D7DBE] italic mt-1">
                    {plan.execution_time_ms && `Execution: ${plan.execution_time_ms}ms • `}
                    Induction ratio: {plan.selected_count}/{plan.total_trains}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <StatusBadge status={plan.status} size="md" />
                  {!plan.is_locked ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLock}
                      disabled={locking}
                      className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/30 transition-all"
                    >
                      <Lock className="w-3 h-3" />
                      {locking ? 'SEALING...' : 'SEAL PLAN'}
                    </motion.button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-purple-400">
                      <Lock className="w-3 h-3" /> SEALED ARCHIVE
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Live Train Overview - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm"
      >
        <div className="px-8 py-5 border-b border-[#00F2FF]/10 bg-gradient-to-r from-[#00F2FF]/5 to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-[#00F2FF] animate-pulse" />
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Real-Time Telemetry</h2>
            </div>
            <p className="text-[9px] text-[#7D7DBE]">Live fleet health status with predictive alerts</p>
          </div>
          <div className="relative group">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by ID or status..."
              className="pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl bg-[#080B1F]/80 border border-[#00F2FF]/20 text-white outline-none w-64 focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all placeholder:text-[#7D7DBE]/50"
            />
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] text-[#7D7DBE] uppercase tracking-[0.2em] font-black border-b border-[#00F2FF]/10 bg-[#080B1F]/30">
                <th className="px-6 py-4 text-left">Unit ID</th>
                <th className="px-6 py-4 text-left">Health Index</th>
                <th className="px-6 py-4 text-left">Propulsion</th>
                <th className="px-6 py-4 text-left">Fitness</th>
                <th className="px-6 py-4 text-left">Risk Level</th>
                <th className="px-6 py-4 text-left">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00F2FF]/5">
              <AnimatePresence>
                {filteredTrains.slice(0, 5).map((t, idx) => (
                  <motion.tr
                    key={t.train_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ backgroundColor: 'rgba(0,242,255,0.02)' }}
                    onMouseEnter={() => setHoveredTrain(t.train_id)}
                    onMouseLeave={() => setHoveredTrain(null)}
                    className="transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00F2FF]/20 to-[#00D2C8]/20 border border-[#00F2FF]/30 flex items-center justify-center">
                          <Train className="w-3.5 h-3.5 text-[#00F2FF]" />
                        </div>
                        <span className="font-bold text-white">{t.train_id}</span>
                        {hoveredTrain === t.train_id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-pulse"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-[#080B1F] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(t.health_score || 85) >= 80 ? 'bg-green-500' : (t.health_score || 85) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${t.health_score || 85}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[#B8BCE6]">{t.health_score || 85}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={t.rolling_stock_status || 'UNKNOWN'} size="sm" /></td>
                    <td className="px-6 py-4"><StatusBadge status={t.compliance_status || 'NOT VERIFIED'} size="sm" /></td>
                    <td className="px-6 py-4"><StatusBadge status={t.penalty_risk_level || 'LOW'} size="sm" /></td>
                    <td className="px-6 py-4"><StatusBadge status={t.urgency_level || 'UNKNOWN'} size="sm" /></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredTrains.length > 5 && (
            <div className="px-6 py-3 border-t border-[#00F2FF]/10 text-center">
              <button className="text-[9px] text-[#00F2FF] hover:text-[#00D2C8] transition-colors font-bold uppercase tracking-wider">
                +{filteredTrains.length - 5} more units
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Plan Details Section - Premium */}
      <AnimatePresence mode="wait">
        {plan && (
          <motion.div
            key={plan.plan_id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            {/* Enhanced Plan Details Table */}
            <div className="xl:col-span-2 rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-5 border-b border-[#00F2FF]/10 bg-gradient-to-r from-[#00F2FF]/5 to-transparent flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="w-4 h-4 text-[#00F2FF]" />
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                      Calculated Plan MF-{plan.plan_id}
                    </h2>
                  </div>
                  <p className="text-[9px] text-[#7D7DBE]">AI-generated induction sequence with confidence bands</p>
                </div>
                {plan.is_locked && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <Lock className="w-3 h-3 text-purple-400" />
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider">Protected Archive</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-[#7D7DBE] uppercase tracking-[0.2em] font-black border-b border-[#00F2FF]/10 bg-[#080B1F]/30">
                      <th className="px-6 py-4 text-left">Unit</th>
                      <th className="px-6 py-4 text-left">Directive</th>
                      <th className="px-6 py-4 text-left">Risk Score</th>
                      <th className="px-6 py-4 text-left">Confidence</th>
                      <th className="px-6 py-4 text-left">State</th>
                      {!plan.is_locked && <th className="px-6 py-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#00F2FF]/5">
                    <AnimatePresence>
                      {plan.details.map((d, idx) => (
                        <motion.tr
                          key={d.train_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          whileHover={{ backgroundColor: 'rgba(0,242,255,0.02)' }}
                          className={`transition-colors ${d.override_flag ? 'bg-yellow-500/5' : ''}`}
                        >
                          <td className="px-6 py-4 font-bold text-white">{d.train_id}</td>
                          <td className="px-6 py-4"><StatusBadge status={d.decision} size="sm" /></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-[#080B1F] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${(d.risk_score || 0) >= 0.7 ? 'bg-red-500' : (d.risk_score || 0) >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${((d.risk_score || 0) * 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] text-[#B8BCE6]">{(d.risk_score || 0).toFixed(3)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-[#7D7DBE]" />
                              <span className="text-[10px] text-[#B8BCE6]">{((d.confidence_band || 0.85) * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {d.override_flag ? (
                              <span className="flex items-center gap-1.5 text-yellow-400 text-[9px] font-black uppercase tracking-wider">
                                <Edit className="w-3 h-3" /> Manual Override
                              </span>
                            ) : (
                              <span className="text-[#7D7DBE] text-[9px] font-black uppercase tracking-wider opacity-50">Auto-Generated</span>
                            )}
                          </td>
                          {!plan.is_locked && (
                            <td className="px-6 py-4 text-right">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setOverrideTrainId(d.train_id);
                                  setOverrideDecision(d.decision === 'INDUCT' ? 'HOLD' : 'INDUCT');
                                  setOverrideRemarks('');
                                }}
                                className="text-[9px] font-black uppercase tracking-wider text-[#7D7DBE] hover:text-yellow-400 transition-all border border-[#00F2FF]/20 px-3 py-1.5 rounded-lg hover:border-yellow-500/30 hover:bg-yellow-500/10"
                              >
                                Override
                              </motion.button>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Sidebar - Rationale & Chat */}
            <div className="space-y-6">
              {/* AI Rationale Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm p-6 border-l-[3px] border-l-[#00F2FF]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-[#00F2FF]" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Plan Rationale</h3>
                </div>
                <p className="text-xs text-[#B8BCE6] leading-relaxed font-medium italic">
                  "{plan.explanation || 'Directing induction sequence based on optimal fleet health metrics, predictive failure models, and operational constraints.'}"
                </p>
                <div className="mt-3 flex items-center gap-2 text-[8px] text-[#7D7DBE]">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI-generated recommendation • Real-time optimized</span>
                </div>
              </motion.div>

              {/* Premium AI Assistant Chat */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm flex flex-col h-[420px]"
              >
                <div className="px-5 py-4 border-b border-[#00F2FF]/10 bg-gradient-to-r from-[#00F2FF]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30">
                      <MessageSquare className="w-4 h-4 text-[#00F2FF]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.1em]">AI Strategic Assistant</h3>
                      <p className="text-[8px] text-[#7D7DBE]">Powered by MetroFlow Neural Core</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] text-green-500">Active</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                  {chatLog.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <Brain className="w-10 h-10 text-[#7D7DBE]/20 mb-3" />
                      <p className="text-[9px] font-bold text-[#7D7DBE] uppercase tracking-wider leading-relaxed">
                        Interface operational.<br />Ask about plan logic, risk factors, or optimization strategies.
                      </p>
                    </div>
                  )}
                  <AnimatePresence>
                    {chatLog.map((c, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: c.role === 'user' ? 20 : -20, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        className={`text-[11px] font-medium leading-relaxed px-4 py-3 rounded-2xl max-w-[85%] ${c.role === 'user'
                            ? 'ml-auto bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] text-[#080B1F] rounded-br-sm'
                            : 'mr-auto bg-[#080B1F]/80 border border-[#00F2FF]/20 text-[#B8BCE6] rounded-bl-sm'
                          }`}
                      >
                        {c.msg}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {chatLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-[9px] text-[#7D7DBE] ml-2"
                    >
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>AI is analyzing...</span>
                    </motion.div>
                  )}
                </div>

                <div className="p-4 border-t border-[#00F2FF]/10 bg-[#080B1F]/40">
                  <form onSubmit={handleAsk} className="flex gap-2">
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Ask about the plan..."
                      className="flex-1 px-4 py-2.5 text-xs font-medium rounded-xl bg-[#080B1F]/80 border border-[#00F2FF]/20 text-white outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all placeholder:text-[#7D7DBE]/50"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={chatLoading}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] text-[#080B1F] hover:shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </form>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Override Modal - Premium */}
      <AnimatePresence>
        {overrideTrainId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B1F]/90 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] rounded-2xl blur-xl opacity-30" />
              <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D] to-[#3A3F7A] border border-[#00F2FF]/30 overflow-hidden shadow-2xl">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                      <Edit className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Manual Override</h3>
                      <p className="text-[9px] font-bold text-[#7D7DBE] uppercase tracking-wider mt-0.5">
                        Direct intervention: {overrideTrainId}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] ml-1">
                        New Directive
                      </label>
                      <div className="flex gap-3">
                        {['INDUCT', 'HOLD'].map(d => (
                          <motion.button
                            key={d}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setOverrideDecision(d)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${overrideDecision === d
                                ? d === 'INDUCT'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                                  : 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                : 'text-[#7D7DBE] border-[#00F2FF]/20 hover:border-[#00F2FF]/50'
                              }`}
                          >
                            {d}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] ml-1">
                        Directive Rationale
                      </label>
                      <textarea
                        value={overrideRemarks}
                        onChange={e => setOverrideRemarks(e.target.value)}
                        rows={4}
                        placeholder="Required justification for manual override..."
                        className="w-full px-4 py-3 text-xs font-medium rounded-xl bg-[#080B1F]/80 border border-[#00F2FF]/20 text-white outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all resize-none placeholder:text-[#7D7DBE]/30"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setOverrideTrainId(null)}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[#7D7DBE] hover:text-white border border-[#00F2FF]/20 hover:border-[#00F2FF]/40 transition-all"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOverrideSave}
                        disabled={savingOverride}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all disabled:opacity-50 shadow-lg bg-gradient-to-r from-[#00F2FF] to-[#00D2C8]"
                      >
                        {savingOverride ? 'Processing...' : 'Commit Change'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper Icon Component
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default PlannerDashboard;