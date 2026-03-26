import { useEffect, useState } from 'react';
import { Megaphone, AlertTriangle, CheckCircle, Train as TrainIcon, Edit, Save, Zap, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../config/axios';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';

interface Train {
  train_id: string;
  advertiser_name: string;
  penalty_risk_level: string;
}

const BrandingDashboard = () => {
  const [trains, setTrains] = useState<Train[]>([]);
  const [advertiserInputs, setAdvertiserInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  useEffect(() => { fetchTrains(); }, []);

  const fetchTrains = async () => {
    try {
      const res = await api.get('/branding/trains');
      setTrains(res.data);
      const inputs: Record<string, string> = {};
      res.data.forEach((t: Train) => { inputs[t.train_id] = t.advertiser_name || ''; });
      setAdvertiserInputs(inputs);
    } catch (e) { console.error(e); }
  };

  const handleSave = async (trainId: string) => {
    setSaving(trainId);
    try {
      await api.put(`/branding/trains/${trainId}`, { advertiser_name: advertiserInputs[trainId] });
      await fetchTrains();
    } catch { }
    finally { setSaving(null); }
  };

  const handleRisk = async (trainId: string, risk: string) => {
    try {
      await api.put(`/branding/trains/${trainId}`, { penalty_risk_level: risk });
      await fetchTrains();
    } catch { }
  };

  const highRisk = trains.filter(t => t.penalty_risk_level === 'HIGH').length;
  const withAds = trains.filter(t => t.advertiser_name).length;
  const lowRisk = trains.length - highRisk;
  const adRate = trains.length > 0 ? Math.round((withAds / trains.length) * 100) : 0;

  const filteredTrains = trains.filter(train => {
    const matchesSearch = train.train_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (train.advertiser_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesRisk = filterRisk === 'ALL' || train.penalty_risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  });

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
                <Megaphone className="w-6 h-6 text-[#00F2FF]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7D7DBE] bg-white/5 px-3 py-1 rounded-full">
                Visual Branding Terminal
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
              Branding & Logistics
            </h1>
            <p className="text-[#B8BCE6] text-sm mt-2 font-medium max-w-2xl">
              Advertiser assignments and SLA penalty risk management • Real-time contract monitoring
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
            <Zap className="w-3 h-3 text-[#00F2FF] animate-pulse" />
            <span className="text-[10px] font-bold text-[#7D7DBE] uppercase tracking-wider">
              Active Campaigns: {withAds} / {trains.length}
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
          label="High Risk"
          value={highRisk}
          icon={AlertTriangle}
          color="red"
          sub="Penalty imminent"
          trend={highRisk > 0 ? { value: 15, isUp: true } : undefined}
        />
        <StatCard
          label="Active Advertisers"
          value={withAds}
          icon={Megaphone}
          color="cyan"
          sub={`${adRate}% of fleet`}
          trend={adRate > 50 ? { value: 8, isUp: true } : { value: 5, isUp: false }}
        />
        <StatCard
          label="Low Risk"
          value={lowRisk}
          icon={CheckCircle}
          color="green"
          sub="Compliant units"
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
            placeholder="Search by train ID or advertiser..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1C3D]/60 border border-[#00F2FF]/15 rounded-xl py-3 pl-11 pr-4 text-sm text-[#E6E9FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF]/20 focus:border-[#00F2FF] transition-all placeholder:text-[#7D7DBE]/50"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2">
          {['ALL', 'HIGH', 'LOW'].map((risk) => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${filterRisk === risk
                  ? risk === 'HIGH'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : risk === 'LOW'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                      : 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                  : 'bg-transparent text-[#7D7DBE] border border-[#00F2FF]/10 hover:border-[#00F2FF]/30 hover:text-white'
                }`}
            >
              {risk === 'ALL' ? 'All Units' : `${risk} Risk`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Trains Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl" />

        {filteredTrains.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-gradient-to-br from-[#1A1C3D]/40 to-[#3A3F7A]/20 border border-[#00F2FF]/10 backdrop-blur-sm">
            <TrainIcon className="w-16 h-16 text-[#7D7DBE]/30 mx-auto mb-4" />
            <p className="text-[#7D7DBE] text-sm font-medium">No trains match your search criteria</p>
            <button
              onClick={() => { setSearchTerm(''); setFilterRisk('ALL'); }}
              className="mt-4 text-[#00F2FF] text-xs font-bold uppercase tracking-wider hover:text-[#00D2C8] transition-colors"
            >
              Clear filters →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredTrains.map((train, i) => (
                <motion.div
                  key={train.train_id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="relative group/card">
                    {/* Animated Border Glow */}
                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${train.penalty_risk_level === 'HIGH'
                        ? 'from-red-500 to-red-600'
                        : 'from-green-500 to-emerald-600'
                      } rounded-2xl opacity-0 group-hover/card:opacity-50 transition-opacity duration-300 blur-md`} />

                    <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/90 to-[#3A3F7A]/50 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm">
                      {/* Status Indicator Bar */}
                      <div className={`h-1 w-full ${train.penalty_risk_level === 'HIGH'
                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600'
                        }`} />

                      <div className="p-6 space-y-5">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${train.penalty_risk_level === 'HIGH'
                                ? 'bg-red-500/10 border border-red-500/30'
                                : 'bg-green-500/10 border border-green-500/30'
                              }`}>
                              <TrainIcon className={`w-5 h-5 ${train.penalty_risk_level === 'HIGH' ? 'text-red-400' : 'text-green-400'
                                }`} />
                            </div>
                            <div>
                              <p className="font-black text-white text-lg tracking-tight">
                                {train.train_id}
                              </p>
                              <p className="text-[9px] text-[#7D7DBE] uppercase tracking-[0.2em] mt-0.5">
                                Rolling Stock
                              </p>
                            </div>
                          </div>
                          <StatusBadge
                            status={train.penalty_risk_level || 'LOW'}
                            size="sm"
                          />
                        </div>

                        {/* Advertiser Info */}
                        <div className="pt-2 pb-1 border-t border-[#00F2FF]/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Megaphone className="w-3 h-3 text-[#00F2FF]" />
                            <p className="text-[9px] uppercase tracking-[0.2em] text-[#7D7DBE] font-bold">
                              Current Advertiser
                            </p>
                          </div>
                          <p className="text-white font-semibold text-base">
                            {train.advertiser_name ? (
                              <span className="bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
                                {train.advertiser_name}
                              </span>
                            ) : (
                              <span className="text-[#7D7DBE] italic">Unassigned • Available Slot</span>
                            )}
                          </p>
                        </div>

                        {/* Assignment Controls */}
                        <div className="space-y-3">
                          <p className="text-[9px] uppercase tracking-[0.2em] text-[#7D7DBE] font-bold flex items-center gap-2">
                            <Edit className="w-3 h-3" />
                            Assign Advertiser
                          </p>
                          <div className="flex gap-2">
                            <input
                              value={advertiserInputs[train.train_id] || ''}
                              onChange={e => setAdvertiserInputs(p => ({ ...p, [train.train_id]: e.target.value }))}
                              placeholder="Enter advertiser name..."
                              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-[#080B1F]/80 border border-[#00F2FF]/15 text-white outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all placeholder:text-[#7D7DBE]/30"
                            />
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={saving === train.train_id}
                              onClick={() => handleSave(train.train_id)}
                              className="px-5 py-2.5 rounded-xl text-xs font-black text-[#080B1F] uppercase tracking-wider disabled:opacity-50 transition-all shadow-lg relative overflow-hidden group/btn"
                              style={{ background: 'linear-gradient(135deg, #00F2FF, #00D2C8)' }}
                            >
                              <span className="relative z-10 flex items-center gap-1">
                                {saving === train.train_id ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-[#080B1F] border-t-transparent rounded-full animate-spin" />
                                    Saving
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3 h-3" />
                                    Save
                                  </>
                                )}
                              </span>
                            </motion.button>
                          </div>

                          {/* Risk Toggle */}
                          <div className="flex gap-2 mt-2">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-[#7D7DBE] font-bold flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3" />
                              Risk Assessment
                            </p>
                            <div className="flex gap-2 ml-auto">
                              {['LOW', 'HIGH'].map(risk => (
                                <motion.button
                                  key={risk}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleRisk(train.train_id, risk)}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${train.penalty_risk_level === risk
                                      ? risk === 'HIGH'
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                        : 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                      : 'bg-transparent text-[#7D7DBE] border border-[#00F2FF]/10 hover:border-[#00F2FF]/30 hover:text-white'
                                    }`}
                                >
                                  {risk}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="pt-3 mt-2 border-t border-[#00F2FF]/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${train.penalty_risk_level === 'HIGH' ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                              }`} />
                            <span className="text-[8px] text-[#7D7DBE] uppercase tracking-wider">
                              {train.penalty_risk_level === 'HIGH' ? 'Penalty Risk Detected' : 'SLA Compliant'}
                            </span>
                          </div>
                          {train.advertiser_name && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-2.5 h-2.5 text-green-400" />
                              <span className="text-[8px] text-[#7D7DBE]">Active Campaign</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Quick Stats Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-4 justify-center pt-4"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Shield className="w-3 h-3 text-[#00F2FF]" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Total Fleet: {trains.length} Units
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Megaphone className="w-3 h-3 text-[#00F2FF]" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            Ad Coverage: {adRate}%
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-[9px] text-[#7D7DBE] uppercase tracking-wider">
            High Risk Units: {highRisk}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default BrandingDashboard;