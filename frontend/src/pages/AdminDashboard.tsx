import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Plus, X, ChevronDown, Shield, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../config/axios';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';

interface User {
  id: number;
  name: string;
  username: string;
  role: string;
  is_active: boolean;
}

const ROLES = ['ADMIN', 'PLANNER', 'MAINTENANCE', 'FITNESS', 'BRANDING'];

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'MAINTENANCE' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  <div className="fixed top-4 right-4 z-50 bg-[#00F2FF] text-[#080B1F] px-4 py-2 rounded-xl font-bold shadow-lg">
  🔵 TAILWIND IS WORKING! Electric Cyan = #00F2FF
</div>
  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/users/', form);
      setShowModal(false);
      fetchUsers();
      setForm({ name: '', username: '', password: '', role: 'MAINTENANCE' });
    } catch {
      setError('Failed to create user. Username may already exist.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u: User) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      fetchUsers();
    } catch { }
  };

  const active = users.filter(u => u.is_active).length;
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Animated Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Background Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#00F2FF]/5 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00F2FF]/20 to-[#00D2C8]/20 border border-[#00F2FF]/30">
                <Shield className="w-6 h-6 text-[#00F2FF]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7D7DBE] bg-white/5 px-3 py-1 rounded-full">
                AI Control Terminal
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
              System Administration
            </h1>
            <p className="text-[#B8BCE6] text-sm mt-2 font-medium max-w-2xl">
              Platform-wide user management & security control • Real-time telemetry monitoring
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="relative group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] text-[#080B1F] font-black text-sm uppercase tracking-[0.1em] shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:shadow-[0_0_40px_rgba(0,242,255,0.5)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Plus className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Add Operator</span>
            <Zap className="w-4 h-4 relative z-10 group-hover:animate-pulse" />
          </motion.button>
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
          label="Registry Size"
          value={users.length}
          icon={Users}
          color="cyan"
          sub="Total registered entities"
          trend={{ value: 12, isUp: true }}
        />
        <StatCard
          label="Active Nodes"
          value={active}
          icon={UserCheck}
          color="green"
          sub="Currently operational"
        />
        <StatCard
          label="Offline Units"
          value={users.length - active}
          icon={UserX}
          color="red"
          sub="Access restricted"
        />
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search operators by name, username, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1C3D]/60 border border-[#00F2FF]/15 rounded-xl py-3 pl-11 pr-4 text-sm text-[#E6E9FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF]/20 focus:border-[#00F2FF] transition-all placeholder:text-[#7D7DBE]/50"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
          <Activity className="w-3 h-3 text-[#00F2FF] animate-pulse" />
          <span className="text-[10px] font-bold text-[#7D7DBE] uppercase tracking-wider">
            Live Registry • {users.length} Operators
          </span>
        </div>
      </motion.div>

      {/* Table Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative group"
      >
        {/* Glow Effect on Hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl" />

        <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D]/80 to-[#3A3F7A]/40 border border-[#00F2FF]/10 overflow-hidden backdrop-blur-sm">
          <div className="px-8 py-5 border-b border-[#00F2FF]/10 bg-gradient-to-r from-[#00F2FF]/5 to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#00F2FF]" />
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                Operator Registry
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-1.5 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/20">
                <span className="text-[10px] font-black tracking-widest text-[#00F2FF]">
                  {filteredUsers.length} ENTITIES ACTIVE
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] text-[#7D7DBE] uppercase tracking-[0.2em] font-black border-b border-[#00F2FF]/10 bg-[#080B1F]/30">
                  <th className="px-8 py-4 text-left">Operator Identity</th>
                  <th className="px-8 py-4 text-left">Handler / Credentials</th>
                  <th className="px-8 py-4 text-left">Access Tier</th>
                  <th className="px-8 py-4 text-left">Telemetry Status</th>
                  <th className="px-8 py-4 text-right">System Directives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00F2FF]/5">
                <AnimatePresence>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-12 h-12 text-[#7D7DBE]/30" />
                          <p className="text-[#7D7DBE] text-sm font-medium">No operators found</p>
                          <button
                            onClick={() => setShowModal(true)}
                            className="text-[#00F2FF] text-xs font-bold uppercase tracking-wider hover:text-[#00D2C8] transition-colors"
                          >
                            Add your first operator →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ backgroundColor: 'rgba(0, 242, 255, 0.02)' }}
                        className="group transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F2FF]/20 to-[#00D2C8]/20 border border-[#00F2FF]/30 flex items-center justify-center">
                              <span className="text-sm font-black text-[#00F2FF]">
                                {u.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-white font-bold tracking-tight">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[#B8BCE6] font-mono text-xs tracking-tighter">
                            {u.username}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <StatusBadge status={u.role} size="sm" />
                        </td>
                        <td className="px-8 py-5">
                          <StatusBadge status={u.is_active ? 'READY' : 'HOLD'} size="sm" />
                        </td>
                        <td className="px-8 py-5 text-right">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleToggle(u)}
                            className={`text-[9px] px-5 py-2.5 rounded-lg font-black uppercase tracking-[0.2em] transition-all duration-300 border ${u.is_active
                                ? 'text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50'
                                : 'text-green-400 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50'
                              }`}
                          >
                            {u.is_active ? 'Terminate Session' : 'Initialize Access'}
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Create User Modal - Premium Version */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#080B1F]/80 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md"
              >
                {/* Modal Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] rounded-2xl blur-xl opacity-30" />

                <div className="relative rounded-2xl bg-gradient-to-br from-[#1A1C3D] to-[#3A3F7A] border border-[#00F2FF]/30 overflow-hidden shadow-2xl">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-5 h-5 text-[#00F2FF]" />
                          <span className="text-[9px] font-black text-[#7D7DBE] uppercase tracking-[0.3em]">Registry Protocol 4.1</span>
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Provision Operator</h3>
                        <p className="text-xs text-[#B8BCE6] mt-1">Create new access credentials</p>
                      </div>
                      <button
                        onClick={() => setShowModal(false)}
                        className="p-2 rounded-xl hover:bg-white/10 text-[#7D7DBE] hover:text-white transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 text-[10px] font-black text-red-400 bg-red-500/10 px-5 py-3 rounded-xl border border-red-500/20 uppercase tracking-widest flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        {error}
                      </motion.div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-5">
                      {(['name', 'username', 'password'] as const).map((field, idx) => (
                        <motion.div
                          key={field}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="space-y-2"
                        >
                          <label className="block text-[9px] font-black text-[#7D7DBE] uppercase tracking-[0.3em] ml-1">
                            {field === 'name' ? 'Full Name' : field === 'username' ? 'Username' : 'Password'}
                          </label>
                          <input
                            required
                            type={field === 'password' ? 'password' : 'text'}
                            value={form[field]}
                            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                            className="w-full px-5 py-3.5 rounded-xl text-sm font-medium bg-[#080B1F]/80 border border-[#00F2FF]/20 text-white outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all placeholder:text-[#7D7DBE]/30"
                            placeholder={`Enter ${field}...`}
                          />
                        </motion.div>
                      ))}

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                      >
                        <label className="block text-[9px] font-black text-[#7D7DBE] uppercase tracking-[0.3em] ml-1">
                          Privilege Tier
                        </label>
                        <div className="relative">
                          <select
                            value={form.role}
                            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full px-5 py-3.5 rounded-xl text-sm font-medium bg-[#080B1F]/80 border border-[#00F2FF]/20 text-white outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all cursor-pointer appearance-none"
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r} className="bg-[#1A1C3D]">
                                {r}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE] pointer-events-none" />
                        </div>
                      </motion.div>

                      <motion.button
                        type="submit"
                        disabled={saving}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="relative group w-full py-4 mt-4 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] text-[#080B1F] font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10">
                          {saving ? 'PROVISIONING...' : 'INITIATE REGISTRY'}
                        </span>
                      </motion.button>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;